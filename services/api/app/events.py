"""
In-process pub/sub for server-sent events, with an optional Redis fan-out so
multiple API replicas share inventory and order updates.
"""

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any

from .config import get_settings

log = logging.getLogger("thread.events")


class Broker:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None
        self._redis = None
        self._redis_task: asyncio.Task | None = None

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        url = get_settings().redis_url
        if not url:
            return
        try:
            import redis.asyncio as redis

            self._redis = redis.from_url(url)
            await self._redis.ping()
            self._redis_task = asyncio.create_task(self._listen())
            log.info("event broker using redis fan-out")
        except Exception:  # pragma: no cover - depends on infra
            log.exception("redis unavailable; falling back to in-process events")
            self._redis = None

    async def stop(self) -> None:
        if self._redis_task:
            self._redis_task.cancel()
        if self._redis:
            await self._redis.aclose()

    async def _listen(self) -> None:  # pragma: no cover - depends on infra
        pubsub = self._redis.pubsub()
        await pubsub.psubscribe("thread:*")
        async for msg in pubsub.listen():
            if msg.get("type") != "pmessage":
                continue
            channel = msg["channel"].decode().removeprefix("thread:")
            self._deliver(channel, json.loads(msg["data"]))

    def subscribe(self, channel: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers[channel].add(q)
        return q

    def unsubscribe(self, channel: str, q: asyncio.Queue) -> None:
        self._subscribers[channel].discard(q)
        if not self._subscribers[channel]:
            self._subscribers.pop(channel, None)

    def _deliver(self, channel: str, payload: dict[str, Any]) -> None:
        for q in list(self._subscribers.get(channel, ())):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                log.warning("dropping event for slow subscriber on %s", channel)

    def publish(self, channel: str, payload: dict[str, Any]) -> None:
        """Thread-safe: callable from sync request handlers after a commit."""
        if self._redis and self._loop:
            asyncio.run_coroutine_threadsafe(self._redis.publish(f"thread:{channel}", json.dumps(payload)), self._loop)
            return
        if self._loop and self._loop.is_running():
            self._loop.call_soon_threadsafe(self._deliver, channel, payload)
        else:
            self._deliver(channel, payload)


broker = Broker()
