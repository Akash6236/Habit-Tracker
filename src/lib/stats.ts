import { db, type Habit, type Entry, type Category } from "../db/database";
import { lastNDates, today, ymd } from "./date";
import { subDays } from "date-fns";

/**
 * For a single entry value, normalise to a 0..1 "achievement" score
 * relative to the habit's target. Booleans are 0/1.
 */
export function entryScore(habit: Habit, value: number): number {
  if (habit.type === "boolean") return value > 0 ? 1 : 0;
  if (habit.type === "scale") {
    // scale 1..5 → 0..1
    return Math.max(0, Math.min(1, (value - 1) / 4));
  }
  const target = habit.target ?? 1;
  if (target <= 0) return value > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, value / target));
}

export interface HabitStats {
  habit: Habit;
  currentStreak: number;
  longestStreak: number;
  last7Completion: number; // 0..1
  last30Completion: number;
  totalCompletedDays: number;
}

export async function computeHabitStats(habit: Habit): Promise<HabitStats> {
  const entries = await db.entries.where("habitId").equals(habit.id!).toArray();
  const byDate = new Map(entries.map((e) => [e.date, e]));

  // streaks (count days with score >= 0.6 as "completed")
  const scoreFor = (date: string) => {
    const e = byDate.get(date);
    if (!e) return 0;
    return entryScore(habit, e.value);
  };

  let current = 0;
  for (let i = 0; i < 365; i++) {
    const d = ymd(subDays(new Date(), i));
    if (scoreFor(d) >= 0.6) current++;
    else break;
  }

  // longest streak from existing entries
  const sortedDates = Array.from(byDate.keys()).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sortedDates) {
    if (scoreFor(d) < 0.6) {
      run = 0;
      prev = d;
      continue;
    }
    if (prev) {
      const a = new Date(prev).getTime();
      const b = new Date(d).getTime();
      const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
      run = diff === 1 ? run + 1 : 1;
    } else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }
  longest = Math.max(longest, current);

  const last7 = lastNDates(7).reduce((a, d) => a + scoreFor(d), 0) / 7;
  const last30 = lastNDates(30).reduce((a, d) => a + scoreFor(d), 0) / 30;
  const totalCompleted = sortedDates.filter((d) => scoreFor(d) >= 0.6).length;

  return {
    habit,
    currentStreak: current,
    longestStreak: longest,
    last7Completion: last7,
    last30Completion: last30,
    totalCompletedDays: totalCompleted,
  };
}

export interface DayCompletion {
  date: string;
  score: number; // 0..1 weighted across active habits
  totalActive: number;
}

export async function dayCompletion(date: string): Promise<DayCompletion> {
  const all = await db.habits.toArray();
  const active = all.filter((h) => h.active && !h.archivedAt);
  if (active.length === 0) return { date, score: 0, totalActive: 0 };

  const cats = await db.categories.toArray();
  const catWeight = new Map(cats.map((c) => [c.key, c.weight ?? 1]));

  let weighted = 0;
  let weightSum = 0;
  for (const h of active) {
    const e = await db.entries.where({ habitId: h.id!, date }).first();
    const s = e ? entryScore(h, e.value) : 0;
    const w = catWeight.get(h.categoryKey) ?? 1;
    weighted += s * w;
    weightSum += w;
  }
  return { date, score: weightSum > 0 ? weighted / weightSum : 0, totalActive: active.length };
}

/** Growth score 0..100 — average of last 30 days, weighted by category. */
export async function growthScore(): Promise<number> {
  const days = lastNDates(30);
  let sum = 0;
  for (const d of days) {
    const c = await dayCompletion(d);
    sum += c.score;
  }
  return Math.round((sum / days.length) * 100);
}

export interface CategoryStat {
  category: Category;
  habits: number;
  last7: number; // 0..1
  last30: number;
}

export async function categoryStats(): Promise<CategoryStat[]> {
  const cats = await db.categories.toArray();
  const habits = await db.habits.toArray();
  const out: CategoryStat[] = [];
  for (const c of cats) {
    const hs = habits.filter((h) => h.categoryKey === c.key && h.active);
    if (hs.length === 0) {
      out.push({ category: c, habits: 0, last7: 0, last30: 0 });
      continue;
    }
    let l7 = 0,
      l30 = 0;
    for (const h of hs) {
      const s = await computeHabitStats(h);
      l7 += s.last7Completion;
      l30 += s.last30Completion;
    }
    out.push({
      category: c,
      habits: hs.length,
      last7: l7 / hs.length,
      last30: l30 / hs.length,
    });
  }
  return out;
}

export async function weekVsLast(): Promise<{ thisWeek: number; lastWeek: number }> {
  const thisDays = lastNDates(7);
  const lastDays = lastNDates(7, subDays(new Date(), 7));
  let a = 0,
    b = 0;
  for (const d of thisDays) a += (await dayCompletion(d)).score;
  for (const d of lastDays) b += (await dayCompletion(d)).score;
  return { thisWeek: (a / 7) * 100, lastWeek: (b / 7) * 100 };
}

export async function recentSeries(days: number) {
  const dates = lastNDates(days);
  const out: { date: string; score: number }[] = [];
  for (const d of dates) {
    const c = await dayCompletion(d);
    out.push({ date: d, score: Math.round(c.score * 100) });
  }
  return out;
}

export interface Milestone {
  id: string;
  label: string;
  achieved: boolean;
  progress: number; // 0..1
  target: number;
  current: number;
  hint?: string;
}

export async function milestones(): Promise<Milestone[]> {
  const habits = await db.habits.toArray();
  const allStats = await Promise.all(habits.map(computeHabitStats));
  const longest = allStats.reduce((m, s) => Math.max(m, s.longestStreak), 0);
  const totalEntries = (await db.entries.count()) as number;
  const todayDC = await dayCompletion(today());

  const ms: Milestone[] = [];
  for (const target of [7, 30, 100]) {
    ms.push({
      id: `streak-${target}`,
      label: `${target}-day streak (any habit)`,
      achieved: longest >= target,
      progress: Math.min(1, longest / target),
      current: longest,
      target,
      hint: longest >= target ? "Filed in the archive." : `Best streak so far: ${longest}d`,
    });
  }
  ms.push({
    id: "entries-100",
    label: "100 logged entries",
    achieved: totalEntries >= 100,
    progress: Math.min(1, totalEntries / 100),
    current: totalEntries,
    target: 100,
  });
  ms.push({
    id: "perfect-day",
    label: "Perfect day (100%)",
    achieved: todayDC.score >= 0.99,
    progress: todayDC.score,
    current: Math.round(todayDC.score * 100),
    target: 100,
  });
  return ms;
}

/** All entries between two dates inclusive, by habit. */
export async function entriesBetween(start: string, end: string): Promise<Entry[]> {
  return db.entries.filter((e) => e.date >= start && e.date <= end).toArray();
}
