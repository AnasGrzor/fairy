"use client";

import Lenis from "lenis";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/util";

type GoTo = (el: HTMLElement) => void;
const ScrollCtx = createContext<{ goTo: GoTo; smooth: () => boolean }>({
  goTo: (el) => el.scrollIntoView({ block: "start" }),
  smooth: () => false,
});

export const useScrollTo = () => useContext(ScrollCtx);

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const l = new Lenis({ lerp: 0.09, smoothWheel: true, autoRaf: true });
    lenis.current = l;
    return () => {
      l.destroy();
      lenis.current = null;
    };
  }, []);

  const goTo = useCallback<GoTo>((el) => {
    if (lenis.current) lenis.current.scrollTo(el, { duration: 1.5 });
    else el.scrollIntoView({ block: "start" });
  }, []);
  const smooth = useCallback(() => !!lenis.current, []);

  /* In-page links glide instead of jumping. */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a[href^="#"]');
      const href = a?.getAttribute("href");
      if (!href || href.length < 2) return;
      const el = document.getElementById(href.slice(1));
      if (!el) return;
      e.preventDefault();
      goTo(el);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [goTo]);

  return <ScrollCtx.Provider value={{ goTo, smooth }}>{children}</ScrollCtx.Provider>;
}
