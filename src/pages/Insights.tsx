import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Flame,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardHeader } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { IconTile } from "../components/ui/IconTile";
import { Button } from "../components/ui/Button";
import { Heatmap } from "../components/Heatmap";
import { generateSuggestions, type Suggestion } from "../lib/suggestions";
import { generateAISuggestion } from "../lib/ai";
import { dayCompletion, recentSeries } from "../lib/stats";
import { db, getSetting } from "../db/database";
import { lastNDates } from "../lib/date";

export function InsightsPage() {
  const [tips, setTips] = useState<Suggestion[]>([]);
  const [heat, setHeat] = useState<{ date: string; score: number }[]>([]);
  const [moodVsScore, setMoodVsScore] = useState<{ mood: string; avgScore: number; idx: number }[]>([]);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [t, ser, mv, key] = await Promise.all([
        generateSuggestions(),
        recentSeries(91),
        moodCorrelation(),
        getSetting("ai.key"),
      ]);
      if (!active) return;
      setTips(t);
      setHeat(ser);
      setMoodVsScore(mv);
      setHasKey(!!key);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function runAI() {
    setAiLoading(true);
    setAiErr(null);
    setAiText(null);
    try {
      const txt = await generateAISuggestion();
      setAiText(txt);
    } catch (e: unknown) {
      setAiErr(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* AI Coach hero */}
      <Card variant="glass" className="ring-gradient relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-brand-400/40 to-violet-500/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <IconTile size="lg" rounded="2xl" gradient={["rgb(129,140,248)", "rgb(139,92,246)"]}>
            <Brain size={26} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <Chip tone="brand" icon={<Sparkles size={12} />} className="mb-2">
              {hasKey ? "AI coach ready" : "Optional"}
            </Chip>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tighter2 text-ink leading-tight">
              Your personal growth assistant
            </h2>
            <p className="text-sm text-ink-muted mt-1.5">
              An offline rule-based coach reads your patterns. Add an API key in Setup to unlock a richer AI summary.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button
                variant="primary"
                onClick={runAI}
                disabled={!hasKey || aiLoading}
                iconLeft={
                  aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />
                }
              >
                {aiLoading ? "Analysing…" : "Generate coaching"}
              </Button>
              {!hasKey && (
                <span className="text-[11px] text-ink-muted">
                  No API key — go to <strong className="text-ink">Setup</strong>.
                </span>
              )}
            </div>
            {aiErr && <p className="text-xs text-rose-500 mt-3">⚠ {aiErr}</p>}
            {aiText && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 card-glass !rounded-2xl p-4 text-sm whitespace-pre-wrap leading-relaxed text-ink-soft"
              >
                {aiText}
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* Heatmap */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["rgb(99,102,241)", "rgb(124,58,237)"]}>
              <Sparkles size={18} />
            </IconTile>
          }
          title="Consistency heatmap"
          subtitle="Last 13 weeks · darker = stronger day"
        />
        <div className="mt-4">
          <Heatmap cells={heat} />
        </div>
      </Card>

      {/* Mood vs performance */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#34d399", "#10b981"]}>
              <span className="text-lg">😊</span>
            </IconTile>
          }
          title="Mood × performance"
          subtitle="Last 60 days · how you feel vs how you do"
        />
        <div className="h-44 mt-4 -mx-2">
          {moodVsScore.length === 0 ? (
            <p className="text-sm text-ink-muted px-2 py-6">
              Log your mood for a few days to unlock this insight.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moodVsScore} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  {moodVsScore.map((m) => (
                    <linearGradient id={`mb-${m.idx}`} key={m.idx} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={moodColor(m.idx)} stopOpacity={1} />
                      <stop offset="100%" stopColor={moodColor(m.idx)} stopOpacity={0.4} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeOpacity={0.12} strokeDasharray="3 6" />
                <XAxis dataKey="mood" tick={{ fill: "rgb(var(--ink-muted))", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgb(var(--ink-muted))", fontSize: 10 }} tickLine={false} axisLine={false} ticks={[0, 50, 100]} width={28} />
                <Tooltip
                  cursor={{ fill: "rgb(var(--brand-500) / 0.08)" }}
                  contentStyle={{
                    background: "rgb(var(--surface))",
                    border: "1px solid rgb(var(--border))",
                    borderRadius: 12,
                    boxShadow: "0 8px 30px -10px rgba(0,0,0,0.2)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}%`, "avg score"]}
                />
                <Bar dataKey="avgScore" radius={[8, 8, 0, 0]}>
                  {moodVsScore.map((m) => (
                    <Cell key={m.idx} fill={`url(#mb-${m.idx})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#f97316", "#ef4444"]}>
              <Flame size={18} />
            </IconTile>
          }
          title="Smart suggestions"
          subtitle="Auto-generated from your last few weeks"
        />
        <div className="mt-4 space-y-2.5">
          {tips.length === 0 ? (
            <p className="text-sm text-ink-muted px-1">
              Not enough data yet. Log a few days and tips will appear here.
            </p>
          ) : (
            tips.map((t, i) => <TipCard key={t.id} tip={t} delay={i * 0.04} />)
          )}
        </div>
      </Card>
    </div>
  );
}

function TipCard({ tip, delay }: { tip: Suggestion; delay: number }) {
  const tone = tip.severity === "warn" ? "flame" : tip.severity === "good" ? "success" : "brand";
  const Icon =
    tip.severity === "warn" ? AlertTriangle : tip.severity === "good" ? CheckCircle2 : Info;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="card-glass !rounded-2xl p-3.5 flex gap-3"
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center text-white ${
          tip.severity === "warn"
            ? "bg-gradient-to-br from-flame-400 to-flame-600"
            : tip.severity === "good"
            ? "bg-gradient-to-br from-success-400 to-success-600"
            : "bg-gradient-to-br from-brand-400 to-brand-700"
        }`}
      >
        <Icon size={16} strokeWidth={2.4} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-ink text-sm leading-snug">{tip.title}</p>
          <Chip tone={tone}>
            {tip.severity === "warn" ? "Heads up" : tip.severity === "good" ? "Win" : "Note"}
          </Chip>
        </div>
        <p className="text-xs text-ink-soft leading-relaxed">{tip.body}</p>
      </div>
    </motion.div>
  );
}

function moodColor(idx: number) {
  const colors = ["#64748b", "#94a3b8", "#38bdf8", "#10b981", "#f97316"];
  return colors[idx - 1] ?? colors[2];
}

async function moodCorrelation() {
  const dates = lastNDates(60);
  const logs = await db.dayLogs.where("date").anyOf(dates).toArray();
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const buckets = new Map<number, number[]>();
  for (const d of dates) {
    const log = byDate.get(d);
    if (!log?.mood) continue;
    const dc = await dayCompletion(d);
    if (!buckets.has(log.mood)) buckets.set(log.mood, []);
    buckets.get(log.mood)!.push(Math.round(dc.score * 100));
  }
  const labels = ["", "Low", "Meh", "Okay", "Good", "Peak"];
  const out: { mood: string; avgScore: number; idx: number }[] = [];
  for (let m = 1; m <= 5; m++) {
    const arr = buckets.get(m);
    if (!arr || arr.length === 0) continue;
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    out.push({ mood: labels[m], avgScore: avg, idx: m });
  }
  return out;
}
