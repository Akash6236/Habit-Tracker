import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardHeader } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { IconTile } from "../components/ui/IconTile";
import { RingProgress } from "../components/ui/RingProgress";
import { Skeleton } from "../components/ui/Skeleton";
import { StreakBadge } from "../components/ui/StreakBadge";
import { AnimatedNumber } from "../components/ui/AnimatedNumber";
import { db } from "../db/database";
import {
  categoryStats,
  computeHabitStats,
  growthScore,
  milestones,
  recentSeries,
  weekVsLast,
  type CategoryStat,
  type HabitStats,
  type Milestone,
} from "../lib/stats";

export function GrowthPage() {
  const [score, setScore] = useState(0);
  const [cats, setCats] = useState<CategoryStat[]>([]);
  const [series, setSeries] = useState<{ date: string; score: number }[]>([]);
  const [trend, setTrend] = useState<{ thisWeek: number; lastWeek: number }>({
    thisWeek: 0,
    lastWeek: 0,
  });
  const [topStreaks, setTopStreaks] = useState<HabitStats[]>([]);
  const [ms, setMs] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [s, c, ser, tr, m] = await Promise.all([
        growthScore(),
        categoryStats(),
        recentSeries(30),
        weekVsLast(),
        milestones(),
      ]);
      const habits = await db.habits.toArray();
      const stats = await Promise.all(habits.filter((h) => h.active).map(computeHabitStats));
      stats.sort((a, b) => b.currentStreak - a.currentStreak);
      if (!active) return;
      setScore(s);
      setCats(c);
      setSeries(ser);
      setTrend(tr);
      setTopStreaks(stats.slice(0, 5));
      setMs(m);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const delta = Math.round(trend.thisWeek - trend.lastWeek);
  const chartData = series.map((d) => ({ date: d.date.slice(5), score: d.score }));

  return (
    <div className="space-y-5">
      {/* Hero — score + week comparison */}
      <Card variant="glass" className="ring-gradient">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <Chip tone="brand" icon={<TrendingUp size={12} />} className="mb-2">
              Growth Index
            </Chip>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tighter2 text-ink leading-tight">
              <AnimatedNumber value={score} />
              <span className="text-ink-muted text-base font-semibold ml-1">/100</span>
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              30-day weighted average across all categories.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Chip tone={delta >= 0 ? "success" : "flame"} icon={delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}>
                {Math.abs(delta)} pts {delta >= 0 ? "up" : "down"} vs last wk
              </Chip>
              <Chip>
                {Math.round(trend.thisWeek)} this · {Math.round(trend.lastWeek)} last
              </Chip>
            </div>
          </div>
          <div className="shrink-0 mx-auto sm:mx-0">
            {loading ? (
              <Skeleton className="w-[170px] h-[170px] rounded-full" />
            ) : (
              <RingProgress value={score} size={170} stroke={13} ghostValue={trend.lastWeek} label="Last 30d" />
            )}
          </div>
        </div>
      </Card>

      {/* Trajectory area chart */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["rgb(96,165,250)", "rgb(99,102,241)"]}>
              <TrendingUp size={18} />
            </IconTile>
          }
          title="Trajectory"
          subtitle="Daily score, last 30 days"
        />
        <div className="h-48 -mx-2 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="growth-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="rgb(var(--brand-500))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="rgb(var(--brand-500))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="growth-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"   stopColor="rgb(var(--brand-400))" />
                  <stop offset="100%" stopColor="rgb(var(--brand-700))" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeOpacity={0.12} strokeDasharray="3 6" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgb(var(--ink-muted))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "rgb(var(--ink-muted))", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 50, 100]}
                width={28}
              />
              <Tooltip content={<FancyTooltip />} cursor={{ stroke: "rgb(var(--brand-500))", strokeOpacity: 0.4, strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="url(#growth-stroke)"
                strokeWidth={2.5}
                fill="url(#growth-area)"
                activeDot={{ r: 4, fill: "rgb(var(--brand-500))", stroke: "white", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category breakdown */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#a78bfa", "#7c3aed"]}>
              <Sparkles size={18} />
            </IconTile>
          }
          title="Category breakdown"
          subtitle="Where consistency is strongest"
        />
        <div className="mt-4 space-y-2.5">
          {cats.map((c) => {
            const pct7 = Math.round(c.last7 * 100);
            const pct30 = Math.round(c.last30 * 100);
            return (
              <motion.div
                key={c.category.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="card-glass !rounded-2xl p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: c.category.color }}
                    />
                    <p className="font-semibold text-ink truncate">{c.category.name}</p>
                    <Chip>w{c.category.weight}</Chip>
                  </div>
                  <div className="text-xs text-ink-muted tabular-nums">
                    7d <strong className="text-ink">{pct7}%</strong> · 30d <strong className="text-ink">{pct30}%</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <Bar value={pct7} color={c.category.color} label="7-day" />
                  <Bar value={pct30} color={c.category.color} label="30-day" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Top streaks */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#fb923c", "#ef4444"]}>
              <span className="text-lg">🔥</span>
            </IconTile>
          }
          title="Active streaks"
          subtitle="Your most consistent habits"
        />
        <div className="mt-4 space-y-2">
          {topStreaks.length === 0 ? (
            <p className="text-sm text-ink-muted px-1">Log a few days to start a streak.</p>
          ) : (
            topStreaks.map((s) => (
              <div key={s.habit.id} className="card-glass !rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <IconTile size="sm" rounded="lg" gradient={["#a78bfa", "#6366f1"]}>
                    <span className="text-base">{s.habit.emoji ?? "•"}</span>
                  </IconTile>
                  <p className="font-semibold text-ink truncate">{s.habit.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StreakBadge days={s.currentStreak} size="sm" />
                  <span className="text-xs text-ink-muted">best {s.longestStreak}d</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#fbbf24", "#f97316"]}>
              <Award size={18} />
            </IconTile>
          }
          title="Milestones"
          subtitle="Unlock as you stay consistent"
        />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ms.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`card-glass !rounded-2xl p-3 relative overflow-hidden ${
                m.achieved ? "ring-1 ring-success-500/40" : ""
              }`}
            >
              {m.achieved && (
                <span className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br from-success-400/40 to-success-500/0 blur-xl" />
              )}
              <div className="flex items-start justify-between gap-2 relative">
                <div className="min-w-0">
                  <p className="font-semibold text-ink text-sm">{m.label}</p>
                  {m.hint && <p className="text-[11px] text-ink-muted mt-0.5">{m.hint}</p>}
                </div>
                {m.achieved ? (
                  <Chip tone="success" icon={<CheckCircle2 size={12} />}>Unlocked</Chip>
                ) : (
                  <Chip>{m.current}/{m.target}</Chip>
                )}
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(m.progress * 100)}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${
                    m.achieved ? "bg-gradient-to-r from-success-400 to-success-500" : "bg-gradient-to-r from-brand-400 to-brand-700"
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}aa, ${color})` }}
        />
      </div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-ink-muted mt-1 tabular-nums">
        {label} · {value}%
      </div>
    </div>
  );
}

function FancyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-glass !rounded-xl !p-2.5 text-xs shadow-lift">
      <p className="text-ink-muted mb-0.5">{label}</p>
      <p className="font-bold text-ink tabular-nums">{payload[0].value}%</p>
    </div>
  );
}
