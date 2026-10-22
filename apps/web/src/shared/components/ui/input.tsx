import { cn } from "@/shared/lib/utils";

export const fieldControlClasses =
  "w-full rounded-md border border-border bg-white px-4 text-sm text-heading placeholder:text-icon transition-colors hover:border-border-strong focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface aria-invalid:border-danger";

type InputProps = React.ComponentProps<"input"> & {
  /** Optional leading icon, e.g. <Search /> */
  icon?: React.ReactNode;
};

export function Input({ className, icon, ...props }: InputProps) {
  if (!icon) {
    return <input className={cn(fieldControlClasses, "h-[46px]", className)} {...props} />;
  }
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-icon [&_svg]:size-4">
        {icon}
      </span>
      <input className={cn(fieldControlClasses, "h-[46px] pl-10", className)} {...props} />
    </div>
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldControlClasses, "min-h-32 py-3", className)} {...props} />;
}
