import { db } from "../db/database";
import { getSetting } from "../db/database";
import { generateSuggestions } from "./suggestions";
import { categoryStats, growthScore, weekVsLast } from "./stats";

/**
 * Optional AI suggestion. Reads provider + key from settings.
 * Returns plain markdown; Insights page renders it as plain text.
 *
 * Provider keys:
 *   ai.provider = "openai" | "gemini"
 *   ai.key      = api key
 *   ai.model    = optional model override
 */
export async function generateAISuggestion(): Promise<string> {
  const provider = (await getSetting("ai.provider")) ?? "openai";
  const key = await getSetting("ai.key");
  if (!key) throw new Error("No API key configured. Add one in Settings → AI.");

  const score = await growthScore();
  const cats = await categoryStats();
  const wk = await weekVsLast();
  const baseRules = await generateSuggestions();
  const habits = await db.habits.toArray();

  const context = {
    growthScore: score,
    weekVsLast: wk,
    categories: cats.map((c) => ({
      name: c.category.name,
      habits: c.habits,
      last7: Math.round(c.last7 * 100),
      last30: Math.round(c.last30 * 100),
    })),
    activeHabits: habits.filter((h) => h.active).map((h) => ({
      name: h.name,
      type: h.type,
      target: h.target,
      unit: h.unit,
      category: h.categoryKey,
    })),
    ruleBasedNotes: baseRules.map((s) => `- [${s.severity}] ${s.title}: ${s.body}`),
  };

  const prompt = `You are a calm, no-nonsense personal-growth coach helping an MCA college student.
Below is JSON describing their habit tracker state. Reply with:
1) ONE sentence diagnosis of their current trajectory.
2) Top 3 prioritised actions for THIS WEEK (specific, measurable, friendly).
3) ONE habit to STOP / shrink (anti-pattern they may be over-doing or that has low ROI).
4) ONE new habit to consider, justified by the data.

Keep total response under 180 words. Plain markdown. No fluff. No emoji.

DATA:
${JSON.stringify(context, null, 2)}`;

  if (provider === "gemini") {
    return callGemini(key, prompt, await getSetting("ai.model"));
  }
  return callOpenAI(key, prompt, await getSetting("ai.model"));
}

async function callOpenAI(key: string, prompt: string, model?: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "(empty response)";
}

async function callGemini(key: string, prompt: string, model?: string): Promise<string> {
  const m = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(
    key
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("\n") ??
    "(empty response)"
  );
}
