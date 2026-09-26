"use client";

import { ErrorState } from "@/components/ui/States";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-x">
      <ErrorState title="Something went wrong." body="Please try again." onRetry={reset} />
    </div>
  );
}
