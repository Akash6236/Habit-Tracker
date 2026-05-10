import { db, uuid, type Category, type Habit, type Entry, type DayLog, type Settings } from "../db/database";
import { supabase, isCloudEnabled } from "./supabase";

/**
 * ─────────────────────────────────────────────────────────────────────────
 * Sync engine
 * ─────────────────────────────────────────────────────────────────────────
 * Strategy: Dexie hooks fire after every local create/update/delete and
 * mirror the row to Supabase. Conflict resolution is last-write-wins by the
 * `updated_at` (or `updatedAt`) timestamp.
 *
 * On login we run `pullAll()` once to merge cloud → local.
 *
 * `pushAll()` is exposed for the manual "Push everything to cloud" button
 * (useful right after first sign-up to upload the seed/data).
 * ─────────────────────────────────────────────────────────────────────────
 */

type AnyRow = Record<string, unknown> & { cloud_id?: string };

let installed = false;
let currentUserId: string | null = null;
let lastError: string | null = null;
const listeners = new Set<() => void>();

export interface SyncStatus {
  enabled: boolean;
  userId: string | null;
  lastError: string | null;
}

export function getSyncStatus(): SyncStatus {
  return { enabled: isCloudEnabled, userId: currentUserId, lastError };
}
export function onSyncStatusChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  for (const l of listeners) l();
}

function setError(e: unknown) {
  lastError = e instanceof Error ? e.message : String(e);
  emit();
}
function clearError() {
  if (lastError !== null) {
    lastError = null;
    emit();
  }
}

/** Local table name → cloud table name mapping. */
const TABLE_MAP = {
  categories: "categories",
  habits: "habits",
  entries: "entries",
  dayLogs: "day_logs",
  settings: "settings",
} as const;

type LocalTable = keyof typeof TABLE_MAP;

/** Convert a local row to its cloud representation. */
function toCloud(table: LocalTable, row: AnyRow, userId: string): Record<string, unknown> {
  const base = {
    id: row.cloud_id, // cloud PK = client-generated uuid
    user_id: userId,
  };
  switch (table) {
    case "categories": {
      const c = row as unknown as Category;
      return {
        ...base,
        key: c.key,
        name: c.name,
        color: c.color,
        weight: c.weight,
        builtin: !!c.builtin,
        updated_at: new Date(c.updated_at ?? Date.now()).toISOString(),
      };
    }
    case "habits": {
      const h = row as unknown as Habit;
      return {
        ...base,
        category_key: h.categoryKey,
        name: h.name,
        type: h.type,
        target: h.target ?? null,
        unit: h.unit ?? null,
        emoji: h.emoji ?? null,
        active: !!h.active,
        created_at: h.createdAt,
        archived_at: h.archivedAt ?? null,
        updated_at: new Date(h.updated_at ?? Date.now()).toISOString(),
      };
    }
    case "entries": {
      const e = row as unknown as Entry;
      return {
        ...base,
        habit_id: e.habit_cloud_id, // cloud habit uuid
        date: e.date,
        value: e.value,
        note: e.note ?? null,
        updated_at: new Date(e.updatedAt ?? Date.now()).toISOString(),
      };
    }
    case "dayLogs": {
      const d = row as unknown as DayLog;
      return {
        ...base,
        date: d.date,
        mood: d.mood ?? null,
        sleep_hours: d.sleepHours ?? null,
        water_ml: d.waterMl ?? null,
        reflection: d.reflection ?? null,
        updated_at: new Date(d.updatedAt ?? Date.now()).toISOString(),
      };
    }
    case "settings": {
      const s = row as unknown as Settings;
      return {
        ...base,
        key: s.key,
        value: s.value,
        updated_at: new Date(s.updated_at ?? Date.now()).toISOString(),
      };
    }
  }
}

