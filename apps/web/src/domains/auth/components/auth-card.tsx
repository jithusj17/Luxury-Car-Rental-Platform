import { X } from "lucide-react";
import Link from "next/link";

/**
 * Login / Register frame (35_Login, 36_Register): a 920px rounded card over a dimmed backdrop,
 * image panel on the left (placeholder until imagery is added), form on the right.
 */
export function AuthCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-[920px] overflow-hidden rounded-3xl bg-white shadow-lg">
        <div aria-hidden className="hidden w-[380px] shrink-0 bg-placeholder md:block" />
        <div className="relative flex flex-1 flex-col gap-8 p-6 sm:p-10">
          <Link href="/" aria-label="Close" className="absolute top-5 right-5 rounded-full p-1 text-heading hover:bg-surface">
            <X className="size-5" />
          </Link>
          <h1 className="text-h1 font-semibold">{title}</h1>
          {children}
          {footer && <div className="text-center text-sm text-heading">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
