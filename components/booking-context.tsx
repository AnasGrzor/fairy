"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { RoomId } from "@/lib/data";
import { addDays, defaultCheckIn } from "@/lib/util";

export type Currency = "pkr" | "usd";

export type BookingState = {
  room: RoomId;
  guests: number;
  cin: string;
  cout: string;
  cur: Currency;
  name: string;
  phone: string;
  email: string;
  /** Bumped when a room is picked from outside the form, so the form can pulse that option. */
  pickedAt: number;
  /** False while the dates are the automatic default, so they can move to the first free stay. */
  datesChosen: boolean;
};

type Ctx = {
  st: BookingState;
  set: (patch: Partial<BookingState>) => void;
};

const BookingCtx = createContext<Ctx | null>(null);

export function useBooking() {
  const c = useContext(BookingCtx);
  if (!c) throw new Error("useBooking needs <BookingProvider>");
  return c;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [st, setSt] = useState<BookingState>({
    room: "standard",
    guests: 2,
    cin: "",
    cout: "",
    cur: "pkr",
    name: "",
    phone: "",
    email: "",
    pickedAt: 0,
    datesChosen: false,
  });

  /* Default dates depend on today, so they are filled in on the client only. */
  useEffect(() => {
    const cin = defaultCheckIn();
    setSt((s) => (s.cin ? s : { ...s, cin, cout: addDays(cin, 2) }));
  }, []);

  const set = (patch: Partial<BookingState>) => setSt((s) => ({ ...s, ...patch }));

  return <BookingCtx.Provider value={{ st, set }}>{children}</BookingCtx.Provider>;
}
