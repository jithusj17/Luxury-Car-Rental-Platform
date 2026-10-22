import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Logo } from "@/shell/logo";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Logo />
      <p className="font-heading text-display font-semibold text-primary">404</p>
      <h1 className="text-h2 font-medium">Page not found</h1>
      <p className="max-w-md text-base">The page you’re looking for doesn’t exist or has moved.</p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
