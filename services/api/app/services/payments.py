"""
Stripe integration. With STRIPE_SECRET_KEY set, checkout creates a real
PaymentIntent and payment is confirmed by signed webhooks. Without it, the
API runs an explicit test mode that simulates card outcomes.
"""

import contextlib

from ..config import get_settings
from ..models import Order

# Stripe's documented test card numbers, reused for the offline simulator.
TEST_DECLINES = {
    "4000000000000002": "Your card was declined.",
    "4000000000009995": "Your card has insufficient funds.",
    "4000000000000069": "Your card has expired.",
}


def enabled() -> bool:
    return bool(get_settings().stripe_secret_key)


def _stripe():
    import stripe

    stripe.api_key = get_settings().stripe_secret_key
    return stripe


def create_intent(order: Order, customer_email: str) -> tuple[str, str]:  # pragma: no cover - network
    stripe = _stripe()
    intent = stripe.PaymentIntent.create(
        amount=order.total_cents,
        currency="usd",
        receipt_email=customer_email,
        automatic_payment_methods={"enabled": True},
        metadata={"order_number": order.number},
        idempotency_key=f"order-{order.number}",
    )
    return intent.id, intent.client_secret


def cancel_intent(intent_id: str) -> None:  # pragma: no cover - network
    with contextlib.suppress(Exception):
        _stripe().PaymentIntent.cancel(intent_id)


def construct_event(payload: bytes, signature: str):
    stripe = _stripe()
    return stripe.Webhook.construct_event(payload, signature, get_settings().stripe_webhook_secret)


def simulate(card_number: str) -> str | None:
    """Returns an error message for a declined test card, or None on success."""
    digits = "".join(c for c in card_number if c.isdigit())
    if digits in TEST_DECLINES:
        return TEST_DECLINES[digits]
    if not _luhn(digits):
        return "Your card number is invalid."
    return None


def _luhn(digits: str) -> bool:
    if not 12 <= len(digits) <= 19:
        return False
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0
