import { signOut } from "@/app/admin/actions";
import { BookingBoard } from "@/components/admin/booking-board";
import { karachiToday } from "@/lib/booking-rules";
import { adminClient, type BookingRow } from "@/lib/supabase/admin";
import { bookingsConfigured } from "@/lib/supabase/env";
import { requireAdmin } from "@/lib/supabase/server";

const SELECT = "*, room_units(label)";

export default async function AdminPage() {
  const user = await requireAdmin();
  if (!bookingsConfigured()) {
    return <Shell email={user.email}><Problem text="SUPABASE_SECRET_KEY is missing, so bookings can't be read." /></Shell>;
  }

  const db = adminClient();
  const today = karachiToday();
  const [open, closed, units] = await Promise.all([
    db.from("bookings").select(SELECT).in("status", ["requested", "confirmed"]).gte("check_out", today).order("check_in"),
    db
      .from("bookings")
      .select(SELECT)
      .or(`status.in.(declined,cancelled),check_out.lt.${today}`)
      .order("updated_at", { ascending: false })
      .limit(30),
    db.from("room_units").select("room_id").eq("active", true),
  ]);
  const err = open.error ?? closed.error ?? units.error;
  if (err) return <Shell email={user.email}><Problem text={`Couldn't load bookings: ${err.message}`} /></Shell>;

  const unitCount: Record<string, number> = {};
  for (const u of units.data ?? []) unitCount[u.room_id] = (unitCount[u.room_id] ?? 0) + 1;

  return (
    <Shell email={user.email}>
      <BookingBoard
        rows={[...(open.data ?? []), ...(closed.data ?? [])] as BookingRow[]}
        units={unitCount}
        today={today}
        loadedAt={new Date().toISOString()}
      />
    </Shell>
  );
}

function Shell({ email, children }: { email?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[820px] px-4 pb-16">
      <header className="flex items-center justify-between gap-4 pt-5 pb-3">
        <div>
          <h1 className="font-sans normal-case tracking-normal leading-tight font-semibold text-[24px]">Bookings</h1>
          <p className="text-[13px] text-fg-2">Fairy Meadows Comfort Lodges</p>
        </div>
        <form action={signOut} className="flex min-w-0 items-center gap-3 text-[13px] text-fg-2">
          <span title={email} className="max-w-[28vw] overflow-hidden text-ellipsis whitespace-nowrap max-[520px]:hidden">{email}</span>
          <button className="cursor-pointer px-0.5 py-2.5 font-semibold text-fg underline underline-offset-3">Sign out</button>
        </form>
      </header>
      {children}
    </main>
  );
}

function Problem({ text }: { text: string }) {
  return (
    <div className="rounded-[12px] border border-line bg-bg-2 px-5 py-8">
      <h3 className="font-sans normal-case tracking-normal leading-tight font-semibold text-[17px]">Bookings can&apos;t be shown</h3>
      <p className="mt-1.5 max-w-[60ch] text-fg-2">{text}</p>
    </div>
  );
}
