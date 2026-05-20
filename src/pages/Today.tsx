import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Droplets, Minus, Moon, Notebook, Plus, Quote, Sparkles, TrendingUp } from "lucide-react";
import { db, type DayLog, type Habit, type Category } from "../db/database";
import { useLive } from "../lib/useLive";
import { Card, CardHeader } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { RingProgress } from "../components/ui/RingProgress";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { HabitCard } from "../components/HabitCard";
import { MoodPicker } from "../components/MoodPicker";
import { dayCompletion, computeHabitStats, growthScore } from "../lib/stats";
import { prettyDate, today } from "../lib/date";

const QUOTES = [
  "Small steps, every day.",
  "Done is better than perfect.",
  "Consistency compounds quietly.",
  "Show up. The rest follows.",
  "Master the boring basics.",
  "1% better, daily.",
  "Energy first, intensity later.",
  "Discipline is the highest form of self-respect.",
];

interface Props {
  onGoTo?: (tab: "habits" | "growth" | "insights" | "settings") => void;
}

export function TodayPage({ onGoTo }: Props) {
  const date = today();
  const habits = useLive<Habit[]>(
    async () => {
      const all = await db.habits.toArray();
      return all.filter((h) => h.active && !h.archivedAt);
    },
    [],
    []
  );
  const categories = useLive<Category[]>(() => db.categories.toArray(), [], []);

  const [day, setDay] = useState<DayLog | undefined>();
  const [completion, setCompletion] = useState(0);
  const [growth, setGrowth] = useState(0);
  const [topStreak, setTopStreak] = useState(0);
  const [streakHabit, setStreakHabit] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const quote = useMemo(() => {
    const idx = new Date().getDate() % QUOTES.length;
    return QUOTES[idx];
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const log = await db.dayLogs.where("date").equals(date).first();
      if (!active) return;
      setDay(log);
      const dc = await dayCompletion(date);
      if (!active) return;
      setCompletion(Math.round(dc.score * 100));
      const g = await growthScore();
      if (!active) return;
      setGrowth(g);
      const all = await db.habits.toArray();
      const stats = await Promise.all(all.filter((h) => h.active).map(computeHabitStats));
      stats.sort((a, b) => b.currentStreak - a.currentStreak);
      if (!active) return;
      if (stats[0]) {
        setTopStreak(stats[0].currentStreak);
        setStreakHabit(stats[0].habit.name);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [date]);

  async function recompute() {
    const dc = await dayCompletion(date);
    setCompletion(Math.round(dc.score * 100));
  }

  async function patchDay(patch: Partial<DayLog>) {
    const now = Date.now();
    if (day?.id) {
      await db.dayLogs.update(day.id, { ...patch, updatedAt: now });
      setDay({ ...day, ...patch, updatedAt: now });
    } else {
      const id = await db.dayLogs.add({ date, ...patch, updatedAt: now });
      setDay({ id, date, ...patch, updatedAt: now });
    }
  }

  const catColor = new Map(categories.map((c) => [c.key, c.color]));
  const grouped = new Map<string, Habit[]>();
  for (const h of habits) {
    if (!grouped.has(h.categoryKey)) grouped.set(h.categoryKey, []);
    grouped.get(h.categoryKey)!.push(h);
  }
  const completedCount = useMemo(() => {
    // approximate from per-card data isn't possible at this level; we can infer from completion%
    return Math.round((completion / 100) * habits.length);
  }, [completion, habits.length]);

  return (
    <div className="space-y-5">
      {/* ─── Hero ─── */}
      <Card variant="glass" padded={false} className="ring-gradient overflow-hidden">
        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Chip tone="brand" icon={<Sparkles size={12} />} className="mb-2">
                {prettyDate(date)}
              </Chip>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tighter2 text-ink leading-tight">
                {completion >= 90
                  ? "Beautiful day."
                  : completion >= 50
                  ? "Strong rhythm."
                  : completion > 0
                  ? "You've started."
                  : "A clean slate."}
              </h2>
              <p className="text-sm text-ink-muted mt-1.5 flex items-center gap-1.5">
                <Quote size={12} className="text-brand-500" /> {quote}
              </p>
            </div>
            <div className="shrink-0">
              {loading ? (
                <Skeleton className="w-[140px] h-[140px] rounded-full" />
              ) : (
                <RingProgress
                  value={completion}
                  size={140}
                  stroke={11}
                  label="Today"
                />
              )}
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            <QuickStat
              icon={<TrendingUp size={14} />}
              label="Growth"
              value={growth}
              suffix="/100"
              onClick={() => onGoTo?.("growth")}
            />
            <QuickStat
              icon={<Sparkles size={14} />}
              label="Habits"
              value={completedCount}
              suffix={`/${habits.length}`}
            />
            <QuickStat
              icon={<span className="text-flame-500">🔥</span>}
              label={streakHabit ? "Best streak" : "No streak"}
              value={topStreak}
              suffix={topStreak === 1 ? " day" : " days"}
            />
          </div>
        </div>
      </Card>

      {/* ─── State of the day ─── */}
      <Card>
        <CardHeader
          title="State of the day"
          subtitle="A quick check-in. One screen, one tap."
        />
        <div className="space-y-4 mt-4">
          <div>
            <Label>Mood</Label>
            <MoodPicker value={day?.mood} onChange={(v) => patchDay({ mood: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SleepHoursField
              value={day?.sleepHours}
              onChange={(v) => patchDay({ sleepHours: v })}
            />
            <NumberField
              icon={<Droplets size={14} />}
              label="Water"
              unit="ml"
              value={day?.waterMl}
              step={100}
              placeholder="2500"
              onChange={(v) => patchDay({ waterMl: v })}
            />
          </div>
          <div>
            <Label icon={<Notebook size={14} />}>Reflection</Label>
            <textarea
              className="field field-textarea"
              value={day?.reflection ?? ""}
              onChange={(e) => patchDay({ reflection: e.target.value })}
              placeholder="One observation, one win, one tomorrow-fix."
            />
          </div>
        </div>
      </Card>

      {/* ─── Habits by category ─── */}
      {habits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles size={22} />}
            title="No habits yet"
            body="Add a couple of small daily actions to start building momentum."
            action={
              <button
                onClick={() => onGoTo?.("habits")}
                className="btn btn-primary text-sm px-4 py-2.5 rounded-xl"
              >
                Add your first habit
              </button>
            }
          />
        </Card>
      ) : (
        categories.map((c) => {
          const list = grouped.get(c.key) ?? [];
          if (list.length === 0) return null;
          return (
            <motion.section
              key={c.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  <h3 className="font-display font-bold text-base text-ink truncate">
                    {c.name}
                  </h3>
                  <Chip>{list.length}</Chip>
                </div>
              </div>
              <div className="space-y-2.5">
                {list.map((h) => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    date={date}
                    categoryColor={catColor.get(h.categoryKey) ?? "#6366f1"}
                    onChanged={recompute}
                  />
                ))}
              </div>
            </motion.section>
          );
        })
      )}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  suffix,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  onClick?: () => void;
}) {
  const Cmp: React.ElementType = onClick ? "button" : "div";
  return (
    <Cmp
      onClick={onClick}
      className="card-glass !rounded-2xl p-3 text-left transition-transform active:scale-[0.98] lift"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-display font-extrabold text-lg sm:text-xl text-ink tracking-tighter2 mt-1.5 tabular-nums">
        <AnimatedNumber value={value} />
        {suffix && <span className="text-ink-muted text-xs font-semibold ml-0.5">{suffix}</span>}
      </div>
    </Cmp>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="text-[11px] uppercase font-semibold tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
      {icon}
      {children}
    </label>
  );
}

const SLEEP_MIN = 0;
const SLEEP_MAX = 24;

/** Sleep hours: plain text + ±1 buttons only (no native number spinners). */
function SleepHoursField({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  const base = typeof value === "number" ? value : SLEEP_MIN;
  const atMin = base <= SLEEP_MIN;
  const atMax = base >= SLEEP_MAX;

  function setHours(next: number) {
    const clamped = Math.min(SLEEP_MAX, Math.max(SLEEP_MIN, Math.round(next)));
    onChange(clamped);
  }

  function bump(direction: 1 | -1) {
    setHours(base + direction);
  }

  return (
    <div>
      <Label icon={<Moon size={14} />}>Sleep</Label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            bump(-1);
          }}
          disabled={atMin}
          className="w-10 h-10 shrink-0 rounded-xl bg-surface-muted text-ink-soft grid place-items-center ring-1 ring-surface-border disabled:opacity-40"
          aria-label="Decrease sleep by 1 hour"
        >
          <Minus size={16} />
        </button>
        <div className="relative flex-1 min-w-0">
          <input
            className="field pr-12 tabular-nums"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={typeof value === "number" ? String(value) : ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              if (digits === "") {
                onChange(undefined);
                return;
              }
              setHours(parseInt(digits, 10));
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                bump(1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                bump(-1);
              }
            }}
            onWheel={(e) => e.preventDefault()}
            placeholder="7"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted pointer-events-none">
            hrs
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            bump(1);
          }}
          disabled={atMax}
          className="w-10 h-10 shrink-0 rounded-xl bg-brand-500 text-white grid place-items-center shadow-soft disabled:opacity-40"
          aria-label="Increase sleep by 1 hour"
        >
          <Plus size={16} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}

