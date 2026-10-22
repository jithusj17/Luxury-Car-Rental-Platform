import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  className?: string;
} & (
  | { /** Page links, so pagination state lives in the URL. */ hrefFor: (page: number) => string; onPageChange?: never }
  | { /** In-page pagination (client state). */ onPageChange: (page: number) => void; hrefFor?: never }
);

/** Returns page numbers with `null` for ellipses, e.g. [1, 2, 3, null, 9]. */
export function getPageItems(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const items: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) items.push(null);
    items.push(p);
  });
  return items;
}

const itemClasses =
  "flex size-[38px] items-center justify-center rounded-full border border-border font-heading text-sm text-heading transition-colors hover:border-heading";

export function Pagination({ page, pageCount, hrefFor, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;

  const control = (target: number, content: React.ReactNode, props: { label?: string; current?: boolean }) => {
    const classes = cn(itemClasses, props.current && "border-primary bg-primary text-primary-foreground hover:border-primary");
    const common = { "aria-label": props.label, "aria-current": props.current ? ("page" as const) : undefined, className: classes };
    return hrefFor ? (
      <Link href={hrefFor(target)} {...common}>
        {content}
      </Link>
    ) : (
      <button type="button" onClick={() => onPageChange!(target)} {...common}>
        {content}
      </button>
    );
  };
  const disabled = (content: React.ReactNode) => (
    <span aria-hidden className={cn(itemClasses, "opacity-40")}>
      {content}
    </span>
  );

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-2", className)}>
      {page <= 1 ? disabled(<ChevronLeft className="size-4" />) : control(page - 1, <ChevronLeft className="size-4" />, { label: "Previous page" })}
      {getPageItems(page, pageCount).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className={cn(itemClasses, "border-transparent")}>
            …
          </span>
        ) : (
          <span key={p}>{control(p, p, { current: p === page })}</span>
        ),
      )}
      {page >= pageCount ? disabled(<ChevronRight className="size-4" />) : control(page + 1, <ChevronRight className="size-4" />, { label: "Next page" })}
    </nav>
  );
}
