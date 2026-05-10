import { db, uuid, type Category, type Habit } from "./database";

const DEFAULT_CATEGORIES: Category[] = [
  { key: "study",   name: "Study & Code", color: "#1e6bb8", weight: 3, builtin: true },
  { key: "fitness", name: "Fitness",      color: "#c2410c", weight: 3, builtin: true },
  { key: "health",  name: "Health",       color: "#0f766e", weight: 2, builtin: true },
  { key: "mind",    name: "Mind",         color: "#7c3aed", weight: 2, builtin: true },
  { key: "career",  name: "Career",       color: "#b91c1c", weight: 2, builtin: true },
];

const DEFAULT_HABITS: Omit<Habit, "id">[] = [
  // Study & Code
  { categoryKey: "study",   name: "DSA practice",       type: "duration", target: 45, unit: "min", emoji: "λ", active: true, createdAt: Date.now() },
  { categoryKey: "study",   name: "College revision",   type: "duration", target: 60, unit: "min", emoji: "✎", active: true, createdAt: Date.now() },
  { categoryKey: "study",   name: "Project commit",     type: "boolean",                emoji: "<>", active: true, createdAt: Date.now() },
  // Fitness
  { categoryKey: "fitness", name: "Workout",            type: "duration", target: 30, unit: "min", emoji: "▲", active: true, createdAt: Date.now() },
  { categoryKey: "fitness", name: "Steps (10k)",        type: "counter",  target: 10000, unit: "steps", emoji: "→", active: true, createdAt: Date.now() },
  // Health
  { categoryKey: "health",  name: "Water (2.5L)",       type: "counter",  target: 2500, unit: "ml", emoji: "○", active: true, createdAt: Date.now() },
  { categoryKey: "health",  name: "Sleep ≥ 7h",         type: "boolean",               emoji: "◐", active: true, createdAt: Date.now() },
  { categoryKey: "health",  name: "No junk food",       type: "boolean",               emoji: "⊘", active: true, createdAt: Date.now() },
  // Mind
  { categoryKey: "mind",    name: "Read (20 min)",      type: "duration", target: 20, unit: "min", emoji: "❒", active: true, createdAt: Date.now() },
  { categoryKey: "mind",    name: "Meditate",           type: "duration", target: 10, unit: "min", emoji: "◯", active: true, createdAt: Date.now() },
  // Career
  { categoryKey: "career",  name: "GitHub commit",      type: "boolean",               emoji: "✓", active: true, createdAt: Date.now() },
  { categoryKey: "career",  name: "LinkedIn / network", type: "boolean",               emoji: "↗", active: true, createdAt: Date.now() },
];

export async function ensureSeed(): Promise<void> {
  const ts = Date.now();
  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, cloud_id: uuid(), updated_at: ts }))
    );
  }
  const habitCount = await db.habits.count();
  if (habitCount === 0) {
    await db.habits.bulkAdd(
      DEFAULT_HABITS.map((h) => ({ ...h, cloud_id: uuid(), updated_at: ts }))
    );
  }
}
