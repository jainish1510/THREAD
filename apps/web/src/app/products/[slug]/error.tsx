"use client";

import { ErrorState } from "@/components/ui/States";

export default function ProductError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="We couldn't load this product." onRetry={reset} />;
}
