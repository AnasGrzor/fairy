"use client";

import Image from "next/image";
import { scroll } from "motion";
import { useEffect, useRef } from "react";
import { STAGES } from "@/lib/data";
import { odometer, odometerHtml } from "@/lib/odometer";
import { clamp, fmt, lerp, prefersReducedMotion } from "@/lib/util";

/* On wide screens the section pins and the route scrolls sideways while a ridge line draws itself.
   On phones, or with reduced motion, it is a plain vertical list. */
export function Climb() {
  const climb = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const ridge = useRef<SVGSVGElement>(null);
  const base = useRef<SVGPathElement>(null);
  const lit = useRef<SVGPathElement>(null);
  const rect = useRef<SVGRectElement>(null);
  const dotsG = useRef<SVGGElement>(null);
  const readAlt = useRef<HTMLElement>(null);
  const readName = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sec = climb.current!, tr = track.current!;
    const panels = [...tr.querySelectorAll<HTMLElement>(".panel.stage")];
    const wide = matchMedia("(min-width: 900px) and (min-height: 600px)");
    const motionOk = !prefersReducedMotion();
    let stop: (() => void) | null = null;
    const readout = odometer(readAlt.current!);

    function layout() {
      stop?.();
      stop = null;
      tr.style.transform = "";
      const pin = wide.matches && motionOk;
      sec.classList.toggle("pinned", pin);
      if (!pin) { sec.style.height = ""; return; }

      const over = tr.scrollWidth - innerWidth;
      sec.style.height = innerHeight + over + "px";
      const W = tr.scrollWidth, H = tr.clientHeight;
      const svg = ridge.current!;
      svg.setAttribute("width", String(W));
      svg.setAttribute("height", String(H));
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const yOf = (a: number) => H * 0.95 - ((a - 3280) / 10500) * H * 0.14;
      const pts = panels.map((p, k) => [p.offsetLeft + parseFloat(getComputedStyle(p).paddingLeft), yOf(STAGES[k].alt)]);
      let d = `M 0 ${pts[0][1]} L ${pts[0][0]} ${pts[0][1]}`;
      for (let k = 1; k < pts.length; k++) {
        const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], dx = (x1 - x0) / 2;
        d += ` C ${x0 + dx} ${y0} ${x1 - dx} ${y1} ${x1} ${y1}`;
      }
      d += ` L ${W} ${pts[pts.length - 1][1]}`;
      base.current!.setAttribute("d", d);
      lit.current!.setAttribute("d", d);
      dotsG.current!.innerHTML = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6"/>`).join("");
      const dots = [...dotsG.current!.querySelectorAll("circle")];

      stop = scroll((p: number) => {
        const x = over * p;
        tr.style.transform = `translate3d(${-x}px,0,0)`;
        const head = x + innerWidth * 0.55;
        rect.current!.setAttribute("width", String(Math.max(0, head)));
        dots.forEach((c, k) => c.classList.toggle("on", pts[k][0] <= head));
        let k = 0;
        while (k < pts.length - 1 && pts[k + 1][0] <= head) k++;
        const last = k === pts.length - 1;
        const f = last ? 0 : clamp((head - pts[k][0]) / (pts[k + 1][0] - pts[k][0]), 0, 1);
        const alt = last ? STAGES[k].alt : lerp(STAGES[k].alt, STAGES[k + 1].alt, f);
        readout.set(fmt(Math.round(alt / 10) * 10) + " ft");
        readName.current!.textContent = f > 0.5 && !last ? "Towards " + STAGES[k + 1].name : STAGES[k].name;
      }, { target: sec, offset: ["start start", "end end"] });
    }

    const io = new IntersectionObserver(([en]) => sec.classList.toggle("in", en.isIntersecting && en.intersectionRatio > 0), { threshold: [0, 0.01] });
    io.observe(sec);
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(layout, 150); };
    addEventListener("resize", onResize);
    wide.addEventListener("change", layout);
    layout();
    document.fonts?.ready.then(layout);

    return () => {
      stop?.();
      readout.destroy();
      io.disconnect();
      clearTimeout(t);
      removeEventListener("resize", onResize);
      wide.removeEventListener("change", layout);
    };
  }, []);

  /* layout() toggles .pinned (wide screens with motion) and the observer toggles .in on the section; the group-[.pinned]: and
     group-[.in]: utilities below style those states. Unpinned is the base: a plain vertical list. */
  return (
    <section className="group relative py-[clamp(96px,12vw,160px)] [&.pinned]:py-0" id="climb" aria-label="Getting to Fairy Meadows" ref={climb}>
      <div className="relative group-[.pinned]:sticky group-[.pinned]:top-0 group-[.pinned]:flex group-[.pinned]:h-dvh group-[.pinned]:items-center group-[.pinned]:overflow-hidden">
        <div
          className="relative flex flex-col items-stretch gap-14 px-(--gutter) will-change-transform group-[.pinned]:h-full group-[.pinned]:flex-row group-[.pinned]:gap-0 group-[.pinned]:pt-24 group-[.pinned]:pb-[22vh]"
          ref={track}
        >
          <svg className="pointer-events-none absolute top-0 left-0 hidden overflow-visible group-[.pinned]:block" ref={ridge} aria-hidden="true">
            <defs>
              <clipPath id="drawn">
                <rect ref={rect} x="0" y="0" width="0" height="100%" />
              </clipPath>
            </defs>
            <path className="fill-none stroke-line stroke-2 [stroke-dasharray:2_7] [stroke-linecap:round]" ref={base} />
            <path className="fill-none stroke-accent stroke-[2.5] [stroke-linecap:round]" ref={lit} clipPath="url(#drawn)" />
            {/* The stop dots are drawn by layout(); the scroll handler marks the passed ones with .on. */}
            <g
              className="[&_circle]:fill-bg [&_circle]:stroke-fg-2 [&_circle]:stroke-2 [&_circle]:transition-[fill,stroke] [&_circle]:duration-300 [&_circle.on]:fill-accent [&_circle.on]:stroke-accent"
              ref={dotsG}
            />
          </svg>
          <div className={`${PANEL} gap-3.5 group-[.pinned]:w-[min(88vw,620px)]`}>
            <h2 className="text-[clamp(44px,6.4vw,88px)]">The road ends 6,890 ft below your room.</h2>
            <p className="mt-5 text-fg-2 max-w-[36ch]">From the Karakoram Highway it is a jeep track, then a footpath. Sami books the jeep when you book the room.</p>
          </div>
          {STAGES.map((s) => (
            <div
              key={s.name}
              className={`panel stage ${PANEL} ${
                s.img
                  ? "items-stretch gap-[clamp(24px,3vw,48px)] group-[.pinned]:w-[min(92vw,1040px)] group-[.pinned]:flex-row group-[.pinned]:items-center"
                  : "gap-3.5 group-[.pinned]:w-[min(80vw,520px)]"
              }`}
            >
              <div className="flex flex-[0_0_42%] flex-col gap-3.5">
                <div className="tabular-nums font-display text-[clamp(88px,11vw,168px)] leading-[.82] font-extrabold tracking-[-.01em] text-fg">
                  {fmt(s.alt)}
                  <small className="ml-1.5 text-[.32em] font-bold text-fg-2">ft</small>
                </div>
                <h3 className="text-[clamp(28px,2.6vw,38px)]">{s.h}</h3>
                <p className="max-w-[36ch] text-fg-2">{s.p}</p>
              </div>
              {s.img && (
                <figure className="m-0 grid min-w-0 flex-1 gap-2.5">
                  <Image
                    src={s.img}
                    alt={s.imgAlt!}
                    sizes="(min-width: 900px) 560px, 92vw"
                    className="aspect-[16/10] h-auto w-full rounded-media object-cover"
                    style={{ objectPosition: s.imgPos }}
                  />
                  <figcaption className="text-[14px] text-fg-2">{s.cap}</figcaption>
                </figure>
              )}
            </div>
          ))}
        </div>
      </div>
      <div
        className="fixed top-24 right-(--gutter) z-2 hidden text-right text-[14px] text-fg-2 opacity-0 transition-opacity duration-300 group-[.pinned]:block group-[.in]:opacity-100"
        aria-hidden="true"
      >
        <b
          className="block font-display text-[44px] leading-none font-extrabold text-accent"
          ref={readAlt}
          dangerouslySetInnerHTML={{ __html: odometerHtml("3,940 ft") }}
        />
        <span ref={readName}>Raikot Bridge</span>
      </div>
    </section>
  );
}

/* Unpinned, every panel is a full-width list item; pinned, each gets its own width in the sideways track. */
const PANEL =
  "relative z-1 flex w-full max-w-[640px] flex-[0_0_auto] flex-col justify-center p-0 group-[.pinned]:max-w-none group-[.pinned]:px-[clamp(24px,3vw,48px)]";
