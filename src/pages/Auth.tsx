import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Sparkles, Loader2, ArrowRight, Shield, Zap } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { sendPasswordReset, signIn, signUp } from "../lib/auth";

type Mode = "signin" | "signup" | "forgot";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
      } else if (mode === "signup") {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        await signUp(email.trim(), password);
        setMsg({
          kind: "ok",
          text: "Account created! If email confirmation is enabled in your project, check your inbox.",
        });
      } else {
        await sendPasswordReset(email.trim());
        setMsg({ kind: "ok", text: "If that email exists, a reset link is on its way." });
      }
    } catch (e: unknown) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-bg min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center gap-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center text-white shadow-glow">
            <Sparkles size={26} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl tracking-tighter2 text-ink">
              Welcome to <span className="heading-accent">Pulse</span>
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Your calm, daily growth tracker.
            </p>
          </div>
        </motion.div>

        <Card variant="glass" className="ring-gradient">
          {/* Tabs */}
          <div className="relative grid grid-cols-2 p-1 rounded-2xl bg-surface-muted/60 ring-1 ring-surface-border mb-5">
            {(["signin", "signup"] as const).map((m) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setMsg(null);
                  }}
                  className="relative py-2 text-sm font-semibold rounded-xl transition-colors"
                >
                  {on && (
                    <motion.span
                      layoutId="auth-tab-bg"
                      className="absolute inset-0 bg-surface rounded-xl shadow-soft ring-1 ring-surface-border"
                      transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    />
                  )}
                  <span className={`relative ${on ? "text-ink" : "text-ink-muted"}`}>
                    {m === "signin" ? "Sign in" : "Create account"}
                  </span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              onSubmit={submit}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div>
                <Label icon={<Mail size={12} />}>Email</Label>
                <input
                  type="email"
                  required
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {mode !== "forgot" && (
                <div>
                  <Label icon={<Lock size={12} />}>Password</Label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full mt-2"
                disabled={busy}
                iconRight={busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              >
                {mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
              </Button>

              <div className="text-center pt-1">
                {mode !== "forgot" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setMsg(null);
                    }}
                    className="text-xs text-ink-muted hover:text-ink"
                  >
                    Forgot password?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setMsg(null);
                    }}
                    className="text-xs text-ink-muted hover:text-ink"
                  >
                    ← Back to sign in
                  </button>
                )}
              </div>

              {msg && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs leading-relaxed text-center mt-1 ${
                    msg.kind === "err" ? "text-rose-500" : "text-success-600"
                  }`}
                >
                  {msg.text}
                </motion.p>
              )}
            </motion.form>
          </AnimatePresence>
        </Card>

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Chip icon={<Shield size={12} />}>End-to-end yours</Chip>
          <Chip icon={<Zap size={12} />}>Works offline</Chip>
          <Chip>Sync across devices</Chip>
        </div>

        <p className="text-[11px] text-ink-muted text-center leading-relaxed">
          By continuing you agree that your habit data is stored on your device and
          synced privately to your own account. Nothing is shared, sold, or analysed.
        </p>
      </div>
    </div>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="text-[11px] uppercase font-semibold tracking-wider text-ink-muted mb-1.5 flex items-center gap-1.5">
      {icon}
      {children}
    </label>
  );
}
