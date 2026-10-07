-- Bookings for Fairy Meadows Comfort Lodges.
--
-- Guests send a booking *request* from the website. Requests hold nothing.
-- Sami confirms a request in /admin, and confirm_booking() assigns a free physical room (a "unit").
-- The exclusion constraint on bookings makes it impossible for one unit to hold two confirmed stays
-- on the same night, even if two confirmations arrive at the same moment.
--
-- Every table has row level security on and no policies, so the public API keys can read or write nothing.
-- The website talks to these tables only from the server, with the secret key.

create extension if not exists btree_gist with schema extensions;

-- Room types. Prices live in the website code (lib/data.ts); each booking stores the total it was quoted.
create table public.rooms (
  id text primary key,
  name text not null,
  sort int not null default 0
);

-- Physical rooms. Add a row per extra room or tent of a type, or set active = false to take one out of service.
create table public.room_units (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms (id),
  label text not null,
  active boolean not null default true,
  unique (room_id, label)
);

create type public.booking_status as enum ('requested', 'confirmed', 'declined', 'cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('FM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  room_id text not null references public.rooms (id),
  unit_id uuid references public.room_units (id),
  check_in date not null,
  check_out date not null,
  guests int not null check (guests between 1 and 12),
  guest_name text not null check (length(guest_name) between 1 and 120),
  phone text not null check (length(phone) between 7 and 20),
  email text check (email is null or length(email) <= 200),
  quoted_total_pkr int not null check (quoted_total_pkr >= 0),
  status public.booking_status not null default 'requested',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stay_length check (check_out > check_in and check_out - check_in <= 30),
  constraint confirmed_has_unit check (status <> 'confirmed' or unit_id is not null),
  constraint no_double_booking exclude using gist (
    unit_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status = 'confirmed')
);

create index bookings_status_check_in on public.bookings (status, check_in);
create index bookings_room_stay on public.bookings (room_id, check_in, check_out);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger bookings_touch before update on public.bookings
for each row execute function public.touch_updated_at();

alter table public.rooms enable row level security;
alter table public.room_units enable row level security;
alter table public.bookings enable row level security;

-- Nights in [p_from, p_to) on which every active unit of a room type is taken by a confirmed stay.
-- A room type with no active units counts as fully booked.
create function public.fully_booked_nights(p_room text, p_from date, p_to date)
returns setof date
language sql stable set search_path = '' as $$
  with units as (
    select count(*) as n from public.room_units where room_id = p_room and active
  )
  select night::date
  from generate_series(p_from, p_to - 1, interval '1 day') as night, units
  where (
    select count(*) from public.bookings b
    where b.room_id = p_room
      and b.status = 'confirmed'
      and night::date >= b.check_in
      and night::date < b.check_out
  ) >= units.n
  order by 1;
$$;

-- Confirms a request and assigns the first free unit of its room type.
-- If another confirmation takes that unit at the same moment, the constraint rejects one of them
-- and this tries the next unit, so a busy moment never produces a double booking.
create function public.confirm_booking(p_id uuid)
returns public.bookings
language plpgsql set search_path = '' as $$
declare
  b public.bookings;
  v_unit uuid;
begin
  select * into b from public.bookings where id = p_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if b.status <> 'requested' then
    raise exception 'Only a requested booking can be confirmed (this one is %)', b.status using errcode = 'P0001';
  end if;

  for v_unit in
    select u.id from public.room_units u
    where u.room_id = b.room_id
      and u.active
      and not exists (
        select 1 from public.bookings x
        where x.unit_id = u.id
          and x.status = 'confirmed'
          and daterange(x.check_in, x.check_out, '[)') && daterange(b.check_in, b.check_out, '[)')
      )
    order by u.label
  loop
    begin
      update public.bookings set status = 'confirmed', unit_id = v_unit
      where id = p_id
      returning * into b;
      return b;
    exception when exclusion_violation then
      null; -- taken a moment ago; try the next unit
    end;
  end loop;

  raise exception 'No % is free for these nights', b.room_id using errcode = 'P0001';
end;
$$;

revoke all on function public.fully_booked_nights(text, date, date) from public, anon, authenticated;
revoke all on function public.confirm_booking(uuid) from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
grant execute on function public.fully_booked_nights(text, date, date) to service_role;
grant execute on function public.confirm_booking(uuid) to service_role;

insert into public.rooms (id, name, sort) values
  ('standard', 'Mountain View Standard', 1),
  ('deluxe', 'Panoramic Deluxe Suite', 2),
  ('tent', 'Alpine Camping Tent', 3),
  ('family', 'Family Heritage Lodge', 4);

-- One of each to start. Add rows in the Supabase table editor to match the real number of rooms and tents.
insert into public.room_units (room_id, label) values
  ('standard', 'Standard 1'),
  ('deluxe', 'Deluxe 1'),
  ('tent', 'Tent 1'),
  ('family', 'Family lodge 1');
