import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Props {
  /** Override gradient with a CSS background */
  bg?: string;
  /** Two hex / rgb colors */
  gradient?: [string, string];
  size?: "sm" | "md" | "lg";
  rounded?: "md" | "lg" | "xl" | "2xl";
  children: ReactNode;
  className?: string;
}

const sizes = { sm: "w-9 h-9 text-base", md: "w-11 h-11 text-lg", lg: "w-14 h-14 text-2xl" };
const radii = {
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-2.5xl",
  "2xl": "rounded-3xl",
};

export function IconTile({
  bg,
  gradient,
  size = "md",
  rounded = "lg",
  children,
  className,
}: Props) {
  const style: React.CSSProperties = bg
    ? { background: bg }
    : gradient
    ? { background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }
    : {};
  return (
    <div
      style={style}
      className={cn(
        sizes[size],
        radii[rounded],
        "grid place-items-center text-white shadow-soft shrink-0 select-none",
        !bg && !gradient && "bg-gradient-to-br from-brand-400 to-brand-700",
        className
      )}
    >
      {children}
    </div>
  );
}
