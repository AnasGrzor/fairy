"use client";

import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  PhoneIcon,
  WarningCircleIcon,
  WhatsappLogoIcon,
  WifiSlashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { closeBooking, confirmBooking } from "@/app/admin/actions";
import { ROOMS } from "@/lib/data";
import type { BookingRow, BookingStatus } from "@/lib/supabase/admin";
import { addDays, dfmt, fmt, nightsBetween } from "@/lib/util";

const room = (id: string) => ROOMS.find((r) => r.id === id);
const roomName = (id: string) => room(id)?.name ?? id;
const dayLabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

type Row = BookingRow & { pending?: boolean };
type Move = { id: string; status: BookingStatus };
type Tab = "requests" | "upcoming" | "past";
type Ask = { id: string; action: "declined" | "cancelled" } | null;

const REFRESH_MS = 60_000;
const SLOW_REPLY_H = 6;

/* Utility sets used more than once. Each element gets one tone, so no two utilities set the same property. */
const HEADING = "font-sans normal-case tracking-normal leading-tight font-semibold";
const BTN =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[999px] border text-[14px] font-semibold no-underline [transition:background-color_.15s,transform_.1s] not-disabled:active:[transform:scale(.98)] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none";
const BTN_QUIET = `${BTN} border-line bg-bg-2 text-fg not-disabled:hover:bg-bg-3`;
const BTN_PRIMARY = `${BTN} min-w-28 border-transparent bg-accent px-[18px] text-on-accent not-disabled:hover:bg-accent-deep`;
const BTN_DANGER = `${BTN} border-transparent bg-danger px-[18px] text-bg-2 not-disabled:hover:bg-[color-mix(in_oklch,var(--danger)_88%,black)]`;
const CHIP = "shrink-0 rounded-[999px] px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap";
const CHIP_PLAIN = `${CHIP} bg-bg-3 text-fg`;
const CHIP_REQ = `${CHIP} bg-accent text-on-accent`;
const CHIP_HERE = `${CHIP} bg-[color-mix(in_oklch,var(--ok)_18%,var(--bg-2))] text-ok`;
const CHIP_DONE = `${CHIP} bg-transparent text-fg-2 shadow-[inset_0_0_0_1px_var(--line)]`;
const CHIP_PENDING = `${CHIP_PLAIN} animate-[admin-pulse_1s_ease-in-out_infinite_alternate] motion-reduce:animate-none`;
const LIST = "m-0 list-none overflow-hidden rounded-[12px] border border-line bg-bg-2 p-0";
const PANEL = "rounded-[12px] border border-line bg-bg-2 px-5 py-8";

