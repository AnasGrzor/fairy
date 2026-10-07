"use client";

import Image from "next/image";
import { animate } from "motion";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { requestBooking, type BookingField } from "@/app/actions/booking";
import { useBooking, type Currency } from "@/components/booking-context";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { Odometer } from "@/components/odometer";
import { useScrollTo } from "@/components/smooth-scroll";
import { StayCalendar } from "@/components/stay-calendar";
import { bookedNightsIn, checkStay, firstFreeStay, MAX_GUESTS, normalizePhone } from "@/lib/booking-rules";
import { FORM_ORDER, ROOMS, roomById, waLink, type RoomId } from "@/lib/data";
import { dfmt, EASE, fmt, nightsBetween, prefersReducedMotion, todayIso, WORDS } from "@/lib/util";

const money = (n: number, cur: Currency) => (cur === "pkr" ? "Rs " + fmt(n) : "$" + fmt(n));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const focusEl = (id: string) => {
  const t = (id === "cal" ? document.querySelector("#cal [data-date][tabindex=\"0\"]") : document.getElementById(id)) as HTMLInputElement | null;
  if (!t) return;
  t.focus();
  if (t.type === "date" && t.showPicker) {
    try { t.showPicker(); } catch {}
  }
};

const FIELD_FOCUS: Record<BookingField, string> = { dates: "cal", guests: "gPlus", name: "gname", phone: "gphone", email: "gemail" };

type Booked = Partial<Record<RoomId, Set<string>>>;
const EMPTY: ReadonlySet<string> = new Set();

/* Shared field styles. Media queries use max-width so the breakpoints include their own pixel, as before. */
const RING = "[box-shadow:inset_0_0_0_1px_var(--line)]";
const FLD = "grid gap-2 min-w-0";
const LBL = "text-[14px] font-medium";
const ERR = "text-[13px] text-danger";
const INP = `w-full min-w-0 min-h-[48px] bg-bg-2 border-0 ${RING} rounded-input px-[14px] py-0 text-[16px] text-fg placeholder:text-placeholder focus:outline-none focus:[box-shadow:inset_0_0_0_2px_var(--accent)] aria-invalid:[box-shadow:inset_0_0_0_2px_var(--danger)]`;
const TWO = "grid grid-cols-[1fr_1fr] gap-3 [@media(max-width:420px)]:grid-cols-[1fr]";
const SEND = "grid grid-cols-[1fr_auto] gap-[10px] [@media(max-width:420px)]:grid-cols-[1fr]";
const PANEL = "grid gap-[22px] bg-bg rounded-media p-[clamp(20px,2.6vw,32px)] [box-shadow:0_0_0_1px_var(--line)]";
const QUIET = `bg-bg-2 text-fg ${RING} hover:bg-bg-3`;
const SENTENCE_BTN = "inline appearance-none cursor-pointer [text-transform:inherit] text-fg [box-shadow:inset_0_-.08em_0_var(--accent)] [transition:color_.2s] hover:text-accent focus-visible:outline-offset-4";
const NEXT_LI = "[counter-increment:n] grid gap-1 pt-[14px] border-t border-line min-w-0";
const NEXT_B = "font-semibold text-[15px] before:content-[counter(n)_'._'] before:text-accent";
const NEXT_SPAN = "text-fg-2 text-[14px] leading-[1.5]";
const DT = "text-[13px] text-fg-2";
const DD = "mt-[2px] mx-0 mb-0 font-medium";
const STEP_BTN ="w-10 h-10 rounded-full border-0 bg-bg-3 grid place-items-center cursor-pointer disabled:opacity-35 disabled:cursor-default";

