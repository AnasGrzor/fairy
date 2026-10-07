"use client";

import Image, { getImageProps } from "next/image";
import { scroll } from "motion";
import { useEffect, useRef, useState } from "react";
import a3 from "@/images/a3.jpg";
import a7 from "@/images/a7.jpg";
import a18 from "@/images/a18.jpg";
import { useBooking } from "@/components/booking-context";
import { Icon } from "@/components/icons";
import { useScrollTo } from "@/components/smooth-scroll";
import { FORM_ORDER, roomById, waLink } from "@/lib/data";
import { odometer, odometerHtml } from "@/lib/odometer";
import { addDays, clamp, fmt, lerp, prefersReducedMotion, todayIso } from "@/lib/util";

/* The lodge photo is art-directed: landscape on desktop, the portrait red-roof lodge on phones. */
const lodgeAlt = "Two guests smiling in front of the main wooden lodge, snowy peaks behind";
const { props: { srcSet: lodgeMobile } } = getImageProps({ alt: lodgeAlt, src: a18, sizes: "100vw" });
const { props: { srcSet: lodgeDesktop, ...lodgeImg } } = getImageProps({ alt: lodgeAlt, src: a3, sizes: "100vw" });

export function Hero() {
  const { st, set } = useBooking();
  const { goTo } = useScrollTo();

  const f1 = useRef<HTMLDivElement>(null);
  const f2 = useRef<HTMLPictureElement>(null);
  const l1 = useRef<HTMLSpanElement>(null);
  const altNum = useRef<HTMLElement>(null);
  const altLabel = useRef<HTMLSpanElement>(null);
  const hero = useRef<HTMLElement>(null);

  /* The peak, then the lodge below it. Plays on its own at the top of the page, follows the scroll after that. */
  useEffect(() => {
    const img1 = f1.current!.querySelector("img")!;
    const img2 = f2.current!.querySelector("img")!;
    const alt = odometer(altNum.current!);
    const render = (t: number) => {
      f2.current!.style.opacity = String(t);
      img1.style.transform = `scale(${1.02 + t * 0.06})`;
      img2.style.transform = `scale(${1.1 - t * 0.08})`;
      l1.current!.style.opacity = String(1 - t * 0.4);
      alt.set(fmt(Math.round(lerp(26660, 10830, t) / 10) * 10) + " ft");
      altLabel.current!.textContent = t < 0.5 ? "Summit of Nanga Parbat" : "Your room at Fairy Meadows";
    };
    if (prefersReducedMotion()) return render(0);

    let scrollT = 0, autoT = 0, shown = 0, heroOn = true, last = performance.now(), nextFlip = last + 4500, raf = 0;
    const stopScroll = scroll((p: number) => { scrollT = clamp((p - 0.08) / 0.6, 0, 1); }, {
      target: hero.current!,
      offset: ["start start", "end end"],
    });
    const io = new IntersectionObserver(([en]) => { heroOn = en.isIntersecting; });
    io.observe(hero.current!);
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const atTop = scrollY < 24;
      if (!atTop || document.hidden) nextFlip = now + 4500;
      else if (now >= nextFlip) { autoT = autoT ? 0 : 1; nextFlip = now + 5500; }
      const target = atTop ? autoT : scrollT;
      if (!atTop) autoT = 0;
      shown += (target - shown) * (1 - Math.exp(-dt / 380));
      /* Snap the last stretch, or the counter can stop a few feet short of 10,830. */
      if (Math.abs(target - shown) > 0.0005) { if (heroOn) render(shown); }
      else if (shown !== target) { shown = target; if (heroOn) render(shown); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); stopScroll(); io.disconnect(); alt.destroy(); };
  }, []);

  /* Booking bar: a quick version of the full form further down. */
  const [q, setQ] = useState({ cin: "", n: 2, g: 2 });
  const [minDate, setMinDate] = useState<string>();
  useEffect(() => setMinDate(todayIso()), []);
  useEffect(() => {
    if (st.cin) setQ((x) => (x.cin ? x : { ...x, cin: st.cin }));
  }, [st.cin]);

  const step = (k: "n" | "g", d: number) => setQ((x) => ({ ...x, [k]: clamp(x[k] + d, 1, k === "n" ? 14 : 12) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const patch: Parameters<typeof set>[0] = { guests: q.g, datesChosen: true };
    if (q.cin) { patch.cin = q.cin; patch.cout = addDays(q.cin, q.n); }
    /* Too many guests for the chosen room: switch to the smallest room that fits. */
    if (roomById(st.room).max < q.g) {
      const fit = FORM_ORDER.map(roomById).find((r) => r.max >= q.g);
      if (fit) patch.room = fit.id;
    }
    set(patch);
    goTo(document.getElementById("book")!);
  }

  return (
    <header className="relative in-[html.motion]:h-[150vh]" id="top" ref={hero}>
      <div className="sticky top-0 h-dvh min-h-[620px] overflow-hidden motion-reduce:relative">
        <div className="absolute inset-0 block" ref={f1}>
          <Image
            src={a7}
            alt="The snow-covered Rakhiot face of Nanga Parbat in morning sun, above a trekker, a tent and a jeep"
            fill
            preload
            sizes="100vw"
            className="size-full object-cover object-[50%_36%] will-change-[transform,opacity] [transform:scale(1.02)] motion-reduce:transform-none max-[760px]:object-[44%_50%]"
          />
        </div>
        <picture className="absolute inset-0 block opacity-0 motion-reduce:hidden" ref={f2}>
          <source media="(max-width: 760px)" srcSet={lodgeMobile} />
          <source media="(min-width: 761px)" srcSet={lodgeDesktop} />
          <img
            {...lodgeImg}
            className="size-full object-cover object-[50%_45%] will-change-[transform,opacity] [transform:scale(1.1)] max-[760px]:object-[50%_40%]"
          />
        </picture>
        {/* Portrait crops put the headline over bright snow, so on phones the scrim darkens sooner. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--shade)_55%,transparent)_0%,transparent_22%,transparent_45%,color-mix(in_oklch,var(--shade)_88%,transparent)_100%)] max-[760px]:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--shade)_55%,transparent)_0%,transparent_16%,color-mix(in_oklch,var(--shade)_50%,transparent)_30%,color-mix(in_oklch,var(--shade)_92%,transparent)_100%)]" />
        <div className="mx-auto max-w-[1320px] px-(--gutter) absolute inset-x-0 bottom-0 pb-[clamp(36px,7vh,80px)] text-on-photo">
          <div className="flex items-end justify-between gap-6 max-[760px]:flex-col-reverse max-[760px]:items-start max-[760px]:gap-3">
            <div>
              {/* The entrance runs from html.motion (set before hydration), so it plays on first paint. Keyframes live in styles/hero.css. */}
              <h1 className="text-[clamp(46px,8.4vw,96px)] leading-[.95]">
                <span className={LINE}>
                  <span className="block in-[html.motion]:animate-[rise-line_1.1s_var(--ease)_both]" ref={l1}>Wake up to Nanga Parbat.</span>
                </span>
                <span className={LINE}>
                  <span className="block in-[html.motion]:animate-[rise-line_1.1s_var(--ease)_.12s_both]">Sleep at its feet.</span>
                </span>
              </h1>
              <p className="mt-[22px] max-w-[44ch] text-[clamp(16px,1.4vw,19px)] text-inherit opacity-90 in-[html.motion]:animate-[rise-in_.9s_var(--ease)_.35s_both]">
                Elevated stays at 10,000 ft, where mountain comfort meets untouched beauty. Leave the noise behind, soak in the mountain air, and wake up to Pakistan&apos;s 2nd highest peak.
              </p>
            </div>
            <div
              className="shrink-0 pb-1.5 text-right max-[760px]:p-0 max-[760px]:text-left in-[html.motion]:animate-[rise-in_.9s_var(--ease)_.43s_both]"
              aria-hidden="true"
            >
              <b
                className="block font-display text-[clamp(36px,4vw,56px)] leading-none font-extrabold tabular-nums max-[760px]:text-[28px]"
                ref={altNum}
                dangerouslySetInnerHTML={{ __html: odometerHtml("26,660 ft") }}
              />
              <span className="text-[13px] opacity-85" ref={altLabel}>Summit of Nanga Parbat</span>
            </div>
          </div>
          <form
            className="mt-7 grid max-w-[880px] grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-media bg-[color-mix(in_oklch,var(--shade)_55%,transparent)] p-2 [box-shadow:inset_0_0_0_1px_color-mix(in_oklch,var(--on-photo)_20%,transparent)] backdrop-blur-[16px] [color-scheme:dark] max-[760px]:grid-cols-2 in-[html.motion]:animate-[rise-in_.9s_var(--ease)_.51s_both]"
            noValidate
            aria-label="Check dates"
            onSubmit={submit}
          >
            <div className={`${FIELD} max-[760px]:col-span-full`}>
              <label className="text-[12px] opacity-85" htmlFor="qIn">Check-in</label>
              {/* Bare input: preflight already clears its border, padding and background. */}
              <input
                className="min-h-[30px] w-full cursor-pointer appearance-none text-[16px] font-medium text-on-photo focus-visible:rounded-[4px] focus-visible:outline-offset-4"
                type="date"
                id="qIn"
                value={q.cin}
                min={minDate}
                onChange={(e) => setQ((x) => ({ ...x, cin: e.target.value }))}
              />
            </div>
            <Stepper label="Nights" id="qNL" value={q.n} fewer="One night fewer" more="One night more" onStep={(d) => step("n", d)} />
            <Stepper label="Guests" id="qGL" value={q.g} fewer="One guest fewer" more="One guest more" onStep={(d) => step("g", d)} />
            <button className="btn btn-lantern min-h-full px-6 max-[760px]:col-span-full max-[760px]:min-h-[48px]" type="submit">
              Check dates <Icon name="arrow" className="arrow" />
            </button>
          </form>
          <a
            className="mt-3.5 inline-flex items-center gap-2 text-[14px] text-[color:color-mix(in_oklch,var(--on-photo)_88%,transparent)] underline-offset-3 hover:text-on-photo in-[html.motion]:animate-[rise-in_.9s_var(--ease)_.59s_both]"
            href={waLink()}
            target="_blank"
            rel="noopener"
          >
            <Icon name="wa" /> Contact
          </a>
        </div>
      </div>
    </header>
  );
}

/* One headline line: clips the rising text, with a little bottom room so descenders are not cut. */
const LINE = "block overflow-hidden pb-[.08em] -mb-[.08em]";
const FIELD = "grid min-w-0 gap-0.5 rounded-input bg-[color-mix(in_oklch,var(--on-photo)_9%,transparent)] px-3.5 py-2";
const STEP_BTN =
  "grid size-[30px] cursor-pointer place-items-center rounded-full border-0 bg-[color-mix(in_oklch,var(--on-photo)_16%,transparent)] text-on-photo disabled:cursor-default disabled:opacity-35";

function Stepper(props: { label: string; id: string; value: number; fewer: string; more: string; onStep: (d: number) => void }) {
  return (
    <div className={FIELD}>
      <span className="text-[12px] opacity-85" id={props.id}>{props.label}</span>
      <div className="flex min-h-[30px] items-center justify-between gap-2" role="group" aria-labelledby={props.id}>
        <button className={STEP_BTN} type="button" aria-label={props.fewer} disabled={props.value <= 1} onClick={() => props.onStep(-1)}>
          <Icon name="minus" />
        </button>
        <output className="text-[16px] font-semibold tabular-nums">{props.value}</output>
        <button className={STEP_BTN} type="button" aria-label={props.more} onClick={() => props.onStep(1)}>
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}
