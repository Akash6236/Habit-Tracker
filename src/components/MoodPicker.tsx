import { motion } from "framer-motion";
import { cn } from "../lib/cn";

interface Props {
  value?: number;
  onChange: (v: number) => void;
}

const MOODS: { face: string; label: string; gradient: string }[] = [
  { face: "😞", label: "Low",  gradient: "mood-1" },
  { face: "😐", label: "Meh",  gradient: "mood-2" },
  { face: "🙂", label: "Okay", gradient: "mood-3" },
  { face: "😊", label: "Good", gradient: "mood-4" },
  { face: "🤩", label: "Peak", gradient: "mood-5" },
];

export function MoodPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {MOODS.map((m, i) => {
        const n = i + 1;
        const on = value === n;
        return (
          <motion.button
            key={n}
            whileTap={{ scale: 0.92 }}
            onClick={() => onChange(n)}
            className={cn(
              "relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 text-ink-soft",
              "ring-1 ring-surface-border bg-surface-muted/40 transition-all overflow-hidden",
              on && "text-white shadow-glow ring-0"
            )}
            aria-pressed={on}
            aria-label={m.label}
          >
            {on && (
              <motion.span
                layoutId="moodbg"
                className={cn("absolute inset-0", m.gradient)}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
              />
            )}
            <span className="relative text-2xl leading-none">{m.face}</span>
            <span className="relative text-[10px] font-semibold tracking-wide">{m.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
