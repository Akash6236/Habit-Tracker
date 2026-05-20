import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";

interface Props {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
  className?: string;
  /** Gradient for the + button; defaults to brand indigo */
  plusGradient?: [string, string];
  ariaLabel?: string;
}

export function StepperInput({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 10_000,
  unit,
  placeholder,
  className,
  plusGradient = ["rgb(165 180 252)", "rgb(99 102 241)"],
  ariaLabel = "Amount",
}: Props) {
  const [text, setText] = useState("");
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setText(value > 0 ? String(value) : "");
    }
  }, [value]);

  function clamp(n: number) {
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  function parsedText(): number {
    const digits = text.replace(/\D/g, "");
    if (digits === "") return value;
    const n = parseInt(digits, 10);
    return Number.isNaN(n) ? value : n;
  }

  function commitFromText(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      onChange(min);
      setText("");
      return;
    }
    const n = clamp(parseInt(digits, 10));
    onChange(n);
    setText(n > 0 ? String(n) : "");
  }

  function handleInput(raw: string) {
    const digits = raw.replace(/\D/g, "");
    setText(digits);
    if (digits === "") return;
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n)) onChange(clamp(n));
  }

  function bump(delta: number) {
    const base = focused.current ? parsedText() : value;
    const next = clamp(base + delta);
    onChange(next);
    setText(next > 0 ? String(next) : "");
  }

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className={cn("flex items-center gap-1.5 w-full", className)}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          bump(-step);
        }}
        disabled={atMin}
        className="w-9 h-9 shrink-0 rounded-xl bg-surface-muted text-ink-soft grid place-items-center ring-1 ring-surface-border disabled:opacity-40"
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus size={16} />
      </motion.button>
      <div className="relative flex-1 min-w-0">
        <input
          className={cn(
            "field h-9 !py-1.5 text-center text-sm tabular-nums w-full select-text",
            unit && "pr-9"
          )}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder ?? "0"}
          value={text}
          onFocus={() => {
            focused.current = true;
            setText(value > 0 ? String(value) : "");
          }}
          onChange={(e) => handleInput(e.target.value)}
          onBlur={() => {
            focused.current = false;
            commitFromText(text);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitFromText(text);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              bump(step);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              bump(-step);
            }
          }}
          onWheel={(e) => e.preventDefault()}
          aria-label={ariaLabel}
        />
        {unit && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-ink-muted pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.preventDefault();
          bump(step);
        }}
        disabled={atMax}
        className="w-9 h-9 shrink-0 rounded-xl text-white grid place-items-center shadow-soft disabled:opacity-40"
        style={{ background: `linear-gradient(135deg, ${plusGradient[0]}, ${plusGradient[1]})` }}
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus size={16} strokeWidth={2.6} />
      </motion.button>
    </div>
  );
}
