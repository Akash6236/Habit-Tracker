import { useEffect, useRef, useState } from "react";
import {
  Brain,
  Cloud,
  CloudOff,
  Database,
  Download,
  Key,
  LogOut,
  Moon,
  Palette,
  RefreshCcw,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { Card, CardHeader } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { IconTile } from "../components/ui/IconTile";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { db, getSetting, setSetting } from "../db/database";
import { downloadFile, exportCSV, exportJSON, importJSON } from "../lib/io";
import { ensureSeed } from "../db/seed";
import { isCloudEnabled } from "../lib/supabase";
import { signOut, useAuth } from "../lib/auth";
import { performSignOutWipe } from "../components/AuthGate";
import { pullAll, pushAll } from "../lib/sync";

export type AccentKey = "indigo" | "blue" | "violet" | "emerald" | "rose";

const ACCENTS: { key: AccentKey; label: string; from: string; to: string }[] = [
  { key: "indigo",  label: "Indigo",  from: "#818cf8", to: "#4338ca" },
  { key: "blue",    label: "Blue",    from: "#60a5fa", to: "#1d4ed8" },
  { key: "violet",  label: "Violet",  from: "#a78bfa", to: "#6d28d9" },
  { key: "emerald", label: "Emerald", from: "#34d399", to: "#047857" },
  { key: "rose",    label: "Rose",    from: "#fb7185", to: "#be123c" },
];

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  accent: AccentKey;
  onAccent: (a: AccentKey) => void;
  focusMode: boolean;
  onFocusMode: (v: boolean) => void;
}

