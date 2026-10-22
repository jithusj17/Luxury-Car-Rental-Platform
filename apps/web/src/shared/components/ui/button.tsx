import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-lg font-heading font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        dark: "bg-heading text-white hover:bg-heading/90",
        outline: "border border-heading bg-white text-heading hover:bg-heading hover:text-white",
        "outline-primary":
          "border border-primary bg-white text-primary hover:bg-primary hover:text-primary-foreground",
        secondary: "border border-border bg-white text-heading hover:border-heading",
        ghost: "text-heading hover:bg-surface",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-[38px] px-3 text-sm [&_svg]:size-4",
        md: "h-[50px] px-5 text-base",
        icon: "size-12 rounded-full",
        "icon-sm": "size-9 rounded-full [&_svg]:size-4",
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    // Applied after size classes, so a link-styled button never gets button padding/height.
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md", shape: "default" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, shape, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, shape }), className)} {...props} />;
}

export { buttonVariants };
