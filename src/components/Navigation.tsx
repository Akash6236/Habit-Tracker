import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ListChecks,
  TrendingUp,
  Brain,
  Settings as SettingsIcon,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/cn";

export type Tab = "today" | "habits" | "growth" | "insights" | "settings";

const ITEMS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "today",    label: "Today",    icon: Sparkles    },
  { id: "habits",   label: "Habits",   icon: ListChecks  },
  { id: "growth",   label: "Growth",   icon: TrendingUp  },
  { id: "insights", label: "Insights", icon: Brain       },
  { id: "settings", label: "Setup",    icon: SettingsIcon },
];

interface NavProps {
  active: Tab;
  onChange: (t: Tab) => void;
  onAdd?: () => void;
}

/* ─────────────────────────────────────────────────────────
   Bottom navigation — floating glass bar with active glow
   ───────────────────────────────────────────────────────── */
export function BottomNav({ active, onChange, onAdd }: NavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-3 sm:px-6 pointer-events-none lg:hidden safe-b">
      <div className="mx-auto max-w-md pb-2 pt-2">
        <div className="card-glass shadow-lift pointer-events-auto px-2 py-2 flex items-center gap-1 rounded-3xl">
          {ITEMS.slice(0, 2).map((it) => (
            <NavButton key={it.id} item={it} active={active} onChange={onChange} />
          ))}

          {/* Center FAB-like add button */}
          <button
            onClick={onAdd}
            className="relative -mt-7 mx-1 grid place-items-center w-12 h-12 rounded-2xl text-white pointer-events-auto bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow active:scale-95 transition-transform"
            aria-label="Quick add"
          >
            <Plus size={22} strokeWidth={2.6} />
            <span className="absolute -inset-1 rounded-2xl ring-2 ring-brand-500/20 animate-pulse-soft pointer-events-none" />
          </button>

          {ITEMS.slice(2).map((it) => (
            <NavButton key={it.id} item={it} active={active} onChange={onChange} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onChange,
}: {
  item: (typeof ITEMS)[number];
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  const on = active === item.id;
  const Icon = item.icon;
  return (
    <button
      onClick={() => onChange(item.id)}
      className={cn(
        "relative flex-1 h-12 grid place-items-center rounded-2xl text-ink-muted transition-colors",
        on && "text-ink"
      )}
      aria-current={on ? "page" : undefined}
    >
      <AnimatePresence>
        {on && (
          <motion.span
            layoutId="navbg"
            className="absolute inset-1 rounded-xl bg-brand-500/12 dark:bg-brand-500/18 ring-1 ring-brand-500/20"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
      </AnimatePresence>
      <span className="relative flex flex-col items-center gap-0.5">
        <Icon size={20} strokeWidth={on ? 2.4 : 2} className={cn(on && "text-brand-600 dark:text-brand-300")} />
        <span className={cn("text-[10px] font-semibold tracking-wide", on ? "text-ink" : "text-ink-muted")}>
          {item.label}
        </span>
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   Desktop sidebar (lg+)
   ───────────────────────────────────────────────────────── */
export function Sidebar({ active, onChange }: NavProps) {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 p-5 z-30 flex-col gap-4">
      <div className="card-glass p-4 flex items-center gap-3 rounded-2xl">
        <Logo />
        <div className="leading-tight">
          <p className="font-display font-extrabold tracking-tightish text-ink text-base">Pulse</p>
          <p className="text-[11px] text-ink-muted">Personal growth OS</p>
        </div>
      </div>

      <nav className="card-glass p-2 rounded-2xl flex-1">
        <ul className="flex flex-col gap-1">
          {ITEMS.map((it) => {
            const on = active === it.id;
            const Icon = it.icon;
            return (
              <li key={it.id}>
                <button
                  onClick={() => onChange(it.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    on
                      ? "bg-brand-500/12 text-ink ring-1 ring-brand-500/20"
                      : "text-ink-muted hover:text-ink hover:bg-surface-muted/60"
                  )}
                >
                  <Icon size={18} strokeWidth={on ? 2.4 : 2} className={on ? "text-brand-600 dark:text-brand-300" : ""} />
                  <span>{it.label}</span>
                  {on && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="card-glass p-3 rounded-2xl text-[11px] text-ink-muted">
        <p className="font-semibold text-ink-soft mb-0.5">Local-first</p>
        <p>Everything you log lives only on this device.</p>
      </div>
    </aside>
  );
}

function Logo() {
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center text-white shadow-glow">
      <Sparkles size={18} strokeWidth={2.4} />
    </div>
  );
}
