import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Tone = "default" | "brand" | "success" | "flame";

export function Chip({
  tone = "default",
  children,
  className,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  const cls =
    tone === "brand"
      ? "chip chip-brand"
      : tone === "success"
      ? "chip chip-success"
      : tone === "flame"
      ? "chip chip-flame"
      : "chip";
  return (
    <span className={cn(cls, className)}>
      {icon}
      {children}
    </span>
  );
}
