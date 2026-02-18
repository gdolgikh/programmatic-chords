-- Supabase schema for Chord Library user registration
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Saved Chords table
create table if not exists saved_chords (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  chord_slug text not null,
  chord_name text not null,
  created_at timestamptz default now() not null,
  unique(user_id, chord_slug)
);

-- 2. Saved Progressions table
create table if not exists saved_progressions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  settings jsonb not null default '{}',
  chords jsonb not null default '[]',
  voicings jsonb not null default '[]',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Indexes
create index if not exists idx_saved_chords_user_id on saved_chords(user_id);
create index if not exists idx_saved_progressions_user_id on saved_progressions(user_id);

-- 4. Enable Row Level Security
alter table saved_chords enable row level security;
alter table saved_progressions enable row level security;

-- 5. RLS Policies for saved_chords
create policy "Users can view their own saved chords"
  on saved_chords for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved chords"
  on saved_chords for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved chords"
  on saved_chords for delete
  using (auth.uid() = user_id);

-- 6. RLS Policies for saved_progressions
create policy "Users can view their own saved progressions"
  on saved_progressions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved progressions"
  on saved_progressions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saved progressions"
  on saved_progressions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own saved progressions"
  on saved_progressions for delete
  using (auth.uid() = user_id);

-- 7. Auto-update updated_at on saved_progressions
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger saved_progressions_updated_at
  before update on saved_progressions
  for each row
  execute function update_updated_at();
