"use client";

import { Button } from "@/shared/components/ui/button";
import { ErrorState } from "@/shared/components/ui/feedback";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState description="This part of your dashboard failed to load." action={<Button onClick={reset}>Try again</Button>} />;
}
