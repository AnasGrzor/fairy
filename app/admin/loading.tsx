/* Shown straight away while bookings load over a slow connection. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-[820px] px-4 pb-16" aria-busy="true" aria-label="Loading bookings">
      <header className="flex items-center justify-between gap-4 pt-5 pb-3">
        <div>
          <h1 className="font-sans normal-case tracking-normal leading-tight font-semibold text-[24px]">Bookings</h1>
          <p className="text-[13px] text-fg-2">Fairy Meadows Comfort Lodges</p>
        </div>
      </header>
      <div className="sticky top-0 z-2 -mx-4 flex items-center justify-between gap-2 border-b border-line bg-bg px-4">
        <div className="flex min-w-0 gap-1">
          <span className="block bg-bg-3 animate-[admin-pulse_1.1s_ease-in-out_infinite_alternate] motion-reduce:animate-none mx-1.5 my-3.5 h-5 w-24 rounded-[6px]" />
          <span className="block bg-bg-3 animate-[admin-pulse_1.1s_ease-in-out_infinite_alternate] motion-reduce:animate-none mx-1.5 my-3.5 h-5 w-24 rounded-[6px]" />
          <span className="block bg-bg-3 animate-[admin-pulse_1.1s_ease-in-out_infinite_alternate] motion-reduce:animate-none mx-1.5 my-3.5 h-5 w-24 rounded-[6px]" />
        </div>
      </div>
      <ul className="m-0 list-none overflow-hidden rounded-[12px] border border-line bg-bg-2 p-0">
        {[0, 1, 2].map((i) => (
          <li key={i} className="grid gap-1.5 border-line p-4 not-first:border-t">
            <span className="block bg-bg-3 animate-[admin-pulse_1.1s_ease-in-out_infinite_alternate] motion-reduce:animate-none my-1 h-3.5 rounded-[6px]" style={{ width: "45%" }} />
            <span className="block bg-bg-3 animate-[admin-pulse_1.1s_ease-in-out_infinite_alternate] motion-reduce:animate-none my-1 h-3.5 rounded-[6px]" style={{ width: "70%" }} />
            <span className="block bg-bg-3 animate-[admin-pulse_1.1s_ease-in-out_infinite_alternate] motion-reduce:animate-none my-1 h-3.5 rounded-[6px]" style={{ width: "55%" }} />
            <span className="block bg-bg-3 animate-[admin-pulse_1.1s_ease-in-out_infinite_alternate] motion-reduce:animate-none mt-2 h-11 w-[120px] rounded-[999px]" />
          </li>
        ))}
      </ul>
    </main>
  );
}
