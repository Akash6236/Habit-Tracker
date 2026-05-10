import { animate, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 0.7,
  format = (n) => Math.round(n).toString(),
  className,
}: Props) {
  const m = useMotionValue(0);
  const rounded = useTransform(m, (v) => format(v));
  const [text, setText] = useState(format(0));

  useEffect(() => {
    const ctrl = animate(m, value, { duration, ease: [0.22, 1, 0.36, 1] });
    const unsub = rounded.on("change", (v) => setText(v));
    return () => {
      ctrl.stop();
      unsub();
    };
  }, [value, duration, m, rounded]);

  return <span className={className}>{text}</span>;
}
