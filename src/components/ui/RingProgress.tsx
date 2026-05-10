import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";

interface Props {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  className?: string;
  showValue?: boolean;
  /** Use the brand gradient (default) or a custom gradient pair */
  gradient?: [string, string];
  /** Optional secondary value (e.g., previous week) drawn underneath */
  ghostValue?: number;
}

/**
 * Big animated ring with soft glow and gradient stroke.
 * Used as the daily progress hero.
 */
export function RingProgress({
  value,
  size = 188,
  stroke = 14,
  label,
  sublabel,
  className,
  showValue = true,
  gradient,
  ghostValue,
}: Props) {
  const id = useId();
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safe / 100) * c;

  const [display, setDisplay] = useState(0);
  const m = useMotionValue(0);
  const rounded = useTransform(m, (v) => Math.round(v));

  useEffect(() => {
    const ctrl = animate(m, safe, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      ctrl.stop();
      unsub();
    };
  }, [safe, m, rounded]);

  const ghost = ghostValue != null ? Math.max(0, Math.min(100, ghostValue)) : null;
  const ghostOffset = ghost != null ? c - (ghost / 100) * c : null;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={gradient?.[0] ?? "rgb(var(--brand-400))"} />
            <stop offset="100%" stopColor={gradient?.[1] ?? "rgb(var(--brand-700))"} />
          </linearGradient>
          <filter id={`glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--border))"
          strokeWidth={stroke}
          opacity={0.6}
        />
        {/* Ghost (e.g., last week) */}
        {ghost != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(var(--brand-300) / 0.45)"
            strokeWidth={stroke / 2.4}
            strokeDasharray={c}
            strokeDashoffset={ghostOffset!}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        {/* Active arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter={`url(#glow-${id})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showValue && (
          <div className="font-display tracking-tighter2 text-ink leading-none" style={{ fontSize: size * 0.28, fontWeight: 800 }}>
            {display}
            <span className="text-ink-muted text-[0.45em] font-semibold ml-0.5">%</span>
          </div>
        )}
        {label && (
          <div className="mt-1 text-[11px] font-semibold tracking-wide uppercase text-ink-muted">
            {label}
          </div>
        )}
        {sublabel && <div className="text-[11px] text-ink-muted mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}
