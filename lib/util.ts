export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const EASE = [0.16, 1, 0.3, 1] as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Dates are handled as UTC midnights so a stay never shifts by a day across time zones. */
const DAY = 864e5;
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const addDays = (s: string, n: number) => iso(new Date(parse(s).getTime() + n * DAY));
export const nightsBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / DAY);
export const inSeason = (d: Date) => {
  const m = d.getUTCMonth() + 1;
  return m >= 4 && m <= 10;
};
export const dfmt = (s: string, withMonth = true) =>
  parse(s).toLocaleDateString(
    "en-GB",
    withMonth ? { day: "numeric", month: "short", timeZone: "UTC" } : { day: "numeric", timeZone: "UTC" },
  );

export const todayIso = () => {
  const now = new Date();
  return iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
};

/** Ten days out, moved to 15 April if that lands in the closed season. */
export const defaultCheckIn = () => {
  const today = parse(todayIso());
  let start = new Date(today.getTime() + 10 * DAY);
  if (!inSeason(start)) {
    const year = start.getUTCMonth() >= 10 ? start.getUTCFullYear() + 1 : start.getUTCFullYear();
    start = new Date(Date.UTC(year, 3, 15));
  }
  return iso(start);
};

export const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
