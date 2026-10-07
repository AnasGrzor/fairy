"use client";

import { useRef } from "react";
import { CopyButton } from "@/components/copy-button";

export function Contact({ label, value, copy, aria }: { label: string; value: string; copy: string; aria: string }) {
  const valueRef = useRef<HTMLSpanElement>(null);

  /* Clipboard blocked: select the text so a long-press or Ctrl+C still works. */
  const selectValue = () => {
    if (!valueRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(valueRef.current);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  return (
    <div className="flex items-center gap-3 rounded-full bg-bg-2 py-2 pr-2 pl-4 [box-shadow:inset_0_0_0_1px_var(--line)]">
      <div>
        <small className="block text-[12px] leading-[1.2] text-fg-2">{label}</small>
        <span className="text-[15px] leading-[1.3] font-medium select-all" ref={valueRef}>{value}</span>
      </div>
      <CopyButton
        className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-bg-3"
        text={copy}
        ariaLabel={aria}
        onFail={selectValue}
      />
    </div>
  );
}
