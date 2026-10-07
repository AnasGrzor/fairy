import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Bookings · Fairy Meadows",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  /* .admin (admin.css) is the light/dark token scope; everything else is utilities. */
  return (
    <div className="admin min-h-screen supports-[min-height:100dvh]:min-h-dvh bg-bg font-sans text-[15px] leading-normal text-fg [&_:focus-visible]:outline-accent-deep [&_:focus-visible]:outline-offset-2">
      {children}
    </div>
  );
}
