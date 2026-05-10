import Dexie, { type Table } from "dexie";

export type HabitType = "boolean" | "counter" | "duration" | "scale";

/**
 * Schema notes
 * ─────────────
 * `cloud_id` is a stable, client-generated UUID present on every row. It is the
 * identity used in the cloud database (Supabase) and survives across devices.
 * Local numeric `id` keeps existing code/types simple.
 *
 * `updated_at` (epoch ms) drives last-write-wins conflict resolution.
 */

export interface Category {
  id?: number;
  cloud_id?: string;
  key: string;
  name: string;
  color: string;
  weight: number;
  builtin?: boolean;
  updated_at?: number;
}

export interface Habit {
  id?: number;
  cloud_id?: string;
  categoryKey: string;
  name: string;
  type: HabitType;
  target?: number;
  unit?: string;
  emoji?: string;
  active: boolean;
  createdAt: number;
  archivedAt?: number;
  updated_at?: number;
}

export interface Entry {
  id?: number;
  cloud_id?: string;
  habitId: number;
  /** Cloud uuid of the linked habit. Mirrored to allow remote→local FK lookup. */
  habit_cloud_id?: string;
  date: string;
  value: number;
  note?: string;
  updatedAt: number;
}

export interface DayLog {
  id?: number;
  cloud_id?: string;
  date: string;
  mood?: number;
  sleepHours?: number;
  waterMl?: number;
  reflection?: string;
  updatedAt: number;
}

export interface Settings {
  id?: number;
  cloud_id?: string;
  key: string;
  value: string;
  updated_at?: number;
}

export class HabitDB extends Dexie {
  categories!: Table<Category, number>;
  habits!: Table<Habit, number>;
  entries!: Table<Entry, number>;
  dayLogs!: Table<DayLog, number>;
  settings!: Table<Settings, number>;

  constructor() {
    super("blueprint-habits");

    // v1 schema (legacy)
    this.version(1).stores({
      categories: "++id, &key, name",
      habits: "++id, categoryKey, name",
      entries: "++id, habitId, date, [habitId+date]",
      dayLogs: "++id, &date",
      settings: "++id, &key",
    });

    // v2: add cloud_id (uuid) to every table for sync. Existing rows get one
    // assigned during the upgrade so they can be pushed to the cloud later.
    this.version(2)
      .stores({
        categories: "++id, &key, name, &cloud_id",
        habits: "++id, categoryKey, name, &cloud_id",
        entries: "++id, habitId, date, [habitId+date], &cloud_id, habit_cloud_id",
        dayLogs: "++id, &date, &cloud_id",
        settings: "++id, &key, &cloud_id",
      })
      .upgrade(async (tx) => {
        const ts = Date.now();
        for (const tbl of ["categories", "habits", "entries", "dayLogs", "settings"] as const) {
          await tx
            .table(tbl)
            .toCollection()
            .modify((row: Record<string, unknown>) => {
              if (!row.cloud_id) row.cloud_id = uuid();
              if (tbl === "habits" || tbl === "categories" || tbl === "settings") {
                if (!row.updated_at) row.updated_at = ts;
              } else if (!row.updatedAt) {
                row.updatedAt = ts;
              }
            });
        }
      });
  }
}

export const db = new HabitDB();

/** Cross-platform UUID generator (works in old browsers too). */
export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getSetting(key: string): Promise<string | undefined> {
  const r = await db.settings.where("key").equals(key).first();
  return r?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await db.settings.where("key").equals(key).first();
  if (existing?.id) {
    await db.settings.update(existing.id, { value, updated_at: Date.now() });
  } else {
    await db.settings.add({ key, value, cloud_id: uuid(), updated_at: Date.now() });
  }
}
