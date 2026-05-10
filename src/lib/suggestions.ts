import { db, type Habit } from "../db/database";
import { computeHabitStats, dayCompletion, entryScore } from "./stats";
import { lastNDates } from "./date";

export interface Suggestion {
  id: string;
  severity: "info" | "warn" | "good";
  title: string;
  body: string;
  habitId?: number;
}

/**
 * Pure rule-based suggestion engine — runs offline.
 * Mirrors what a coach would notice from the data.
 */
export async function generateSuggestions(): Promise<Suggestion[]> {
  const out: Suggestion[] = [];
  const habits = (await db.habits.toArray()).filter((h) => h.active);
  if (habits.length === 0) return out;

  // Per-habit rules
  for (const h of habits) {
    const s = await computeHabitStats(h);

    if (s.last30Completion < 0.2) {
      out.push({
        id: `dormant-${h.id}`,
        severity: "warn",
        habitId: h.id,
        title: `"${h.name}" looks dormant`,
        body:
          `Logged < 20% in the last 30 days. ` +
          `Either lower the target (try ${suggestSmallerTarget(h)}), ` +
          `or stack it onto an existing habit you already do daily.`,
      });
      continue;
    }
    if (s.last7Completion === 0 && s.last30Completion > 0.4) {
      out.push({
        id: `slip-${h.id}`,
        severity: "warn",
        habitId: h.id,
        title: `Slipped this week: "${h.name}"`,
        body: `You were doing well (${Math.round(s.last30Completion * 100)}% over 30d) but missed all 7 of the last days. Try a 5-minute "minimum dose" today to restart the streak.`,
      });
    }
    if (s.currentStreak >= 7) {
      out.push({
        id: `streak-${h.id}`,
        severity: "good",
        habitId: h.id,
        title: `${s.currentStreak}-day streak — "${h.name}"`,
        body: `Identity is forming. Consider raising the target by 10–20% next week.`,
      });
    }
    if (s.last7Completion >= 0.85 && s.currentStreak < 7) {
      out.push({
        id: `consistent-${h.id}`,
        severity: "good",
        habitId: h.id,
        title: `Highly consistent — "${h.name}"`,
        body: `Last 7 days at ${Math.round(s.last7Completion * 100)}%. One missed day is breaking the streak count — protect today.`,
      });
    }
  }

  // Day-of-week analysis: find the worst weekday on average
  const worst = await worstWeekday();
  if (worst) {
    out.push({
      id: "worst-day",
      severity: "info",
      title: `Weak day detected: ${worst.day}`,
      body: `Across the last 4 weeks, ${worst.day}s averaged ${Math.round(worst.score * 100)}%. Pre-plan your top 2 habits the night before.`,
    });
  }

  // Overall trend
  const trend = await weekTrend();
  if (trend.delta <= -10) {
    out.push({
      id: "down-trend",
      severity: "warn",
      title: "Overall growth dipping",
      body: `This week is ${Math.abs(trend.delta)} pts lower than last week. Pick ONE keystone habit and only focus on that for the next 3 days.`,
    });
  } else if (trend.delta >= 10) {
    out.push({
      id: "up-trend",
      severity: "good",
      title: "Trend up — momentum building",
      body: `+${trend.delta} pts vs last week. Don't add new habits yet; consolidate first.`,
    });
  }

  // Mood correlation (simple): find habit most positively correlated with mood
  const corr = await topMoodCorrelation();
  if (corr) {
    out.push({
      id: "mood-corr",
      severity: "info",
      title: `Mood ↑ when you do "${corr.habitName}"`,
      body: `On days you did this habit, average mood was ${corr.withMood.toFixed(1)}/5 vs ${corr.withoutMood.toFixed(1)}/5 without. Treat it as a keystone habit.`,
    });
  }

  // Suggest a NEW habit from missing categories
  const missing = await missingCategorySuggestion();
  if (missing) out.push(missing);

  // Sort: warn → good → info, max 8
  const order = { warn: 0, good: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 8);
}