/** Convert a cloud row to local insert/update shape (without local id). */
function fromCloud(table: LocalTable, row: Record<string, unknown>): AnyRow {
  const cloud_id = row.id as string;
  const updatedAtMs = new Date(row.updated_at as string).getTime();
  switch (table) {
    case "categories":
      return {
        cloud_id,
        key: row.key as string,
        name: row.name as string,
        color: row.color as string,
        weight: row.weight as number,
        builtin: !!row.builtin,
        updated_at: updatedAtMs,
      };
    case "habits":
      return {
        cloud_id,
        categoryKey: row.category_key as string,
        name: row.name as string,
        type: row.type as Habit["type"],
        target: (row.target as number) ?? undefined,
        unit: (row.unit as string) ?? undefined,
        emoji: (row.emoji as string) ?? undefined,
        active: !!row.active,
        createdAt: row.created_at as number,
        archivedAt: (row.archived_at as number) ?? undefined,
        updated_at: updatedAtMs,
      };
    case "entries":
      return {
        cloud_id,
        habit_cloud_id: row.habit_id as string,
        habitId: 0, // resolved later from habit_cloud_id
        date: row.date as string,
        value: row.value as number,
        note: (row.note as string) ?? undefined,
        updatedAt: updatedAtMs,
      };
    case "dayLogs":
      return {
        cloud_id,
        date: row.date as string,
        mood: (row.mood as number) ?? undefined,
        sleepHours: (row.sleep_hours as number) ?? undefined,
        waterMl: (row.water_ml as number) ?? undefined,
        reflection: (row.reflection as string) ?? undefined,
        updatedAt: updatedAtMs,
      };
    case "settings":
      return {
        cloud_id,
        key: row.key as string,
        value: row.value as string,
        updated_at: updatedAtMs,
      };
  }
}

/**
 * Upsert a single row to the cloud (fire-and-forget, errors swallowed into status).
 * Marked async so the caller can `await` if needed.
 */
async function pushRow(table: LocalTable, row: AnyRow) {
  if (!supabase || !currentUserId) return;
  const payload = toCloud(table, row, currentUserId);
  const { error } = await supabase.from(TABLE_MAP[table]).upsert(payload, { onConflict: "id" });
  if (error) setError(error);
  else clearError();
}

async function deleteRowCloud(table: LocalTable, cloud_id: string) {
  if (!supabase || !currentUserId) return;
  const { error } = await supabase
    .from(TABLE_MAP[table])
    .delete()
    .eq("id", cloud_id)
    .eq("user_id", currentUserId);
  if (error) setError(error);
  else clearError();
}

/**
 * Install Dexie hooks ONCE. Hooks are no-ops until `setSyncUser(userId)` has
 * been called.
 */
export function installSyncHooks() {
  if (installed) return;
  installed = true;

  for (const t of ["categories", "habits", "entries", "dayLogs", "settings"] as const) {
    const table = db[t];

    // Create — assign cloud_id if missing, then push after success
    table.hook("creating", function (_pk, obj) {
      const o = obj as unknown as AnyRow;
      if (!o.cloud_id) o.cloud_id = uuid();
      // updated_at field naming differs across tables
      if (t === "entries" || t === "dayLogs") {
        if (!(o as unknown as { updatedAt: number }).updatedAt) {
          (o as unknown as { updatedAt: number }).updatedAt = Date.now();
        }
      } else {
        if (!o.updated_at) o.updated_at = Date.now();
      }
      this.onsuccess = () => {
        if (currentUserId) void pushRow(t, o);
      };
    });

    // Update — push merged row after success
    table.hook("updating", function (mods, _pk, oldObj) {
      const merged = { ...(oldObj as unknown as AnyRow), ...(mods as unknown as AnyRow) };
      if (!merged.cloud_id) merged.cloud_id = uuid();
      this.onsuccess = () => {
        if (currentUserId) void pushRow(t, merged);
      };
    });

    // Delete — fetch cloud_id of the row before deletion
    table.hook("deleting", function (_pk, obj) {
      const cid = (obj as unknown as AnyRow).cloud_id;
      this.onsuccess = () => {
        if (currentUserId && cid) void deleteRowCloud(t, cid);
      };
    });
  }
}

/** Activate sync for a specific user. Call after login. */
export function setSyncUser(userId: string | null) {
  currentUserId = userId;
  emit();
}

/* ───────────────────────── Pull / Push helpers ───────────────────────── */

/**
 * Pull every cloud row into Dexie. Strategy:
 *   • For each table, fetch all user rows.
 *   • Match by cloud_id locally; if exists & local updated_at is newer, skip.
 *     Otherwise upsert (bypassing hooks).
 *   • Habits are pulled BEFORE entries so entries.habit_cloud_id can be
 *     resolved to a local habit id.
 */
export async function pullAll(userId: string): Promise<{ counts: Record<string, number> }> {
  if (!supabase) throw new Error("Cloud not configured");
  setSyncUser(userId);
  const counts: Record<string, number> = {};

  const order: LocalTable[] = ["categories", "habits", "dayLogs", "settings", "entries"];
  for (const t of order) {
    counts[t] = await pullTable(t, userId);
  }
  return { counts };
}

