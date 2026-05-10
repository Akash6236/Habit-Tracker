import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";

interface Props {
  days: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { wrap: "px-2 py-1 text-xs gap-1", icon: 12 },
  md: { wrap: "px-2.5 py-1.5 text-sm gap-1.5", icon: 14 },
  lg: { wrap: "px-3 py-2 text-base gap-2", icon: 18 },
};

export function StreakBadge({ days, size = "md", className }: Props) {
  if (days <= 0) return null;
  const { wrap, icon } = sizes[size];
  // Color escalates with streak length
  const tier =
    days >= 30
      ? "from-rose-500 to-flame-500"
      : days >= 7
      ? "from-flame-500 to-amber-400"
      : "from-flame-400 to-amber-300";

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 24 }}
      className={cn(
        "inline-flex items-center font-semibold text-white rounded-full shadow-sm",
        "bg-gradient-to-br",
        tier,
        wrap,
        className
      )}
    >
      <motion.span
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex"
      >
        <Flame size={icon} strokeWidth={2.4} />
      </motion.span>
      <span className="font-mono tracking-tight">{days}</span>
    </motion.span>
  );
}
