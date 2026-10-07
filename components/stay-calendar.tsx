"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_NIGHTS } from "@/lib/booking-rules";
import { addDays, inSeason, nightsBetween, parse } from "@/lib/util";

/* Month calendar for picking a stay. A date stands for the night that starts on it:
   a booked date can't be a check-in or sit inside a stay, but it can be the check-out day,
   because the guest leaves that morning. */

type Props = {
  cin: string;
  cout: string;
  booked: ReadonlySet<string>;
  today?: string;
  roomLabel: string;
  onChange: (cin: string, cout: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthOf = (d: string) => d.slice(0, 7);
const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const monthTitle = (m: string) => parse(m + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const longDate = (d: string) => parse(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDate = (d: string) => parse(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const NAV = "w-10 h-10 rounded-full border-0 bg-bg-3 text-[22px] leading-none grid place-items-center cursor-pointer disabled:opacity-30 disabled:cursor-default";
const COLS = "grid grid-cols-7 gap-x-0 gap-y-1";
const MUTED = "text-[color-mix(in_oklch,var(--fg-2)_45%,transparent)]";
const CLOSED_BG = "bg-[repeating-linear-gradient(135deg,transparent_0_5px,color-mix(in_oklch,var(--fg)_5%,transparent)_5px_6px)]";
/* A booked night inside the current selection stays visibly booked, so a clashing stay never looks fine. */
const CLASH_BG = "bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--danger)_45%,transparent)_0_4px,color-mix(in_oklch,var(--danger)_22%,transparent)_4px_8px)]";
const TODAY_DOT = "after:absolute after:left-1/2 after:bottom-[6px] after:w-1 after:h-1 after:-ml-[2px] after:rounded-[50%] after:bg-current";
const KEY = "w-3 h-3 rounded-[3px] block [box-shadow:inset_0_0_0_1px_var(--line)]";

export function StayCalendar({ cin, cout, booked, today, roomLabel, onChange }: Props) {
  const [view, setView] = useState(() => monthOf(cin || today || new Date().toISOString()));
  const [hover, setHover] = useState<string | null>(null);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  /* Follow outside changes (the hero bar, the default dates) to the right month. */
  useEffect(() => {
    if (cin) setView(monthOf(cin));
  }, [cin]);

  const picking = !!cin && !cout;
  const minMonth = monthOf(today ?? new Date().toISOString());
  const maxMonth = shiftMonth(minMonth, 12);

  const canCheckIn = (d: string) => (!today || d >= today) && inSeason(parse(d)) && !booked.has(d);

  /* While choosing a check-out, the stay can run up to the first night that is booked or out of season. */
  const lastCheckout = useMemo(() => {
    if (!picking) return "";
    let d = cin;
    for (let i = 0; i < MAX_NIGHTS; i++) {
      if (booked.has(d) || !inSeason(parse(d))) return d;
      d = addDays(d, 1);
    }
    return d;
  }, [picking, cin, booked]);
  const canCheckOut = (d: string) => picking && d > cin && d <= lastCheckout;

  function pick(d: string) {
    if (canCheckOut(d)) {
      onChange(cin, d);
      setHover(null);
    } else if (canCheckIn(d)) onChange(d, "");
  }

  const days = useMemo(() => {
    const first = parse(view + "-01");
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return { lead, list: Array.from({ length: count }, (_, i) => `${view}-${String(i + 1).padStart(2, "0")}`) };
  }, [view]);

  const rangeEnd = cout || (picking && hover && canCheckOut(hover) ? hover : "");
  const allClosed = days.list.every((d) => !inSeason(parse(d)));

  /* Roving focus: one day is in the tab order, arrow keys move between days and across months. */
  const selectable = (d: string) => canCheckIn(d) || canCheckOut(d);
  const tabDate =
    (focusDate && monthOf(focusDate) === view && focusDate) ||
    (cin && monthOf(cin) === view && cin) ||
    days.list.find(selectable) ||
    days.list[0];

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${tabDate}"]`)?.focus();
  });

  function onKey(e: React.KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDays(tabDate, step);
    if (monthOf(next) < minMonth || monthOf(next) > maxMonth) return;
    setFocusDate(next);
    setView(monthOf(next));
    moveFocus.current = true;
  }

  const nights = cin && cout ? nightsBetween(cin, cout) : 0;

  return (
    <div className="grid gap-[10px] p-[14px] rounded-input bg-bg-2 [box-shadow:inset_0_0_0_1px_var(--line)]" id="cal">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className={NAV} aria-label="Previous month" disabled={view <= minMonth} onClick={() => setView(shiftMonth(view, -1))}>
          ‹
        </button>
        <h4 className="m-0 text-[16px] font-semibold" aria-live="polite">{monthTitle(view)}</h4>
        <button type="button" className={NAV} aria-label="Next month" disabled={view >= maxMonth} onClick={() => setView(shiftMonth(view, 1))}>
          ›
        </button>
      </div>

      <div className={COLS} aria-hidden="true">
        {WEEKDAYS.map((w) => <span key={w} className="text-center text-[12px] text-fg-2">{w.slice(0, 2)}</span>)}
      </div>

      <div className={`${COLS} relative`} ref={grid} role="group" aria-label={`Nights in ${monthTitle(view)} for the ${roomLabel}`} onKeyDown={onKey} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: days.lead }, (_, i) => <span key={"x" + i} />)}
        {days.list.map((d) => {
          const past = !!today && d < today;
          const closed = !inSeason(parse(d));
          const isBooked = booked.has(d) && !past && !closed;
          const isStart = d === cin;
          const isEnd = !!rangeEnd && d === rangeEnd;
          const inRange = !!cin && !!rangeEnd && d > cin && d < rangeEnd;
          const enabled = selectable(d);
          const state = past ? "past" : closed ? "closed for the season" : isBooked ? (canCheckOut(d) ? "booked, available as check-out" : "booked") : "available";
          /* Day look. Each ternary lists the states from strongest to weakest. */
          const clash = isBooked && (inRange || isStart);
          const edge = isStart || isEnd;
          const startAlone = isStart && !(rangeEnd > d && days.list.includes(rangeEnd));
          const color = clash ? "text-fg" : edge ? "text-on-accent" : isBooked ? "text-danger" : past || closed ? MUTED : "text-fg";
          const bg = clash ? CLASH_BG
            : edge ? "bg-accent"
            : inRange ? "bg-[color-mix(in_oklch,var(--accent)_22%,transparent)]"
            : isBooked ? "bg-[color-mix(in_oklch,var(--danger)_13%,transparent)]"
            : closed && !past ? CLOSED_BG
            : "";
          const radius = startAlone ? "rounded-[10px]" : isStart ? "rounded-[10px_0_0_10px]" : isEnd ? "rounded-[0_10px_10px_0]" : inRange || isBooked ? "rounded-none" : "rounded-[10px]";
          return (
            <button
              key={d}
              type="button"
              data-date={d}
              tabIndex={d === tabDate ? 0 : -1}
              aria-disabled={!enabled}
              aria-pressed={isStart || (!!cout && isEnd)}
              aria-label={`${longDate(d)}, ${state}${isStart ? ", check-in" : ""}${cout && isEnd ? ", check-out" : ""}`}
              className={[
                "relative h-11 border-0 text-[15px] font-medium tabular-nums focus-visible:-outline-offset-2 focus-visible:z-1",
                color,
                bg,
                radius,
                isBooked && !isEnd && "line-through decoration-2",
                isBooked && isStart && "[box-shadow:inset_0_0_0_2px_var(--danger)]",
                d === today && TODAY_DOT,
                enabled ? "cursor-pointer" : "cursor-default",
                enabled && !edge && !inRange && "hover:[background:var(--bg-3)]",
              ].filter(Boolean).join(" ")}
              onClick={() => enabled && pick(d)}
              onMouseEnter={() => picking && setHover(d)}
              onFocus={() => setFocusDate(d)}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
        {allClosed && <p className="absolute inset-0 grid place-items-center text-center p-4 m-0 text-[14px] text-fg-2 bg-[color-mix(in_oklch,var(--bg-2)_70%,transparent)] pointer-events-none">Closed November to March. Snow closes the trail.</p>}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 pt-2 border-t border-line">
        <p className="text-[14px] font-medium" aria-live="polite">
          {!cin ? "Pick your check-in day." : picking ? <>Check-in {shortDate(cin)}. Now pick your check-out day.</> : <>{shortDate(cin)} to {shortDate(cout)} · {nights} night{nights === 1 ? "" : "s"}</>}
        </p>
        <ul className="flex gap-3 m-0 p-0 list-none text-[12px] text-fg-2" aria-label="Key">
          <li className="flex items-center gap-[6px]"><i className={`${KEY} bg-bg`} />Available</li>
          <li className="flex items-center gap-[6px]"><i className={`${KEY} bg-[color-mix(in_oklch,var(--danger)_40%,transparent)]`} />Booked</li>
          <li className="flex items-center gap-[6px]"><i className={`${KEY} bg-[repeating-linear-gradient(135deg,var(--bg-2)_0_2px,var(--fg-2)_2px_3px)]`} />Closed</li>
        </ul>
      </div>
    </div>
  );
}
