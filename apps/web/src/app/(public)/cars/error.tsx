"use client";

import { Button } from "@/shared/components/ui/button";
import { ErrorState } from "@/shared/components/ui/feedback";

export default function CarsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-site py-16">
      <ErrorState
        title="We couldn't load cars right now"
        description="The catalog is temporarily unavailable. Please try again in a moment."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
