import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { db, type Habit, type Entry } from "../db/database";
import { entryScore } from "../lib/stats";
import { lastNDates } from "../lib/date";
import { Sparkline } from "./ui/Sparkline";
import { StreakBadge } from "./ui/StreakBadge";
import { IconTile } from "./ui/IconTile";
import { cn } from "../lib/cn";

interface Props {
  habit: Habit;
  date: string;
  categoryColor: string;
  onChanged?: () => void;
}

function lighten(hex: string, amount = 0.4): string {
  const h = hex.replace("#", "");
  const num = parseInt(
    h.length === 3
      ? h.split("").map((c) => c + c).join("")
      : h,
    16
  );
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.round(r + (255 - r) * amount);
  g = Math.round(g + (255 - g) * amount);
  b = Math.round(b + (255 - b) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

export function HabitCard({ habit, date, categoryColor, onChanged }: Props) {
  const [entry, setEntry] = useState<Entry | undefined>();
  const [series, setSeries] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const all = await db.entries.where("habitId").equals(habit.id!).toArray();
      const map = new Map(all.map((e) => [e.date, e]));
      if (!active) return;
      setEntry(map.get(date));
      const dates = lastNDates(14);
      setSeries(dates.map((d) => {
        const e = map.get(d);
        return e ? entryScore(habit, e.value) * 100 : 0;
      }));
      // streak
      let s = 0;
      for (const d of lastNDates(365).reverse()) {
        const e = map.get(d);
        const sc = e ? entryScore(habit, e.value) : 0;
        if (sc >= 0.6) s++;
        else break;
      }
      setStreak(s);
    })();
    return () => {
      active = false;
    };
  }, [habit.id, date, habit]);

  async function save(value: number) {
    const now = Date.now();
    const wasDone = entry ? entryScore(habit, entry.value) >= 0.6 : false;
    if (entry?.id) {
      await db.entries.update(entry.id, { value, updatedAt: now });
      setEntry({ ...entry, value, updatedAt: now });
    } else {
      const id = await db.entries.add({
        habitId: habit.id!,
        date,
        value,
        updatedAt: now,
      });
      setEntry({ id, habitId: habit.id!, date, value, updatedAt: now });
    }
    const isDone = entryScore(habit, value) >= 0.6;
    if (isDone && !wasDone) {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
    // Update sparkline last cell
    setSeries((prev) => {
      const next = [...prev];
      next[next.length - 1] = entryScore(habit, value) * 100;
      return next;
    });
    // Recompute streak
    if (isDone && !wasDone) setStreak((s) => s + 1);
    else if (!isDone && wasDone) setStreak(0);
    onChanged?.();
  }

  const score = entry ? entryScore(habit, entry.value) : 0;
  const done = score >= 0.6;
  const grad: [string, string] = [lighten(categoryColor, 0.25), categoryColor];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "group relative card lift !p-4 flex flex-col gap-3 overflow-hidden",
        done && "ring-1 ring-success-500/30"
      )}
    >
      {/* Soft glow layer when completed */}
      <AnimatePresence>
        {pulse && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{ background: `radial-gradient(circle at 30% 30%, ${categoryColor}33, transparent 60%)` }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 relative">
        <IconTile gradient={grad} size="md" rounded="xl">
          <span className="text-base font-bold">{habit.emoji ?? "•"}</span>
        </IconTile>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-ink truncate">{habit.name}</p>
            {streak > 0 && <StreakBadge days={streak} size="sm" />}
          </div>
          <p className="text-xs text-ink-muted mt-0.5 tabular-nums">
            {habit.type === "boolean"
              ? done
                ? "Done for today"
                : "Tap to mark complete"
              : `${entry?.value ?? 0}${habit.unit ? " " + habit.unit : ""} of ${
                  habit.target ?? "—"
                }${habit.unit ? " " + habit.unit : ""}`}
          </p>
        </div>

        <div className="shrink-0">
          <Controls habit={habit} entry={entry} done={done} onSave={save} grad={grad} />
        </div>
      </div>

      {/* Sparkline + progress (hidden for boolean if all-zero to reduce clutter) */}
      <div className="flex items-center justify-between gap-3 pl-14">
        {habit.type !== "boolean" && habit.target ? (
          <div className="flex-1 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${grad[0]}, ${grad[1]})` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, score * 100)}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        ) : (
          <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-muted">
            14-day momentum
          </span>
        )}
        <Sparkline values={series} width={84} height={24} />
      </div>
    </motion.div>
  );
}

function Controls({
  habit,
  entry,
  done,
  onSave,
  grad,
}: {
  habit: Habit;
  entry?: Entry;
  done: boolean;
  onSave: (v: number) => void;
  grad: [string, string];
}) {
  if (habit.type === "boolean") {
    return (
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => onSave(done ? 0 : 1)}
        aria-pressed={done}
        aria-label={done ? "Mark not done" : "Mark done"}
        className={cn(
          "relative w-11 h-11 rounded-2xl grid place-items-center transition-all",
          done
            ? "text-white shadow-glow"
            : "text-ink-muted bg-surface-muted hover:text-ink ring-1 ring-surface-border"
        )}
        style={done ? { background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.span
              key="d"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Check size={20} strokeWidth={3} />
            </motion.span>
          ) : (
            <motion.span
              key="o"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="w-5 h-5 rounded-full border-2 border-current"
            />
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
  if (habit.type === "scale") {
    const current = entry?.value ?? 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = current >= n;
          return (
            <button
              key={n}
              onClick={() => onSave(n)}
              className={cn(
                "w-6 h-6 rounded-md text-[10px] font-semibold transition-colors",
                on
                  ? "text-white"
                  : "bg-surface-muted text-ink-muted ring-1 ring-surface-border"
              )}
              style={on ? { background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` } : undefined}
              aria-label={`Set ${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    );
  }
  // counter / duration — duration always +1 (min/hr per tap); counter scales with target
  const step =
    habit.type === "duration" ? 1 : Math.max(1, Math.round((habit.target ?? 10) / 10));
  const v = entry?.value ?? 0;
  return (
    <div className="flex items-center gap-1.5">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onSave(Math.max(0, v - step))}
        className="w-9 h-9 rounded-xl bg-surface-muted text-ink-soft grid place-items-center ring-1 ring-surface-border"
        aria-label={`Subtract ${step}`}
      >
        <Minus size={16} />
      </motion.button>
      <span className="font-mono text-sm font-semibold tabular-nums w-10 text-center">{v}</span>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => onSave(v + step)}
        className="w-9 h-9 rounded-xl text-white grid place-items-center shadow-soft"
        style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
        aria-label={`Add ${step}`}
      >
        <Plus size={16} strokeWidth={2.6} />
      </motion.button>
    </div>
  );
}