export function Booking() {
  const { st, set } = useBooking();
  const { smooth } = useScrollTo();
  const [today, setToday] = useState<string>();
  useEffect(() => setToday(todayIso()), []);

  /* Nights already taken by confirmed stays. Reloaded when the tab comes back into view and every minute
     while it is visible, so a page left open never shows nights that Sami has since confirmed as free. */
  const [booked, setBooked] = useState<Booked>({});
  const loadAvailability = useCallback(() => {
    fetch("/api/availability", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { rooms?: Record<string, string[]> } | null) => {
        if (!j?.rooms) return;
        setBooked(Object.fromEntries(Object.entries(j.rooms).map(([k, v]) => [k, new Set(v)])) as Booked);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadAvailability();
    const onShow = () => document.visibilityState === "visible" && loadAvailability();
    const timer = setInterval(onShow, 60_000);
    document.addEventListener("visibilitychange", onShow);
    addEventListener("focus", onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      removeEventListener("focus", onShow);
    };
  }, [loadAvailability]);
  const clashFor = (room: RoomId) => bookedNightsIn(st.cin, st.cout, booked[room] ?? EMPTY);

  const [tried, setTried] = useState(false);
  const r = roomById(st.room);
  const stay = today ? checkStay({ room: st.room, cin: st.cin, cout: st.cout, guests: st.guests, today }) : { nights: 0, dateErr: "", guestErr: "" };
  const clash = clashFor(st.room);

  /* The automatic default dates move to the first free stay; dates the guest chose stay put and show the clash. */
  useEffect(() => {
    if (st.datesChosen || !st.cin || !st.cout || !clash.length) return;
    const free = firstFreeStay(st.cin, Math.max(1, nightsBetween(st.cin, st.cout)), booked[st.room] ?? EMPTY);
    if (free) set({ cin: free.cin, cout: free.cout });
  }, [booked, st.room, st.datesChosen, st.cin, st.cout, clash.length]);
  /* Half-picked dates get a hint in the calendar, not an error, until the guest tries to send. */
  const incomplete = !st.cin || !st.cout;
  const dateErr = incomplete ? (tried ? stay.dateErr : "") : stay.dateErr || (clash.length ? `The ${r.phrase} is already booked on ${clash.map((d) => dfmt(d)).join(", ")}. Pick other dates or another room.` : "");
  const guestErr = stay.guestErr;

  const n = Math.max(0, stay.nights);
  const total = n * (st.cur === "pkr" ? r.pkr : r.usd);
  const sameMonth = st.cin && st.cout && st.cin.slice(0, 7) === st.cout.slice(0, 7);
  const dates = st.cin && st.cout ? `${sameMonth ? dfmt(st.cin, false) : dfmt(st.cin)} to ${dfmt(st.cout)}` : "your dates";

  /* Submitting */
  const [pending, startTransition] = useTransition();
  const [serverErr, setServerErr] = useState<{ text: string; field?: BookingField; offline?: boolean } | null>(null);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const doneHead = useRef<HTMLHeadingElement>(null);

  const nameErr = tried && !st.name.trim() ? "Add your name so Sami knows who is coming." : "";
  const phoneErr = tried && !normalizePhone(st.phone) ? "Add a phone number with WhatsApp, like 0331 1332031 or +44 7700 900123." : "";
  const emailErr = tried && st.email.trim() && !EMAIL_RE.test(st.email.trim()) ? "That email address doesn't look right." : "";

  const msg = waMessage(st, r.name, stay.nights, doneRef);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setServerErr(null);
    const local: [BookingField, boolean][] = [
      ["dates", !!dateErr],
      ["guests", !!guestErr],
      ["name", !st.name.trim()],
      ["phone", !normalizePhone(st.phone)],
      ["email", !!st.email.trim() && !EMAIL_RE.test(st.email.trim())],
    ];
    const first = local.find(([, bad]) => bad);
    if (first) return focusEl(FIELD_FOCUS[first[0]]);

    const honeypot = (e.currentTarget as HTMLFormElement).elements.namedItem("website") as HTMLInputElement | null;
    startTransition(async () => {
      try {
        const res = await requestBooking({
          room: st.room, cin: st.cin, cout: st.cout, guests: st.guests,
          name: st.name, phone: st.phone, email: st.email.trim(), website: honeypot?.value ?? "",
        });
        if (res.ok) {
          setDoneRef(res.ref);
          requestAnimationFrame(() => doneHead.current?.focus());
        } else {
          /* Optimistic: cross the refused nights out at once, then reload the real list. */
          if (res.code === "booked" && res.booked?.length) {
            setBooked((b) => ({ ...b, [st.room]: new Set([...(b[st.room] ?? []), ...res.booked!]) }));
            loadAvailability();
          }
          setServerErr({ text: res.error, field: res.field, offline: res.code === "unconfigured" || res.code === "failed" });
          if (res.field) focusEl(FIELD_FOCUS[res.field]);
        }
      } catch {
        setServerErr({ text: "We couldn't reach the booking system. Check your connection, or send the request on WhatsApp.", offline: true });
      }
    });
  }

  function startOver() {
    setDoneRef(null);
    setTried(false);
    setServerErr(null);
  }

  /* A room picked from the tiles above gets a small pulse once the scroll arrives. */
  useEffect(() => {
    if (!st.pickedAt || prefersReducedMotion()) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`r-${st.room}`)?.parentElement;
      if (el) animate(el, { transform: ["scale(1)", "scale(1.04)", "scale(1)"] }, { duration: 0.5, ease: EASE });
    }, smooth() ? 1400 : 60);
    return () => clearTimeout(t);
  }, [st.pickedAt]);

  const fieldErr = (f: BookingField) => (serverErr?.field === f ? serverErr.text : "");

  return (
    <section className="py-[clamp(96px,12vw,176px)] bg-bg-2" id="book" aria-label="Book a stay">
      <div className="mx-auto max-w-[1320px] px-(--gutter) grid grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] gap-[clamp(32px,5vw,88px)] items-start [@media(max-width:960px)]:grid-cols-[minmax(0,1fr)]">
        <div className="sticky top-[96px] grid gap-[clamp(24px,3vw,36px)] self-start [@media(max-width:960px)]:static">
          <p className="font-display font-bold uppercase text-[length:clamp(36px,4.2vw,62px)] leading-[1.02] tracking-[-.005em] text-fg-2" aria-live="polite">
            <button type="button" className={SENTENCE_BTN} onClick={() => focusEl("gPlus")}>
              {WORDS[st.guests] ?? st.guests} guest{st.guests === 1 ? "" : "s"}
            </button>{" "}
            in the{" "}
            <button type="button" className={SENTENCE_BTN} onClick={() => focusEl(`r-${r.id}`)}>{r.phrase}</button>,{" "}
            <button type="button" className={SENTENCE_BTN} onClick={() => focusEl("cal")}>{dates}</button>. {n} night{n === 1 ? "" : "s"}, about{" "}
            <Odometer className="tabular-nums text-accent" text={money(total, st.cur)} />.
          </p>
          <figure className="m-0 grid gap-3">
            <div className="relative rounded-media overflow-hidden aspect-[16/8] max-w-full bg-bg-3 [@media(max-width:600px)]:aspect-[16/10]">
              {ROOMS.map((room) => (
                <Image
                  key={room.id}
                  src={room.img}
                  alt={room.id === r.id ? room.alt : ""}
                  aria-hidden={room.id !== r.id}
                  className={`object-cover [transition:opacity_.45s,transform_.7s_var(--ease)] ${room.id === r.id ? "opacity-100 [transform:none]" : "opacity-0 [transform:scale(1.04)]"}`}
                  fill
                  sizes="(min-width: 960px) 50vw, 100vw"
                  style={{ objectPosition: room.pos }}
                />
              ))}
            </div>
            <figcaption className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-1">
              <b className="font-semibold">{r.name}</b>
              <span className="text-fg-2 text-[15px]">{r.specs}</span>
            </figcaption>
          </figure>
          <ol className="list-none m-0 p-0 grid grid-cols-3 gap-4 [counter-reset:n] [@media(max-width:600px)]:grid-cols-1">
            <li className={NEXT_LI}><b className={NEXT_B}>Sami confirms</b><span className={NEXT_SPAN}>Usually within a few hours, 7 AM to 9 PM Pakistan time.</span></li>
            <li className={NEXT_LI}><b className={NEXT_B}>He books your jeep</b><span className={NEXT_SPAN}>It meets you at Raikot Bridge on the day.</span></li>
            <li className={NEXT_LI}><b className={NEXT_B}>You walk up</b><span className={NEXT_SPAN}>2-3 hours from Tattu. Your room is ready.</span></li>
          </ol>
        </div>

        {doneRef ? (
          <div className={`${PANEL} content-start`} role="status">
            <h3 className="text-[length:clamp(36px,4vw,52px)] outline-none" ref={doneHead} tabIndex={-1}>Request sent</h3>
            <p className="text-fg-2">
              Your reference is <b className="text-fg tabular-nums tracking-[.02em]">{doneRef}</b>. Sami will confirm on WhatsApp at {st.phone.trim()}, usually within a few
              hours, 7 AM to 9 PM Pakistan time. Nothing has been charged.
            </p>
            <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-[14px] py-[18px] border-y border-line">
              <div><dt className={DT}>Room</dt><dd className={DD}>{r.name}</dd></div>
              <div><dt className={DT}>Dates</dt><dd className={DD}>{dfmt(st.cin)} to {dfmt(st.cout)}, {n} night{n === 1 ? "" : "s"}</dd></div>
              <div><dt className={DT}>Guests</dt><dd className={DD}>{st.guests}</dd></div>
              <div><dt className={DT}>About</dt><dd className={DD}>Rs {fmt(n * r.pkr)}</dd></div>
            </dl>
            <div className={SEND}>
              <a className="btn btn-lantern" target="_blank" rel="noopener" href={waLink(msg)}>
                <Icon name="wa" /> Message Sami now
              </a>
              <CopyButton text={doneRef} className={`btn ${QUIET}`} label="Copy reference" />
            </div>
            <button type="button" className="appearance-none cursor-pointer justify-self-start text-start text-[14px] text-fg-2 underline underline-offset-[3px] hover:text-fg focus-visible:rounded-[2px]" onClick={startOver}>Make another request</button>
          </div>
        ) : (
          <form className={PANEL} noValidate onSubmit={submit} aria-busy={pending}>
            <fieldset className="grid grid-cols-2 gap-2 border-0 m-0 p-0">
              <legend className={`${LBL} p-0 mb-2`}>Room</legend>
              {FORM_ORDER.map(roomById).map((room) => {
                const taken = clashFor(room.id).length > 0;
                return (
                  <label key={room.id} className={`relative grid gap-[2px] py-3 px-[14px] rounded-input bg-bg-2 ${RING} cursor-pointer [transition:box-shadow_.2s,background-color_.2s] has-checked:[box-shadow:inset_0_0_0_2px_var(--accent)] has-checked:bg-bg-3 has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2`}>
                    <input className="absolute opacity-0 pointer-events-none" type="radio" name="room" id={`r-${room.id}`} value={room.id} checked={st.room === room.id} onChange={() => set({ room: room.id })} />
                    <b className="font-semibold text-[15px]">{room.short}</b>
                    <span className={`text-[13px] ${taken ? "text-danger" : "text-fg-2"}`}>{taken ? "Booked on your dates" : `Rs ${fmt(room.pkr)}, up to ${room.max}`}</span>
                  </label>
                );
              })}
            </fieldset>
            <div className={FLD}>
              <span className={LBL}>Dates</span>
              <StayCalendar
                cin={st.cin}
                cout={st.cout}
                booked={booked[st.room] ?? EMPTY}
                today={today}
                roomLabel={r.phrase}
                onChange={(cin, cout) => set({ cin, cout, datesChosen: true })}
              />
            </div>
            <p className={ERR} id="cinErr" role="alert" hidden={!(dateErr || fieldErr("dates"))}>{dateErr || fieldErr("dates")}</p>
            <div className={TWO}>
              <div className={FLD}>
                <span className={LBL} id="gLbl">Guests</span>
                <div className={`flex items-center justify-between min-h-[48px] bg-bg-2 ${RING} rounded-input p-1`} role="group" aria-labelledby="gLbl">
                  <button type="button" className={STEP_BTN} id="gMinus" aria-label="One guest fewer" disabled={st.guests <= 1} onClick={() => set({ guests: Math.max(1, st.guests - 1) })}>
                    <Icon name="minus" />
                  </button>
                  <output className="tabular-nums font-semibold">{st.guests}</output>
                  <button type="button" className={STEP_BTN} id="gPlus" aria-label="One guest more" disabled={st.guests >= MAX_GUESTS} onClick={() => set({ guests: Math.min(MAX_GUESTS, st.guests + 1) })}>
                    <Icon name="plus" />
                  </button>
                </div>
              </div>
              <div className={FLD}>
                <span className={LBL} id="curLbl">Show prices in</span>
                <div className={`inline-flex gap-1 p-[3px] rounded-full bg-bg-2 ${RING}`} role="group" aria-labelledby="curLbl">
                  {(["pkr", "usd"] as const).map((c) => (
                    <button key={c} type="button" className="border-0 bg-transparent rounded-full py-[6px] px-3 text-[13px] font-semibold text-fg-2 cursor-pointer aria-pressed:bg-fg aria-pressed:text-bg" aria-pressed={st.cur === c} onClick={() => set({ cur: c })}>
                      {c.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className={ERR} hidden={!(guestErr || fieldErr("guests"))}>{guestErr || fieldErr("guests")}</p>
            <div className={TWO}>
              <div className={FLD}>
                <label className={LBL} htmlFor="gname">Your name</label>
                <input className={INP} id="gname" type="text" autoComplete="name" placeholder="Ayesha Rahman" value={st.name} aria-invalid={!!(nameErr || fieldErr("name"))} aria-describedby="gnameErr" onChange={(e) => set({ name: e.target.value })} />
                <p className={`${ERR} -mt-[2px]`} id="gnameErr" hidden={!(nameErr || fieldErr("name"))}>{nameErr || fieldErr("name")}</p>
              </div>
              <div className={FLD}>
                <label className={LBL} htmlFor="gphone">WhatsApp number</label>
                <input className={INP} id="gphone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0331 1332031" value={st.phone} aria-invalid={!!(phoneErr || fieldErr("phone"))} aria-describedby="gphoneErr" onChange={(e) => set({ phone: e.target.value })} />
                <p className={`${ERR} -mt-[2px]`} id="gphoneErr" hidden={!(phoneErr || fieldErr("phone"))}>{phoneErr || fieldErr("phone")}</p>
              </div>
            </div>
            <div className={FLD}>
              <label className={LBL} htmlFor="gemail">Email <span className="font-normal text-fg-2 ml-1">optional</span></label>
              <input className={INP} id="gemail" type="email" autoComplete="email" placeholder="ayesha@example.com" value={st.email} aria-invalid={!!(emailErr || fieldErr("email"))} aria-describedby="gemailErr" onChange={(e) => set({ email: e.target.value })} />
              <p className={`${ERR} -mt-[2px]`} id="gemailErr" hidden={!(emailErr || fieldErr("email"))}>{emailErr || fieldErr("email")}</p>
            </div>
            <div className="absolute left-[-9999px] w-px h-px overflow-hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            {serverErr && !serverErr.field && <p className={ERR} role="alert">{serverErr.text}</p>}
            <div className={SEND}>
              <button className="btn btn-lantern disabled:opacity-60 disabled:cursor-progress" type="submit" disabled={pending}>
                {pending ? "Sending…" : <>Request booking <Icon name="arrow" className="arrow" /></>}
              </button>
              <a className={`btn ${serverErr?.offline ? "btn-lantern" : QUIET}`} target="_blank" rel="noopener" href={waLink(msg)} aria-label="Send on WhatsApp instead">
                <Icon name="wa" /> <span>WhatsApp</span>
              </a>
            </div>
            <p className="text-[13px] text-fg-2">Nothing is charged now. Sami checks the room and confirms on WhatsApp.</p>
          </form>
        )}
      </div>
    </section>
  );
}

function waMessage(
  st: { guests: number; cin: string; cout: string; name: string },
  roomName: string,
  nights: number,
  ref: string | null,
) {
  const name = st.name.trim();
  return (
    `Assalam o Alaikum Sami,\n\n` +
    (ref ? `I've just sent booking request ${ref} on your website: ` : `I'd like to book `) +
    `the ${roomName} for ${st.guests} guest${st.guests === 1 ? "" : "s"}` +
    (nights > 0 ? `, ${dfmt(st.cin)} to ${dfmt(st.cout)} (${nights} night${nights === 1 ? "" : "s"}).` : ".") +
    `\nCould you confirm the room and arrange the jeep from Raikot Bridge?` +
    (name ? `\n\nThanks,\n${name}` : "")
  );
}
