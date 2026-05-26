import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border/70 bg-secondary text-secondary-foreground",
        outline: "border-border/80 bg-background text-foreground",
        success:
          "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-400/15 dark:text-emerald-200",
        warning:
          "border-amber-500/40 bg-amber-400/15 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-200",
        danger:
          "border-destructive/35 bg-destructive/10 text-destructive dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-200",
        pending:
          "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:border-sky-400/35 dark:bg-sky-400/15 dark:text-sky-200",
        muted:
          "border-muted-foreground/25 bg-muted/65 text-muted-foreground dark:border-white/20 dark:bg-white/10 dark:text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
