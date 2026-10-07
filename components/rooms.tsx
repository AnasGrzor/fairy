"use client";

import Image from "next/image";
import { useBooking } from "@/components/booking-context";
import { useScrollTo } from "@/components/smooth-scroll";
import { ROOMS, type RoomId } from "@/lib/data";
import { fmt } from "@/lib/util";

const SIZES: Record<string, string> = {
  "c-a": "(min-width: 900px) 58vw, 100vw",
  "c-b": "(min-width: 900px) 42vw, 100vw",
  "c-c": "(min-width: 900px) 42vw, 100vw",
  "c-d": "100vw",
};

/* Bento placement per room (lib/data.ts names the slot); every cell is one full-width tile below 900px. */
const SLOT: Record<string, string> = {
  "c-a": "col-span-7 row-span-2 min-h-[560px]",
  "c-b": "col-span-5 min-h-[250px]",
  "c-c": "col-span-5 min-h-[250px]",
  "c-d": "col-span-12 min-h-[320px]",
};

export function Rooms() {
  const { set } = useBooking();
  const { goTo } = useScrollTo();

  const pick = (id: RoomId) => {
    set({ room: id, pickedAt: Date.now() });
    goTo(document.getElementById("book")!);
  };

  return (
    <div className="grid auto-rows-[minmax(250px,auto)] grid-cols-12 gap-3.5">
      {ROOMS.map((r) => (
        <article
          key={r.id}
          className={`group relative isolate overflow-hidden rounded-media bg-bg-2 ${SLOT[r.cls]} after:absolute after:inset-0 after:-z-1 after:bg-[linear-gradient(180deg,transparent_35%,color-mix(in_oklch,var(--shade)_92%,transparent)_100%)] max-[900px]:col-span-12 max-[900px]:row-auto max-[900px]:min-h-[420px]`}
          data-reveal
        >
          <Image
            src={r.img}
            alt={r.alt}
            fill
            sizes={SIZES[r.cls]}
            className="absolute inset-0 -z-2 size-full object-cover transition-transform duration-[1.1s] ease-out-expo group-hover:scale-[1.045]"
            style={{ objectPosition: r.pos }}
          />
          <div className={`absolute inset-x-0 bottom-0 grid gap-1.5 p-[clamp(18px,2.2vw,28px)] text-on-photo ${r.cls === "c-d" ? "max-w-[560px]" : ""}`}>
            <h3 className="text-[clamp(30px,3vw,44px)]">{r.name}</h3>
            <p className="text-[15px] text-[color:color-mix(in_oklch,var(--on-photo)_82%,transparent)]">{r.specs}</p>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              <span className="tabular-nums font-display text-[28px] leading-none font-bold">
                Rs {fmt(r.pkr)}
                <small className="ml-1.5 font-sans text-[14px] font-normal text-inherit opacity-82">${r.usd} a night</small>
              </span>
              <button className="btn btn-lantern min-h-[42px] px-[18px] text-[14px]" type="button" onClick={() => pick(r.id)}>
                Choose
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
