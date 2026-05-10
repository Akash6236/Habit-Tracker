import { motion } from "framer-motion";
import { cn } from "../lib/cn";

interface Cell {
  date: string;
  score: number; // 0..100
}

interface Props {
  cells: Cell[];
  className?: string;
}

/**
 * GitHub-style consistency heatmap with rounded glow cells and animated fill.
 * Auto-scales to last ~13 weeks.
 */
export function Heatmap({ cells, className }: Props) {
  if (cells.length === 0) return null;

  const firstDate = new Date(cells[0].date + "T00:00:00");
  const day = (firstDate.getDay() + 6) % 7; // Mon-first
  const padded: (Cell | null)[] = [...Array(day).fill(null), ...cells];
  const weeks: (Cell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex gap-1 items-end">
          <div className="flex flex-col gap-1 mr-1.5 text-[9px] uppercase font-semibold tracking-wider text-ink-muted leading-none">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="h-3.5 grid place-items-center w-2.5">{d}</span>
            ))}
          </div>
          {weeks.map((wk, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, di) => {
                const c = wk[di];
                const score = c?.score ?? 0;
                const filled = !!c && score > 0;
                return (
                  <motion.div
                    key={di}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: (wi * 7 + di) * 0.004,
                      duration: 0.35,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    title={c ? `${c.date} · ${score}%` : ""}
                    className={cn(
                      "w-3.5 h-3.5 rounded-md ring-1 ring-inset",
                      !c && "ring-surface-border/40",
                      c && !filled && "bg-surface-muted ring-surface-border/60",
                      filled && "ring-transparent"
                    )}
                    style={
                      filled
                        ? {
                            background: scoreToColor(score),
                            boxShadow: score >= 80 ? "0 0 10px rgb(var(--brand-500) / 0.45)" : undefined,
                          }
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-wider text-ink-muted">
      <span>Less</span>
      {[10, 30, 60, 85, 100].map((s) => (
        <span
          key={s}
          className="w-3 h-3 rounded-sm"
          style={{ background: scoreToColor(s) }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

function scoreToColor(score: number): string {
  // Soft brand-colour ramp using rgba
  const a =
    score >= 90 ? 1
    : score >= 70 ? 0.85
    : score >= 50 ? 0.65
    : score >= 25 ? 0.45
    : 0.28;
  return `rgb(var(--brand-500) / ${a})`;
}
