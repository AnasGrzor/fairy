/* Stay rules shared by the booking form (instant feedback) and the server action (the real check). */

import { roomById, type RoomId } from "@/lib/data";
import { inSeason, nightsBetween, parse } from "@/lib/util";

export const MAX_GUESTS = 12;
export const MAX_NIGHTS = 30;

export type StayCheck = { nights: number; dateErr: string; guestErr: string };

export function checkStay(s: { room: RoomId; cin: string; cout: string; guests: number; today: string }): StayCheck {
  const r = roomById(s.room);
  let nights = 0, dateErr = "";
  if (!s.cin || !s.cout) dateErr = "Pick a check-in and a check-out date.";
  else {
    nights = nightsBetween(s.cin, s.cout);
    const lastNight = new Date(parse(s.cout).getTime() - 864e5);
    if (s.cin < s.today) dateErr = "Check-in is in the past. Pick a date from today on.";
    else if (nights < 1) dateErr = "Check-out has to be at least one day after check-in.";
    else if (nights > MAX_NIGHTS) dateErr = `Stays can be up to ${MAX_NIGHTS} nights. Message Sami about longer stays.`;
    else if (!inSeason(parse(s.cin)) || !inSeason(lastNight)) dateErr = "The lodge is open April to October. Snow closes the trail in winter.";
  }
  const guestErr =
    s.guests > r.max ? `The ${r.short} room sleeps up to ${r.max}. Choose the Family lodge, or ask Sami for two rooms.` : "";
  return { nights, dateErr, guestErr };
}

/** Stays are quoted in rupees; the USD figure on the site is for reference. */
export const quotePkr = (room: RoomId, nights: number) => Math.max(0, nights) * roomById(room).pkr;

/** Accepts 0331-1332031, 92331..., +92 331 ... or any international number; returns +digits, or null. */
export function normalizePhone(input: string): string | null {
  const s = input.replace(/[\s\-().]/g, "");
  if (/^0\d{10}$/.test(s)) return "+92" + s.slice(1);
  if (/^92\d{10}$/.test(s)) return "+" + s;
  if (/^00\d{7,15}$/.test(s)) return "+" + s.slice(2);
  if (/^\+\d{7,15}$/.test(s)) return s;
  return null;
}

/** Today's date at the lodge, whatever time zone the server runs in. */
export const karachiToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** First stay of `nights` nights from `from` on that is in season and clear of booked nights, or null within ~13 months. */
export function firstFreeStay(from: string, nights: number, booked: ReadonlySet<string>): { cin: string; cout: string } | null {
  let cin = parse(from);
  for (let i = 0; i < 400; i++, cin = new Date(cin.getTime() + 864e5)) {
    let ok = true;
    for (let n = 0; n < nights && ok; n++) {
      const d = new Date(cin.getTime() + n * 864e5);
      ok = inSeason(d) && !booked.has(d.toISOString().slice(0, 10));
    }
    if (ok) {
      const s = cin.toISOString().slice(0, 10);
      return { cin: s, cout: new Date(cin.getTime() + nights * 864e5).toISOString().slice(0, 10) };
    }
  }
  return null;
}

/** Nights of a stay ([cin, cout)) that appear in a set of fully booked nights. */
export function bookedNightsIn(cin: string, cout: string, booked: ReadonlySet<string>): string[] {
  if (!cin || !cout || cout <= cin || !booked.size) return [];
  const out: string[] = [];
  for (let d = parse(cin); d < parse(cout); d = new Date(d.getTime() + 864e5)) {
    const s = d.toISOString().slice(0, 10);
    if (booked.has(s)) out.push(s);
  }
  return out;
}
