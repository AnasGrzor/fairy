/* Rolling-digit counter. Each digit is a vertical wheel (0-9 plus a repeated 0, so it wraps without a seam).
   Wheels chase their target digit in the direction the number is moving, with a speed cap: fast changes spin the
   low digits steadily instead of flickering, and every wheel settles on the right digit once the number stops. */

import { clamp, prefersReducedMotion } from "@/lib/util";

const TAU = 140; // ms, how quickly a wheel closes the gap
const MAX_SPEED = 0.028; // digits per ms
const STEP = 100 / 11; // one digit, as a % of the 11-cell strip

const esc = (ch: string) => (ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch);
const isDigit = (ch: string) => ch >= "0" && ch <= "9";
const toNum = (s: string) => Number(s.replace(/\D/g, "")) || 0;

/* Every cell is one line tall and top-aligned, so digits sit on the text baseline. The mask fades the wheel at its edges.
   "od" and "os" stay as hooks for readCell(). */
const CELL = "inline-block h-lh overflow-hidden align-top";
const digitHtml = (d: number) =>
  `<span class="od ${CELL} w-[1ch] text-center select-none [mask-image:linear-gradient(transparent_4%,#000_18%,#000_82%,transparent_96%)]" data-d="${d}"><span class="block *:block *:h-lh" style="transform:translateY(${-d * STEP}%)">${"01234567890"
    .split("")
    .map((c) => `<span>${c}</span>`)
    .join("")}</span></span>`;
const staticHtml = (ch: string) => `<span class="os ${CELL} whitespace-pre">${esc(ch)}</span>`;

/** Initial markup, so the server render already has the wheels in place. */
export const odometerHtml = (text: string) => [...text].map((ch) => (isDigit(ch) ? digitHtml(+ch) : staticHtml(ch))).join("");

type Cell =
  | { kind: "digit"; el: HTMLElement; strip: HTMLElement; d: number; p: number; t: number }
  | { kind: "static"; el: HTMLElement; ch: string };

const fromHtml = (html: string) => {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content.firstElementChild as HTMLElement;
};

function readCell(el: Element): Cell {
  const e = el as HTMLElement;
  if (e.classList.contains("od")) {
    const d = Number(e.dataset.d);
    return { kind: "digit", el: e, strip: e.firstElementChild as HTMLElement, d, p: d, t: d };
  }
  return { kind: "static", el: e, ch: e.textContent ?? "" };
}

const render = (c: Extract<Cell, { kind: "digit" }>) => {
  const m = ((c.p % 10) + 10) % 10;
  c.strip.style.transform = `translateY(${-m * STEP}%)`;
};

/** Takes over a root rendered with odometerHtml(). */
export function odometer(root: HTMLElement) {
  const instant = prefersReducedMotion();
  const cells: Cell[] = [...root.children].map(readCell);
  let prev = toNum(cells.map((c) => (c.kind === "digit" ? String(c.d) : c.ch)).join(""));
  let raf = 0, last = 0;

  function set(text: string) {
    const chars = [...text];
    const n = toNum(text), dir = Math.sign(n - prev);
    prev = n;

    /* Cells line up from the right, so a number gaining a digit keeps its existing wheels turning. */
    while (cells.length < chars.length) {
      const c = readCell(fromHtml(staticHtml("")));
      root.prepend(c.el);
      cells.unshift(c);
    }
    while (cells.length > chars.length) cells.shift()!.el.remove();

    chars.forEach((ch, i) => {
      const c = cells[i];
      if (isDigit(ch)) {
        const d = +ch;
        if (c.kind !== "digit") {
          const nc = readCell(fromHtml(digitHtml(d)));
          c.el.replaceWith(nc.el);
          cells[i] = nc;
          return;
        }
        if (d === c.d) return;
        const up = (d - c.d + 10) % 10, down = (c.d - d + 10) % 10;
        c.t += dir > 0 ? up : dir < 0 ? -down : up <= down ? up : -down;
        c.d = d;
        if (instant) { c.p = c.t; render(c); }
      } else if (c.kind !== "static" || c.ch !== ch) {
        const nc = readCell(fromHtml(staticHtml(ch)));
        c.el.replaceWith(nc.el);
        cells[i] = nc;
      }
    });

    if (!instant && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  }

  function tick(now: number) {
    const dt = Math.min(64, now - last);
    last = now;
    let moving = false;
    for (const c of cells) {
      if (c.kind !== "digit") continue;
      /* A wheel never trails by a full turn: whole turns are dropped, which looks identical. */
      let gap = c.t - c.p;
      if (Math.abs(gap) >= 10) c.p += 10 * Math.trunc(gap / 10);
      gap = c.t - c.p;
      if (Math.abs(gap) < 0.002) c.p = c.t;
      else {
        const max = MAX_SPEED * dt;
        c.p += clamp(gap * (1 - Math.exp(-dt / TAU)), -max, max);
        moving = true;
      }
      render(c);
    }
    raf = moving ? requestAnimationFrame(tick) : 0;
  }

  return { set, destroy: () => cancelAnimationFrame(raf) };
}
