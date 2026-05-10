import { format, parseISO, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

export const ymd = (d: Date | number) => format(d, "yyyy-MM-dd");
export const today = () => ymd(new Date());
export const fromYmd = (s: string) => parseISO(s);

export function lastNDates(n: number, end: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(ymd(subDays(end, i)));
  return out;
}

export function thisWeekDates(end: Date = new Date()): string[] {
  const s = startOfWeek(end, { weekStartsOn: 1 });
  const e = endOfWeek(end, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: s, end: e }).map(ymd);
}

export function prettyDate(s: string): string {
  return format(fromYmd(s), "EEE, dd MMM yyyy");
}

export function shortDay(s: string): string {
  return format(fromYmd(s), "EEEEE"); // 1-letter weekday
}
