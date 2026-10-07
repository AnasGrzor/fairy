# Fairy Meadows Comfort Lodges

The website for the lodges, built with Next.js 16 (App Router, Turbopack) and Supabase. Guests send booking requests from the site; Sami confirms or declines them at `/admin`.

## Run it

```sh
pnpm install
cp .env.example .env.local   # fill in the Supabase keys
pnpm dev                     # http://localhost:3000
pnpm build
pnpm typecheck
```

Without Supabase keys the site still works: the booking form says online booking is off and points guests to WhatsApp.

## Bookings

### How it works

1. A guest picks dates in the calendar, fills in the form and presses **Request booking**. The calendar crosses out nights that are already booked for the chosen room, along with past days and the closed season (November to March), and a stay can't run across a booked night. The server checks the dates, season, guest count and phone number, then checks that the room type isn't fully booked on those nights.
2. The request is saved with status `requested` and a reference like `FM-7K3Q2A`. The guest sees the reference and can also message Sami on WhatsApp with it.
3. Sami opens `/admin`, signs in, and presses **Confirm** or **Decline**. Confirming assigns a free physical room of that type. A **WhatsApp** button on each booking opens a chat with the guest, with the message already written.
4. Confirmed nights show as booked in the calendar, and the server refuses new requests for them. Declining or cancelling frees them again.

Requests hold no rooms. Only confirmed stays block nights. A database rule (`no_double_booking`) makes it impossible to confirm two stays in the same room on the same night, even if two confirmations happen at once.

### Set up Supabase

1. Create a project at [supabase.com](https://supabase.com). Pick the Mumbai or Singapore region; both are close to Pakistan.
2. Apply the schema. Either paste `supabase/migrations/20261006120000_bookings.sql` into the SQL editor and run it, or:
   ```sh
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Set the number of rooms. The migration creates one room of each type. In **Table editor > room_units**, add a row for every extra room or tent (for example `tent` / `Tent 2`). Set `active` to false to take one out of service.
4. In **Authentication > Sign In / Providers**, turn off **Allow new users to sign up** and leave the **Email** provider on (turning it off blocks sign-in too).
5. Create Sami's login, either in **Authentication > Users > Add user** or with `node --env-file=.env.local scripts/create-admin.mjs sami@example.com 'a-long-password'`. The script also resets a forgotten password.
6. Copy `.env.example` to `.env.local` and fill in the URL, the publishable key, the secret key, and `ADMIN_EMAILS` (Sami's email). Add the same variables in Vercel.

### Local development

```sh
npx supabase start -x realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor,studio,postgres-meta,mailpit
npx supabase status -o env   # URL and keys for .env.local
node --env-file=.env.local scripts/create-admin.mjs admin@fairymeadows.test a-long-password
```

The local stack uses ports 55320-55329 (`supabase/config.toml`), so it can run next to another Supabase project on the default 54321. The `-x` list skips services this site doesn't use; drop `studio,postgres-meta` from it to get the table editor at http://127.0.0.1:55323. `npx supabase db reset` rebuilds the database from the migrations.

### Optional: email alerts

Set `RESEND_API_KEY` and `BOOKING_NOTIFY_EMAIL` to get an email for each new request. To send to any address, verify a domain in Resend and set `BOOKING_FROM_EMAIL` to an address on it.

### Security

- Every table has row level security on with no policies, so the publishable key can read or change nothing.
- The site reads and writes bookings only on the server, with the secret key. The availability endpoint returns booked dates only, never guest details.
- `/admin` needs a Supabase login whose email is in `ADMIN_EMAILS`. Every admin action checks this again on the server.

## Where things live

- `app/page.tsx` has the page layout and static sections (trek, reviews, questions, footer).
- Styling is Tailwind CSS v4 utility classes in the components. `app/globals.css` imports Tailwind, maps the theme (`bg-bg`, `text-fg-2`, `bg-accent`, `rounded-media`, `font-display`…) onto CSS variables, and defines the `btn`, `btn-lantern` and `btn-line` button utilities.
- `app/styles/base.css` holds those CSS variables: the default palette, the other four palettes (`:root[data-palette=...]`) and element defaults. `app/admin/admin.css` is the admin's own light/dark variable scope.
- Never name a class with an `ad-` prefix: ad blockers hide such elements.
- `lib/data.ts` has rooms, prices, route stages, contacts, FAQ and the WhatsApp number. Prices for bookings come from here.
- `lib/booking-rules.ts` has the stay rules shared by the form and the server.
- `components/stay-calendar.tsx` is the date picker with booked nights.
- `app/actions/booking.ts` saves a request. `app/api/availability/route.ts` lists booked nights.
- `app/admin/` is the bookings dashboard and sign-in. `proxy.ts` keeps the admin session fresh.
- `supabase/migrations/` has the database schema.
- `components/` has the interactive parts. They share booking state through `booking-context.tsx`.
- `images/` holds the photos. Next serves them as resized AVIF or WebP.

## Before launch

- Pick one palette and remove `<PaletteSwitcher />` from `app/page.tsx`. The boot script in `app/layout.tsx` still applies a saved palette, so set the chosen one as the `:root` default.
- Set `NEXT_PUBLIC_SITE_URL` if the domain is not `fairymeadowscomfortlodges.com`. Link previews use it to build the image URL.