export function BookingBoard({ rows, units, today, loadedAt }: { rows: BookingRow[]; units: Record<string, number>; today: string; loadedAt: string }) {
  const router = useRouter();
  const [shown, move] = useOptimistic<Row[], Move>(rows, (state, m) =>
    state.map((b) => (b.id === m.id ? { ...b, status: m.status, pending: true, updated_at: new Date().toISOString() } : b)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ask, setAsk] = useState<Ask>(null);
  const [refreshing, startRefresh] = useTransition();
  const [, startAction] = useTransition();

  /* Clock for "2 h ago": starts at the server's time so the first render matches, then ticks. */
  const [now, setNow] = useState(() => new Date(loadedAt).getTime());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* Patchy signal: show when the phone is offline, and pull fresh bookings when it's back or every minute. */
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) startRefresh(() => router.refresh());
    };
    const sync = () => {
      setOnline(navigator.onLine);
      refresh();
    };
    setOnline(navigator.onLine);
    const t = setInterval(refresh, REFRESH_MS);
    addEventListener("online", sync);
    addEventListener("offline", sync);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      removeEventListener("online", sync);
      removeEventListener("offline", sync);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  function act(b: Row, status: BookingStatus) {
    setAsk(null);
    setErrors(({ [b.id]: _, ...rest }) => rest);
    startAction(async () => {
      move({ id: b.id, status });
      try {
        const res = status === "confirmed" ? await confirmBooking(b.id) : await closeBooking(b.id, status as "declined" | "cancelled");
        if (res.error) setErrors((e) => ({ ...e, [b.id]: res.error! }));
      } catch {
        setErrors((e) => ({ ...e, [b.id]: "No connection. Nothing was changed; try again when you have signal." }));
      }
    });
  }

  const open = (b: Row) => b.check_out >= today;
  const requests = shown.filter((b) => b.status === "requested" && open(b)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const upcoming = shown.filter((b) => b.status === "confirmed" && open(b)).sort((a, b) => a.check_in.localeCompare(b.check_in));
  const past = shown
    .filter((b) => !requests.includes(b) && !upcoming.includes(b))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 30);

  const [tab, setTab] = useState<Tab>(() => (requests.length ? "requests" : "upcoming"));
  const lists: Record<Tab, Row[]> = { requests, upcoming, past };
  const tabs: { id: Tab; label: string }[] = [
    { id: "requests", label: "Requests" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
  ];

  /* Per request: nights where every room of its type already holds a confirmed stay, and other requests for the same nights. */
  const conflicts = useMemo(() => {
    const confirmed = shown.filter((b) => b.status === "confirmed");
    const out: Record<string, { full: string[]; rivals: number }> = {};
    for (const b of requests) {
      const full: string[] = [];
      for (let d = b.check_in; d < b.check_out; d = addDays(d, 1)) {
        const taken = confirmed.filter((c) => c.room_id === b.room_id && c.check_in <= d && d < c.check_out).length;
        if (taken >= (units[b.room_id] ?? 0)) full.push(d);
      }
      const rivals = requests.filter((o) => o.id !== b.id && o.room_id === b.room_id && o.check_in < b.check_out && b.check_in < o.check_out).length;
      out[b.id] = { full, rivals };
    }
    return out;
  }, [shown, requests, units]);

  const ago = (iso: string) => relative(new Date(iso).getTime(), now);

  return (
    <>
      <div className="sticky top-0 z-2 -mx-4 flex items-center justify-between gap-2 border-b border-line bg-bg px-4">
        <div
          className="flex min-w-0 gap-1"
          role="tablist"
          aria-label="Bookings"
          onKeyDown={(e) => {
            const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
            if (!step) return;
            const i = (tabs.findIndex((t) => t.id === tab) + step + tabs.length) % tabs.length;
            setTab(tabs[i].id);
            document.getElementById(`tab-${tabs[i].id}`)?.focus();
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className="inline-flex h-12 cursor-pointer items-center gap-2 px-2.5 font-semibold text-fg-2 shadow-[inset_0_-2px_0_transparent] transition-[color,box-shadow] duration-150 ease-[ease] hover:text-fg focus-visible:-outline-offset-2! aria-selected:text-fg aria-selected:shadow-[inset_0_-2px_0_var(--accent-deep)] motion-reduce:transition-none max-[420px]:px-[7px]"
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className={`inline-grid h-[22px] min-w-[22px] place-items-center rounded-[999px] px-[7px] text-[12px] tabular-nums ${t.id === "requests" && requests.length ? "bg-accent text-on-accent" : "bg-bg-3 text-fg"}`}>{lists[t.id].length}</span>
            </button>
          ))}
        </div>
        <button className="inline-flex h-11 cursor-pointer items-center gap-1.5 px-1 text-[13px] whitespace-nowrap text-fg-2 not-disabled:hover:text-fg disabled:cursor-default disabled:opacity-70" onClick={() => startRefresh(() => router.refresh())} disabled={refreshing || !online} aria-label="Refresh bookings">
          <ArrowClockwiseIcon size={18} className={refreshing ? "animate-[admin-spin_.8s_linear_infinite] motion-reduce:animate-none" : undefined} aria-hidden />
          <span className="max-[420px]:hidden">{refreshing ? "Updating" : `Updated ${ago(loadedAt)}`}</span>
        </button>
      </div>

      {!online && (
        <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-[color-mix(in_oklch,var(--accent)_22%,var(--bg-2))] px-3 py-2.5 text-[14px] text-fg" role="status">
          <WifiSlashIcon size={18} className="mt-0.5 shrink-0" aria-hidden /> No signal. Bookings shown are from {ago(loadedAt)}; buttons work again once you&apos;re back online.
        </p>
      )}

      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-4">
        {lists[tab].length === 0 ? (
          <Empty tab={tab} />
        ) : (
          <ul className={LIST}>
            {lists[tab].map((b) => (
              <Booking
                key={b.id}
                b={b}
                tab={tab}
                today={today}
                now={now}
                online={online}
                conflict={conflicts[b.id]}
                error={errors[b.id]}
                asking={ask?.id === b.id ? ask.action : null}
                onAsk={(action) => setAsk(action ? { id: b.id, action } : null)}
                onAct={(s) => act(b, s)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Booking(p: {
  b: Row;
  tab: Tab;
  today: string;
  now: number;
  online: boolean;
  conflict?: { full: string[]; rivals: number };
  error?: string;
  asking: "declined" | "cancelled" | null;
  onAsk: (a: "declined" | "cancelled" | null) => void;
  onAct: (s: BookingStatus) => void;
}) {
  const { b, tab, today } = p;
  const nights = nightsBetween(b.check_in, b.check_out);
  const first = b.guest_name.trim().split(/\s+/)[0];
  const digits = b.phone.replace(/\D/g, "");
  const waText =
    b.status === "confirmed"
      ? `Assalam o Alaikum ${first}, your booking ${b.ref} is confirmed: ${roomName(b.room_id)}, ${dfmt(b.check_in)} to ${dfmt(b.check_out)}. I'll arrange your jeep from Raikot Bridge. Sami, Fairy Meadows Comfort Lodges`
      : `Assalam o Alaikum ${first}, this is Sami from Fairy Meadows Comfort Lodges about your request ${b.ref} (${roomName(b.room_id)}, ${dfmt(b.check_in)} to ${dfmt(b.check_out)}).`;
  const receivedH = (p.now - new Date(b.created_at).getTime()) / 36e5;
  const actionable = b.check_out >= today && !b.pending && (b.status === "requested" || b.status === "confirmed");

  return (
    <li className={`s-${b.status} grid gap-1.5 border-line p-4 transition-opacity duration-200 ease-[ease] not-first:border-t motion-reduce:transition-none${b.pending ? " opacity-60" : ""}`} aria-busy={b.pending}>
      <div className="flex items-start justify-between gap-3">
        <h3 className={`${HEADING} text-[17px] wrap-anywhere`}>{b.guest_name}</h3>
        <Status b={b} today={today} />
      </div>

      <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-medium tabular-nums">
        <span>{dayLabel(b.check_in)}</span>
        <span className="text-fg-2" aria-hidden>→</span>
        <span>{dayLabel(b.check_out)}</span>
        <span className="text-fg-2" aria-hidden>·</span>
        <span>{nights} night{nights === 1 ? "" : "s"}</span>
      </p>
      <p className="text-[14px] text-fg-2">
        {roomName(b.room_id)}
        {b.room_units?.label && <> · {b.room_units.label}</>}
        {b.pending && b.status === "confirmed" && !b.room_units?.label && <> · picking a room…</>}
        {" · "}
        {b.guests} guest{b.guests === 1 ? "" : "s"} · Rs {fmt(b.quoted_total_pkr)}
      </p>

      {tab === "requests" && p.conflict && !b.pending && (
        p.conflict.full.length ? (
          <p className="mt-1 flex items-start gap-2 rounded-lg bg-[color-mix(in_oklch,var(--danger)_9%,var(--bg-2))] px-2.5 py-2 text-[14px] text-danger">
            <WarningCircleIcon size={18} weight="fill" className="mt-px shrink-0" aria-hidden />
            Full on {p.conflict.full.map((d) => dfmt(d)).join(", ")}. Every {room(b.room_id)?.short ?? b.room_id} room is taken.
          </p>
        ) : (
          <p className="mt-1 flex items-start gap-2 text-[14px] text-ok">
            <CheckCircleIcon size={18} weight="fill" className="mt-px shrink-0" aria-hidden />
            Room free for these nights{p.conflict.rivals ? `, but ${p.conflict.rivals} other request${p.conflict.rivals === 1 ? "" : "s"} want${p.conflict.rivals === 1 ? "s" : ""} them too` : ""}.
          </p>
        )
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {actionable && p.asking ? (
          <div className="flex basis-full flex-wrap items-center gap-2 rounded-[10px] bg-[color-mix(in_oklch,var(--danger)_8%,var(--bg-2))] px-3 py-2.5" role="group" aria-label="Are you sure?">
            <span className="basis-full text-[14px] font-medium">{p.asking === "declined" ? "Decline this request?" : "Cancel this stay? The room becomes free."}</span>
            <button className={BTN_DANGER} disabled={!p.online} onClick={() => p.onAct(p.asking!)}>
              {p.asking === "declined" ? "Decline" : "Cancel stay"}
            </button>
            <button className={`${BTN_QUIET} px-[18px]`} onClick={() => p.onAsk(null)}>Keep</button>
          </div>
        ) : actionable && b.status === "requested" ? (
          <>
            <button className={BTN_PRIMARY} disabled={!p.online || !!p.conflict?.full.length} onClick={() => p.onAct("confirmed")}>
              Confirm
            </button>
            <button className={`${BTN_QUIET} px-[18px]`} disabled={!p.online} onClick={() => p.onAsk("declined")}>Decline</button>
          </>
        ) : actionable && b.status === "confirmed" ? (
          <button className={`${BTN_QUIET} px-[18px]`} disabled={!p.online} onClick={() => p.onAsk("cancelled")}>Cancel stay</button>
        ) : null}
        <span className={`flex gap-2 ${actionable && p.asking ? "ml-0" : "ml-auto"}`}>
          <a className={`${BTN_QUIET} pr-3.5 pl-3 max-[420px]:w-11 max-[420px]:p-0`} href={`https://wa.me/${digits}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener" aria-label={`WhatsApp ${first}`}>
            <WhatsappLogoIcon size={20} aria-hidden />
            <span className="max-[420px]:hidden">WhatsApp</span>
          </a>
          <a className={`${BTN_QUIET} w-11 p-0`} href={`tel:${b.phone}`} aria-label={`Call ${first}, ${b.phone}`}>
            <PhoneIcon size={20} aria-hidden />
          </a>
        </span>
      </div>

      {p.error && <p className="mt-1 text-[14px] text-danger" role="alert">{p.error}</p>}

      <p className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-0.5 text-[13px] text-fg-2">
        <span className="tracking-[.02em] tabular-nums">{b.ref}</span>
        <span>{b.phone}</span>
        {b.email && <a href={`mailto:${b.email}`}>{b.email}</a>}
        <span className={b.status === "requested" && receivedH >= SLOW_REPLY_H ? "font-semibold text-danger" : undefined}>
          {b.status === "requested" && receivedH >= SLOW_REPLY_H ? "Waiting " : "Received "}
          {relative(new Date(b.created_at).getTime(), p.now)}
        </span>
      </p>
    </li>
  );
}

function Status({ b, today }: { b: Row; today: string }) {
  if (b.pending) {
    const label = { confirmed: "Confirming…", declined: "Declining…", cancelled: "Cancelling…", requested: "Saving…" }[b.status];
    return <span className={CHIP_PENDING}>{label}</span>;
  }
  if (b.status === "requested") return b.check_out < today ? <span className={CHIP_DONE}>Expired</span> : <span className={CHIP_REQ}>New request</span>;
  if (b.status === "confirmed") {
    if (b.check_out < today) return <span className={CHIP_DONE}>Stayed</span>;
    if (b.check_out === today) return <span className={CHIP_HERE}>Leaves today</span>;
    if (b.check_in <= today) return <span className={CHIP_HERE}>Staying now</span>;
    const days = nightsBetween(today, b.check_in);
    return <span className={CHIP_PLAIN}>{days === 0 ? "Arrives today" : days === 1 ? "Arrives tomorrow" : `In ${days} days`}</span>;
  }
  return <span className={CHIP_DONE}>{b.status === "declined" ? "Declined" : "Cancelled"}</span>;
}

function Empty({ tab }: { tab: Tab }) {
  const copy: Record<Tab, [string, string]> = {
    requests: ["No requests waiting", "When a guest sends a request from the website it shows up here, with a check of whether the room is free. Confirm it and the nights are blocked on the website."],
    upcoming: ["No confirmed stays coming up", "Confirmed requests move here, soonest arrival first, so you can see who is coming and arrange their jeeps."],
    past: ["Nothing here yet", "Declined and cancelled requests, and stays that have ended, are kept here for reference."],
  };
  return (
    <div className={PANEL}>
      <h3 className={`${HEADING} text-[17px]`}>{copy[tab][0]}</h3>
      <p className="mt-1.5 max-w-[60ch] text-fg-2">{copy[tab][1]}</p>
    </div>
  );
}

function relative(then: number, now: number) {
  const s = Math.max(0, (now - then) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