function suggestSmallerTarget(h: Habit): string {
  if (!h.target) return "1 minute / 1 rep";
  const v = Math.max(1, Math.floor(h.target / 3));
  return `${v}${h.unit ? " " + h.unit : ""}`;
}

async function worstWeekday(): Promise<{ day: string; score: number } | null> {
  const dates = lastNDates(28);
  const buckets: number[][] = [[], [], [], [], [], [], []];
  for (const d of dates) {
    const dc = await dayCompletion(d);
    const wd = new Date(d + "T00:00:00").getDay(); // 0..6 Sun..Sat
    buckets[wd].push(dc.score);
  }
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let worst = { day: "", score: 1 };
  for (let i = 0; i < 7; i++) {
    if (buckets[i].length < 2) continue;
    const avg = buckets[i].reduce((a, b) => a + b, 0) / buckets[i].length;
    if (avg < worst.score) worst = { day: names[i], score: avg };
  }
  return worst.day ? worst : null;
}

async function weekTrend(): Promise<{ delta: number }> {
  const cur = lastNDates(7);
  const prev = lastNDates(7, new Date(Date.now() - 7 * 86400000));
  let a = 0,
    b = 0;
  for (const d of cur) a += (await dayCompletion(d)).score;
  for (const d of prev) b += (await dayCompletion(d)).score;
  return { delta: Math.round(((a - b) / 7) * 100) };
}

async function topMoodCorrelation(): Promise<
  | { habitName: string; withMood: number; withoutMood: number }
  | null
> {
  const dates = lastNDates(60);
  const dayLogs = await db.dayLogs.where("date").anyOf(dates).toArray();
  const moodMap = new Map(dayLogs.map((d) => [d.date, d.mood]));
  if (moodMap.size < 7) return null;

  const habits = (await db.habits.toArray()).filter((h) => h.active);
  let best: { habitName: string; withMood: number; withoutMood: number; gap: number } | null =
    null;

  for (const h of habits) {
    const entries = await db.entries.where("habitId").equals(h.id!).toArray();
    const eByDate = new Map(entries.map((e) => [e.date, e]));
    const moodsWith: number[] = [];
    const moodsWithout: number[] = [];
    for (const [d, m] of moodMap.entries()) {
      if (m == null) continue;
      const e = eByDate.get(d);
      const score = e ? entryScore(h, e.value) : 0;
      if (score >= 0.6) moodsWith.push(m);
      else moodsWithout.push(m);
    }
    if (moodsWith.length < 3 || moodsWithout.length < 3) continue;
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const w = avg(moodsWith);
    const wo = avg(moodsWithout);
    const gap = w - wo;
    if (!best || gap > best.gap) {
      best = { habitName: h.name, withMood: w, withoutMood: wo, gap };
    }
  }
  if (!best || best.gap < 0.4) return null;
  return { habitName: best.habitName, withMood: best.withMood, withoutMood: best.withoutMood };
}

async function missingCategorySuggestion(): Promise<Suggestion | null> {
  const cats = await db.categories.toArray();
  const habits = await db.habits.toArray();
  const counts = new Map<string, number>();
  for (const c of cats) counts.set(c.key, 0);
  for (const h of habits) if (h.active) counts.set(h.categoryKey, (counts.get(h.categoryKey) ?? 0) + 1);

  const empty = cats.find((c) => (counts.get(c.key) ?? 0) === 0);
  if (!empty) return null;
  const sample = SAMPLE_BY_CAT[empty.key] ?? "any small daily action";
  return {
    id: `add-${empty.key}`,
    severity: "info",
    title: `No habits in "${empty.name}"`,
    body: `For balanced growth, add at least one. Suggestion: ${sample}.`,
  };
}

const SAMPLE_BY_CAT: Record<string, string> = {
  study:   '"Solve 1 LeetCode easy" or "Watch 1 lecture (20 min)"',
  fitness: '"15 push-ups" or "Walk 5,000 steps"',
  health:  '"Sleep before midnight"',
  mind:    '"Journal 3 lines" or "Meditate 5 min"',
  career:  '"1 LinkedIn comment" or "1 GitHub commit"',
};
