import { Moon, Sun } from "lucide-react";
import { format } from "date-fns";
import { Button } from "./ui/Button";

interface Props {
  onToggleTheme: () => void;
  isDark: boolean;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Wind down";
}

export function Header({ onToggleTheme, isDark }: Props) {
  return (
    <header className="safe-t sticky top-0 z-30 px-4 sm:px-6 lg:px-8 pt-3 pb-2 backdrop-blur-md bg-surface-soft/60 lg:hidden">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {format(new Date(), "EEEE, MMM d")}
          </p>
          <h1 className="font-display font-extrabold text-xl tracking-tighter2 text-ink truncate">
            {greeting()}.
          </h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  );
}