export function SettingsPage({
  isDark,
  onToggleTheme,
  accent,
  onAccent,
  focusMode,
  onFocusMode,
}: Props) {
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [syncBusy, setSyncBusy] = useState<"push" | "pull" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const p = (await getSetting("ai.provider")) as "openai" | "gemini" | undefined;
      const k = await getSetting("ai.key");
      const m = await getSetting("ai.model");
      if (p) setProvider(p);
      if (k) setApiKey(k);
      if (m) setModel(m);
    })();
  }, []);

  async function saveAI() {
    await setSetting("ai.provider", provider);
    await setSetting("ai.key", apiKey.trim());
    await setSetting("ai.model", model.trim());
    toast("AI settings saved", "success");
  }
  async function clearAI() {
    await setSetting("ai.key", "");
    setApiKey("");
    toast("API key cleared", "info");
  }

  async function doExportJSON() {
    const txt = await exportJSON();
    downloadFile(`pulse-habits-${stamp()}.json`, txt);
    toast("Exported JSON", "success");
  }
  async function doExportCSV() {
    const txt = await exportCSV();
    downloadFile(`pulse-habits-${stamp()}.csv`, txt, "text/csv");
    toast("Exported CSV", "success");
  }
  async function doImport(file: File) {
    if (!confirm("Importing will REPLACE all existing data. Continue?")) return;
    try {
      await importJSON(await file.text());
      toast("Import complete — reloading", "success");
      setTimeout(() => location.reload(), 700);
    } catch (e: unknown) {
      toast("Import failed: " + (e instanceof Error ? e.message : String(e)), "error");
    }
  }
  async function nukeAll() {
    if (!confirm("Delete EVERYTHING (habits, entries, settings)? This cannot be undone.")) return;
    if (!confirm("Really delete?")) return;
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
    await ensureSeed();
    toast("Reset & reseeded", "info");
    setTimeout(() => location.reload(), 700);
  }

  async function doSignOut() {
    if (!confirm("Sign out? Your local cache will be cleared (your cloud data is safe).")) return;
    await signOut();
    await performSignOutWipe();
    toast("Signed out", "info");
    setTimeout(() => location.reload(), 500);
  }

  async function doPush() {
    if (!user) return;
    setSyncBusy("push");
    try {
      const { counts } = await pushAll(user.id);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      toast(`Pushed ${total} item${total === 1 ? "" : "s"} to cloud`, "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Push failed", "error");
    } finally {
      setSyncBusy(null);
    }
  }
  async function doPull() {
    if (!user) return;
    setSyncBusy("pull");
    try {
      const { counts } = await pullAll(user.id);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      toast(`Pulled ${total} item${total === 1 ? "" : "s"} from cloud`, "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Pull failed", "error");
    } finally {
      setSyncBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* ─── Account ─── */}
      {isCloudEnabled && (
        <Card>
          <CardHeader
            icon={
              <IconTile size="md" rounded="xl" gradient={["#34d399", "#0ea5e9"]}>
                <UserIcon size={18} />
              </IconTile>
            }
            title="Account"
            subtitle={user ? user.email ?? "Signed in" : "Local only — no account"}
            trailing={
              <Chip tone={user ? "success" : "default"} icon={user ? <Cloud size={12} /> : <CloudOff size={12} />}>
                {user ? "Cloud sync on" : "Offline"}
              </Chip>
            }
          />
          {user && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="soft"
                  iconLeft={<Cloud size={14} />}
                  onClick={doPull}
                  disabled={syncBusy !== null}
                >
                  {syncBusy === "pull" ? "Pulling…" : "Pull from cloud"}
                </Button>
                <Button
                  variant="soft"
                  iconLeft={<Upload size={14} />}
                  onClick={doPush}
                  disabled={syncBusy !== null}
                >
                  {syncBusy === "push" ? "Pushing…" : "Push everything"}
                </Button>
                <Button variant="ghost" iconLeft={<LogOut size={14} />} onClick={doSignOut}>
                  Sign out
                </Button>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Every habit, entry, mood and setting auto-syncs in the background while you're online.
                Use the buttons above for a manual full sync.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Personalization */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#a78bfa", "#6366f1"]}>
              <Palette size={18} />
            </IconTile>
          }
          title="Personalize"
          subtitle="Make it feel like yours"
        />
        <div className="mt-5 space-y-5">
          <Row
            icon={isDark ? <Moon size={16} /> : <Sun size={16} />}
            title="Theme"
            description={isDark ? "Calm dark mode" : "Clean light mode"}
            trailing={
              <Button variant="soft" size="sm" onClick={onToggleTheme}>
                {isDark ? "Switch to light" : "Switch to dark"}
              </Button>
            }
          />
          <Row
            icon={<Sparkles size={16} />}
            title="Accent color"
            description="Used across rings, gradients, highlights"
            trailing={null}
            stacked
          >
            <div className="flex gap-2.5 mt-2">
              {ACCENTS.map((a) => {
                const on = accent === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => onAccent(a.key)}
                    aria-label={a.label}
                    aria-pressed={on}
                    className={`w-9 h-9 rounded-2xl ring-2 transition-all ${
                      on ? "ring-ink scale-105 shadow-glow" : "ring-transparent hover:scale-105"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                  />
                );
              })}
            </div>
          </Row>
          <Row
            icon={<Zap size={16} />}
            title="Focus mode"
            description="Reduces glows, gradients and animation. Use during deep work."
            trailing={
              <Toggle on={focusMode} onChange={onFocusMode} />
            }
          />
        </div>
      </Card>

      {/* AI */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#818cf8", "#7c3aed"]}>
              <Brain size={18} />
            </IconTile>
          }
          title="AI coach"
          subtitle="Optional — your key stays on this device"
          trailing={<Chip tone={apiKey ? "success" : "default"}>{apiKey ? "Active" : "Off"}</Chip>}
        />
        <div className="mt-5 space-y-3">
          <div>
            <FieldLabel>Provider</FieldLabel>
            <select
              className="field"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "openai" | "gemini")}
            >
              <option value="openai">OpenAI (gpt-4o-mini)</option>
              <option value="gemini">Google Gemini (gemini-1.5-flash)</option>
            </select>
          </div>
          <div>
            <FieldLabel>
              <Key size={12} className="inline -mt-0.5 mr-1" /> API key
            </FieldLabel>
            <input
              className="field"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "openai" ? "sk-…" : "AIza…"}
              autoComplete="off"
            />
          </div>
          <div>
            <FieldLabel>Model (optional)</FieldLabel>
            <input
              className="field"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={saveAI}>Save</Button>
            <Button variant="ghost" onClick={clearAI}>Clear key</Button>
          </div>
          <p className="text-[11px] text-ink-muted leading-relaxed flex items-start gap-1.5">
            <Shield size={12} className="mt-0.5 shrink-0" />
            Requests go directly browser → provider. Notes, mood and journal text are never included in the AI payload.
          </p>
        </div>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#34d399", "#0ea5e9"]}>
              <Database size={18} />
            </IconTile>
          }
          title="Backup & restore"
          subtitle="Take your data anywhere"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="soft" iconLeft={<Download size={14} />} onClick={doExportJSON}>
            Export JSON
          </Button>
          <Button variant="soft" iconLeft={<Download size={14} />} onClick={doExportCSV}>
            Export CSV
          </Button>
          <Button variant="ghost" iconLeft={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader
          icon={
            <IconTile size="md" rounded="xl" gradient={["#fb7185", "#be123c"]}>
              <Trash2 size={18} />
            </IconTile>
          }
          title="Reset"
          subtitle="Wipes everything and re-seeds defaults"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="danger" iconLeft={<RefreshCcw size={14} />} onClick={nukeAll}>
            Erase & reseed
          </Button>
          <p className="text-xs text-ink-muted max-w-sm">
            Useful for a clean start. Export first if you want to keep anything.
          </p>
        </div>
      </Card>

      <Card variant="glass">
        <p className="text-xs text-ink-muted leading-relaxed">
          <strong className="text-ink">Pulse</strong> — a calm, local-first habit tracker built with React, Vite,
          Tailwind and Dexie. Designed for daily consistency, not gamified noise.
        </p>
      </Card>
    </div>
  );
}

function Row({
  icon,
  title,
  description,
  trailing,
  stacked,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  stacked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={stacked ? "" : "flex items-center justify-between gap-3"}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="w-8 h-8 rounded-xl grid place-items-center bg-surface-muted text-ink-soft shrink-0">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-ink text-sm">{title}</p>
          {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
          {children}
        </div>
      </div>
      {trailing}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        on ? "bg-gradient-to-r from-brand-400 to-brand-700" : "bg-surface-muted ring-1 ring-surface-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] uppercase font-semibold tracking-wider text-ink-muted mb-1.5 block">
      {children}
    </label>
  );
}

function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
