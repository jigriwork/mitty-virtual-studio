create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop function if exists public.handle_new_user_profile();
create function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case
      when new.id = 'a35c12a0-4d29-43d3-9dd1-1e83cf733452'::uuid
        or lower(coalesce(new.email, '')) = 'admin@gpbm.in'
      then 'owner'
      else 'staff'
    end
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, email, role)
values ('a35c12a0-4d29-43d3-9dd1-1e83cf733452', 'admin@gpbm.in', 'owner')
on conflict (id) do update
set email = excluded.email,
    role = 'owner';
