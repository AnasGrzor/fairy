"use client";

import { animate, stagger } from "motion";
import { useEffect } from "react";
import { EASE, prefersReducedMotion } from "@/lib/util";

/* Content is visible by default; motion only adds an entrance to [data-reveal] elements that start below the fold. */
export function Reveal() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        if (!vis.length) return;
        vis.forEach((el) => io.unobserve(el));
        animate(vis, { opacity: [0, 1], transform: ["translateY(32px)", "none"] }, { duration: 0.9, delay: stagger(0.08), ease: EASE });
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return null;
}
