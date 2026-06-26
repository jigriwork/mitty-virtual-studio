create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  generation_type text not null check (generation_type in ('title_description', 'full_product_images', 'regenerate_image')),
  category text,
  product_title text,
  requested_images integer not null default 0 check (requested_images >= 0),
  successful_images integer not null default 0 check (successful_images >= 0),
  failed_images integer not null default 0 check (failed_images >= 0),
  estimated_image_cost_inr numeric,
  estimated_text_cost_inr numeric,
  estimated_total_cost_inr numeric,
  model text,
  provider text not null default 'gemini',
  status text not null check (status in ('success', 'partial_success', 'failed')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_logs enable row level security;

create index if not exists ai_usage_logs_created_at_idx
on public.ai_usage_logs (created_at desc);

create index if not exists ai_usage_logs_user_id_created_at_idx
on public.ai_usage_logs (user_id, created_at desc);

create index if not exists ai_usage_logs_generation_type_created_at_idx
on public.ai_usage_logs (generation_type, created_at desc);

drop policy if exists "Users can insert their own AI usage logs" on public.ai_usage_logs;
create policy "Users can insert their own AI usage logs"
on public.ai_usage_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can read their own AI usage logs" on public.ai_usage_logs;
create policy "Users can read their own AI usage logs"
on public.ai_usage_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Owners can read all AI usage logs" on public.ai_usage_logs;
create policy "Owners can read all AI usage logs"
on public.ai_usage_logs
for select
to authenticated
using (public.is_mitty_owner());
