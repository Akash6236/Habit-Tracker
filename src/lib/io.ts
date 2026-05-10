import { db } from "../db/database";

export async function exportJSON(): Promise<string> {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: await db.categories.toArray(),
    habits: await db.habits.toArray(),
    entries: await db.entries.toArray(),
    dayLogs: await db.dayLogs.toArray(),
    settings: await db.settings.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

export async function exportCSV(): Promise<string> {
  const habits = await db.habits.toArray();
  const habitName = new Map(habits.map((h) => [h.id!, h.name]));
  const entries = await db.entries.toArray();
  const lines = ["date,habit,value,note"];
  for (const e of entries) {
    const n = (habitName.get(e.habitId) ?? "?").replace(/"/g, '""');
    const note = (e.note ?? "").replace(/"/g, '""').replace(/\n/g, " ");
    lines.push(`${e.date},"${n}",${e.value},"${note}"`);
  }
  return lines.join("\n");
}

export async function importJSON(text: string): Promise<void> {
  const data = JSON.parse(text);
  await db.transaction(
    "rw",
    [db.categories, db.habits, db.entries, db.dayLogs, db.settings],
    async () => {
      await db.categories.clear();
      await db.habits.clear();
      await db.entries.clear();
      await db.dayLogs.clear();
      await db.settings.clear();
      if (data.categories?.length) await db.categories.bulkAdd(stripIds(data.categories));
      if (data.habits?.length) await db.habits.bulkAdd(stripIds(data.habits));
      if (data.entries?.length) await db.entries.bulkAdd(stripIds(data.entries));
      if (data.dayLogs?.length) await db.dayLogs.bulkAdd(stripIds(data.dayLogs));
      if (data.settings?.length) await db.settings.bulkAdd(stripIds(data.settings));
    }
  );
}

function stripIds<T extends { id?: number }>(rows: T[]): T[] {
  return rows.map(({ id: _id, ...rest }) => rest as T);
}

export function downloadFile(filename: string, content: string, mime = "application/json"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
