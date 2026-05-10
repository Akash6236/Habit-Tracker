import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-3 py-10 px-4",
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-brand-400/20 to-brand-700/20 text-brand-600 dark:text-brand-300 ring-1 ring-brand-500/15">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h4 className="font-display font-bold text-ink">{title}</h4>
        {body && <p className="text-sm text-ink-muted max-w-sm mx-auto">{body}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
