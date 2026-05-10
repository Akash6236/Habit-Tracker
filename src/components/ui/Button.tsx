import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "soft" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg",
  md: "text-sm px-3.5 py-2.5 rounded-xl",
  lg: "text-sm px-4 py-3 rounded-2xl",
  icon: "btn-icon",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "soft", size = "md", className, children, iconLeft, iconRight, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn("btn", `btn-${variant}`, sizes[size], className)}
      {...rest}
    >
      {iconLeft && <span className="-ml-0.5 inline-flex">{iconLeft}</span>}
      {children}
      {iconRight && <span className="-mr-0.5 inline-flex">{iconRight}</span>}
    </button>
  );
});
