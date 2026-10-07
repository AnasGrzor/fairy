"use client";

import { useEffect, useState } from "react";

/* Sits transparent over the hero, turns solid once the hero has scrolled away. */
export function Nav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const io = new IntersectionObserver(([en]) => setSolid(!en.isIntersecting), { rootMargin: "-80px 0px 0px 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const faint = solid ? "text-fg-2" : "text-[color:color-mix(in_oklch,var(--on-photo)_80%,transparent)]";
  const link = `text-[14px] font-medium no-underline transition-colors duration-200 ${faint} ${solid ? "hover:text-fg" : "hover:text-on-photo"}`;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-(--z-nav) px-(--gutter) pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 transition-[background-color,box-shadow] duration-350 ${
        solid
          ? "bg-[color-mix(in_oklch,var(--bg)_84%,transparent)] backdrop-blur-[14px] [box-shadow:0_1px_0_var(--line)]"
          : "text-on-photo"
      }`}
      aria-label="Main"
    >
      <div className="mx-auto flex h-12 max-w-[1320px] items-center justify-between gap-5">
        <a className="flex flex-col leading-none no-underline" href="#top">
          <b className="font-display text-[24px] font-extrabold tracking-[.01em] uppercase">Fairy Meadows</b>
          <span className={`mt-[3px] text-[12px] ${faint}`}>Comfort Lodges</span>
        </a>
        <div className="flex gap-7 max-[880px]:hidden">
          <a className={link} href="#climb">Getting here</a>
          <a className={link} href="#rooms">Rooms</a>
          <a className={link} href="#trek">Trek</a>
          <a className={link} href="#questions">Questions</a>
        </div>
        <a className="btn btn-lantern min-h-[42px] px-[18px] text-[14px]" href="#book">
          Check dates
        </a>
      </div>
    </nav>
  );
}
