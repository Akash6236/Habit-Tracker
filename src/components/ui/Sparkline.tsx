import { useId } from "react";
import { cn } from "../../lib/cn";

interface Props {
  values: number[]; // any range; auto-normalised
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  strokeWidth?: number;
}

/** Tiny smooth line chart for habit-card momentum etc. */
export function Sparkline({
  values,
  width = 92,
  height = 28,
  className,
  fill = true,
  strokeWidth = 1.6,
}: Props) {
  const id = useId();
  if (values.length === 0) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  // smooth path with simple Catmull-Rom-ish smoothing
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const cx = (px + x) / 2;
    d += ` Q ${cx.toFixed(2)} ${py.toFixed(2)} ${cx.toFixed(2)} ${((py + y) / 2).toFixed(2)}`;
    d += ` T ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  const fillD = `${d} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`sl-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(var(--brand-500) / 0.45)" />
          <stop offset="100%" stopColor="rgb(var(--brand-500) / 0)" />
        </linearGradient>
        <linearGradient id={`sls-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgb(var(--brand-500))" />
          <stop offset="100%" stopColor="rgb(var(--brand-700))" />
        </linearGradient>
      </defs>
      {fill && <path d={fillD} fill={`url(#sl-${id})`} />}
      <path d={d} fill="none" stroke={`url(#sls-${id})`} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