function NumberField({
  icon,
  label,
  unit,
  value,
  step = 1,
  min = 0,
  max,
  placeholder,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  unit: string;
  value?: number;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  onChange: (v: number | undefined) => void;
}) {
  const base = typeof value === "number" ? value : min;
  const atMin = base <= min;
  const atMax = max !== undefined && base >= max;

  function bump(delta: number) {
    const next = Math.min(max ?? Infinity, Math.max(min, base + delta));
    onChange(next);
  }

  return (
    <div>
      <Label icon={icon}>{label}</Label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            bump(-step);
          }}
          disabled={atMin}
          className="w-10 h-10 shrink-0 rounded-xl bg-surface-muted text-ink-soft grid place-items-center ring-1 ring-surface-border disabled:opacity-40"
          aria-label={`Decrease ${label}`}
        >
          <Minus size={16} />
        </button>
        <div className="relative flex-1 min-w-0">
          <input
            className="field pr-12 tabular-nums"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={typeof value === "number" ? String(value) : ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              if (digits === "") {
                onChange(undefined);
                return;
              }
              const n = parseInt(digits, 10);
              onChange(Math.min(max ?? Infinity, Math.max(min, n)));
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                bump(step);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                bump(-step);
              }
            }}
            onWheel={(e) => e.preventDefault()}
            placeholder={placeholder}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted pointer-events-none">
            {unit}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            bump(step);
          }}
          disabled={atMax}
          className="w-10 h-10 shrink-0 rounded-xl bg-brand-500 text-white grid place-items-center shadow-soft disabled:opacity-40"
          aria-label={`Increase ${label}`}
        >
          <Plus size={16} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
