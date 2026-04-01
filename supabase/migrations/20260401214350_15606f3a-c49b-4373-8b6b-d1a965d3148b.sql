
create table public.annotations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  verse_ids text[] not null,
  strokes jsonb not null,
  svg text,
  tags text[],
  folder text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.annotations enable row level security;

create policy "Users manage own annotations"
  on public.annotations for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
