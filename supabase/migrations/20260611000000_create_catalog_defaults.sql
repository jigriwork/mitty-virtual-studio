create table if not exists public.catalog_defaults (
  id text primary key default 'global' check (id = 'global'),
  gst_percent text,
  pickup_address_code text,
  return_exchange_condition text,
  shirt_hsn_code text,
  trouser_hsn_code text,
  jeans_hsn_code text,
  shoes_hsn_code text,
  perfume_hsn_code text,
  shirt_size_chart_url text,
  trouser_size_chart_url text,
  jeans_size_chart_url text,
  shoes_size_chart_url text,
  perfume_size_chart_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.catalog_defaults enable row level security;

create or replace function public.set_catalog_defaults_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_catalog_defaults_updated_at on public.catalog_defaults;
create trigger set_catalog_defaults_updated_at
before update on public.catalog_defaults
for each row execute function public.set_catalog_defaults_updated_at();

create or replace function public.is_mitty_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.uid() = 'a35c12a0-4d29-43d3-9dd1-1e83cf733452'::uuid
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'admin@gpbm.in'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'owner'
    ),
    false
  );
$$;

drop policy if exists "Authenticated users can read catalog defaults" on public.catalog_defaults;
create policy "Authenticated users can read catalog defaults"
on public.catalog_defaults
for select
to authenticated
using (true);

drop policy if exists "Owners can insert catalog defaults" on public.catalog_defaults;
create policy "Owners can insert catalog defaults"
on public.catalog_defaults
for insert
to authenticated
with check (public.is_mitty_owner());

drop policy if exists "Owners can update catalog defaults" on public.catalog_defaults;
create policy "Owners can update catalog defaults"
on public.catalog_defaults
for update
to authenticated
using (public.is_mitty_owner())
with check (public.is_mitty_owner());
