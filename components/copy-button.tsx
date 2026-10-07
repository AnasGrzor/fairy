"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

/* Copies text and shows a tick for a moment. onFail runs when the clipboard is blocked, so the caller can offer the text to select by hand. */
export function CopyButton({ text, className, label, ariaLabel, onFail }: {
  text: string;
  className?: string;
  label?: string;
  ariaLabel?: string;
  onFail?: () => void;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1600);
    } catch {
      onFail?.();
    }
  }

  return (
    <button className={className} type="button" aria-label={ariaLabel} onClick={copy}>
      <Icon name={done ? "check" : "copy"} />
      {label && <span>{done ? "Copied" : label}</span>}
    </button>
  );
}
