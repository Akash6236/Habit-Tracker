import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/cn";

type Variant = "default" | "glass" | "elevated";

interface Props extends HTMLMotionProps<"section"> {
  variant?: Variant;
  padded?: boolean;
}

export function Card({
  variant = "default",
  padded = true,
  className,
  children,
  ...rest
}: Props) {
  const base =
    variant === "glass"
      ? "card-glass"
      : variant === "elevated"
      ? "card-elevated"
      : "card";
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(base, padded && "p-5 sm:p-6", className)}
      {...rest}
    >
      {children}
    </motion.section>
  );
}

export function CardHeader({
  title,
  subtitle,
  trailing,
  icon,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <div className="min-w-0">
          <h3 className="font-display font-bold text-base sm:text-lg tracking-tightish text-ink truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </header>
  );
}