async function pullTable(table: LocalTable, userId: string): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from(TABLE_MAP[table])
    .select("*")
    .eq("user_id", userId);
  if (error) {
    setError(error);
    return 0;
  }
  if (!data) return 0;

  let n = 0;
  // Build habitId resolver if needed
  let habitCidToLocal = new Map<string, number>();
  if (table === "entries") {
    const habits = await db.habits.toArray();
    habitCidToLocal = new Map(habits.filter((h) => h.cloud_id).map((h) => [h.cloud_id!, h.id!]));
  }

  for (const row of data) {
    const local = fromCloud(table, row);
    const cid = local.cloud_id!;

    if (table === "entries") {
      const habitCid = (local as unknown as { habit_cloud_id?: string }).habit_cloud_id;
      const localHabitId = habitCid ? habitCidToLocal.get(habitCid) : undefined;
      if (!localHabitId) continue; // orphan entry — skip
      (local as unknown as { habitId: number }).habitId = localHabitId;
    }

    const t = db[table];
    const existing = await (t.where("cloud_id").equals(cid).first() as Promise<AnyRow | undefined>);
    const localUpdatedAt =
      table === "entries" || table === "dayLogs"
        ? ((existing as unknown as { updatedAt?: number })?.updatedAt ?? 0)
        : (existing?.updated_at as number) ?? 0;
    const remoteUpdatedAt =
      table === "entries" || table === "dayLogs"
        ? (local as unknown as { updatedAt: number }).updatedAt
        : (local.updated_at as number) ?? 0;

    if (existing && localUpdatedAt >= remoteUpdatedAt) continue;

    if (existing) {
      // Update bypassing hooks (we don't want to re-push to cloud).
      // But Dexie hooks fire on .update() too, so we filter in pushRow via lastError untouched.
      // To truly skip, we temporarily clear currentUserId.
      const saved = currentUserId;
      currentUserId = null;
      try {
        await (t as unknown as { update: (id: number, mods: AnyRow) => Promise<unknown> }).update(
          existing.id as unknown as number,
          local
        );
      } finally {
        currentUserId = saved;
      }
    } else {
      const saved = currentUserId;
      currentUserId = null;
      try {
        await (t as unknown as { add: (row: AnyRow) => Promise<unknown> }).add(local);
      } finally {
        currentUserId = saved;
      }
    }
    n++;
  }
  return n;
}

/**
 * Push EVERY local row to the cloud. Useful right after first sign-up to
 * upload the seed and any data you logged before having an account.
 */
export async function pushAll(userId: string): Promise<{ counts: Record<string, number> }> {
  if (!supabase) throw new Error("Cloud not configured");
  setSyncUser(userId);
  const counts: Record<string, number> = {};
  for (const t of ["categories", "habits", "dayLogs", "settings", "entries"] as const) {
    const rows = await (db[t] as unknown as { toArray: () => Promise<AnyRow[]> }).toArray();
    // Make sure habits/categories cloud_ids exist before entries reference them
    if (t === "entries") {
      const habits = await db.habits.toArray();
      const habitMap = new Map(habits.filter((h) => h.cloud_id).map((h) => [h.id, h.cloud_id!]));
      for (const row of rows as unknown as Entry[]) {
        if (!row.habit_cloud_id && row.habitId != null) {
          row.habit_cloud_id = habitMap.get(row.habitId);
        }
      }
    }
    let n = 0;
    for (const row of rows) {
      if (!row.cloud_id) {
        row.cloud_id = uuid();
        // persist back to local — use update-by-id without re-triggering push
        const saved = currentUserId;
        currentUserId = null;
        try {
          await (db[t] as unknown as { update: (id: number, mods: AnyRow) => Promise<unknown> }).update(
            (row.id as number) ?? 0,
            { cloud_id: row.cloud_id }
          );
        } finally {
          currentUserId = saved;
        }
      }
      await pushRow(t, row);
      n++;
    }
    counts[t] = n;
  }
  return { counts };
}

/** Wipe all local data — used after sign-out so the next user starts clean. */
export async function wipeLocalAfterSignOut() {
  setSyncUser(null);
  await db.transaction(
    "rw",
    [db.categories, db.habits, db.entries, db.dayLogs, db.settings],
    async () => {
      await Promise.all([
        db.categories.clear(),
        db.habits.clear(),
        db.entries.clear(),
        db.dayLogs.clear(),
        db.settings.clear(),
      ]);
    }
  );
}
