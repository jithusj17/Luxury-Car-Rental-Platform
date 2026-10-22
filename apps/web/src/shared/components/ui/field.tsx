import { Label } from "radix-ui";
import { cn } from "@/shared/lib/utils";

type FieldProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
};

/** Label + control + hint/error, matching the "Car details" form rows in Add listing. */
export function Field({ label, htmlFor, required, hint, error, className, children }: FieldProps) {
  const messageId = `${htmlFor}-message`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label.Root htmlFor={htmlFor} className="font-heading text-sm font-medium text-heading">
        {label}
        {required && (
          <span aria-hidden className="text-primary">
            {" "}
            *
          </span>
        )}
      </Label.Root>
      {children}
      {(error ?? hint) && (
        <p id={messageId} className={cn("text-xs", error ? "text-danger-strong" : "text-body")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
