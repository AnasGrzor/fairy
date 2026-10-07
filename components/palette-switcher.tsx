"use client";

import { useEffect, useState } from "react";
import { PALETTES, type PaletteId } from "@/lib/data";
import { prefersReducedMotion } from "@/lib/util";

const KEY = "fm-palette";
const isPalette = (p: string | null): p is PaletteId => PALETTES.some((x) => x.id === p);

export function PaletteSwitcher() {
  const [current, setCurrent] = useState<PaletteId>("blue");

  /* The boot script in the layout already applied the saved palette; this syncs the buttons with it. */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (isPalette(saved)) setCurrent(saved);
    } catch {}
  }, []);

  function choose(p: PaletteId) {
    const apply = () => {
      const root = document.documentElement;
      if (p === "blue") root.removeAttribute("data-palette");
      else root.setAttribute("data-palette", p);
      setCurrent(p);
    };
    if (!prefersReducedMotion() && document.startViewTransition) document.startViewTransition(apply);
    else apply();
    try {
      localStorage.setItem(KEY, p);
    } catch {}
  }

  const name = PALETTES.find((x) => x.id === current)!.name;

  return (
    <div
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1.5 rounded-full bg-[color-mix(in_oklch,var(--bg-2)_88%,transparent)] py-1.5 pr-1.5 pl-4 text-fg [box-shadow:inset_0_0_0_1px_var(--line),0_8px_24px_-12px_color-mix(in_oklch,var(--shade)_70%,transparent)] backdrop-blur-[14px] max-[420px]:gap-0.5 max-[420px]:pl-3"
      role="group"
      aria-label="Colour palette"
    >
      <span className="min-w-[84px] text-[13px] font-semibold whitespace-nowrap max-[420px]:min-w-0 max-[420px]:text-[12px]" aria-live="polite">
        {name}
      </span>
      {PALETTES.map((p) => (
        <button
          key={p.id}
          className="group grid size-[34px] cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 transition-transform duration-200 ease-out-expo active:scale-[.94]"
          type="button"
          aria-label={p.name}
          aria-pressed={p.id === current}
          onClick={() => choose(p.id)}
        >
          <i
            className="block size-6 rounded-full [box-shadow:0_0_0_1px_color-mix(in_oklch,var(--fg)_25%,transparent)] group-aria-pressed:[box-shadow:0_0_0_2px_var(--bg-2),0_0_0_4px_var(--fg)]"
            style={{ background: `linear-gradient(135deg,${p.swatch[0]} 50%,${p.swatch[1]} 50%)` }}
          />
        </button>
      ))}
    </div>
  );
}
