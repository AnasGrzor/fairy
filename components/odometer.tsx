"use client";

import { useEffect, useRef, useState } from "react";
import { odometer, odometerHtml } from "@/lib/odometer";

/* React wrapper for values that change on re-render. Screen readers get the plain text; the wheels are hidden from them. */
export function Odometer({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const api = useRef<ReturnType<typeof odometer>>(null);
  const [initial] = useState(text);

  useEffect(() => {
    api.current = odometer(ref.current!);
    return () => api.current?.destroy();
  }, []);
  useEffect(() => api.current?.set(text), [text]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" dangerouslySetInnerHTML={{ __html: odometerHtml(initial) }} />
    </span>
  );
}
