
-- SPV Training — schéma initial Supabase
-- À exécuter dans Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.training_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  category text not null default 'Séance générale',
  title text not null,
  duration_minutes integer,
  distance_km numeric(7,2),
  notes text,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null,
  category text not null default 'Préparation physique',
  status text not null default 'À faire',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.test_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_key text not null,
  test_label text not null,
  value numeric(10,2) not null,
  unit text not null,
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.recovery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  energy integer not null check (energy between 1 and 5),
  fatigue integer not null check (fatigue between 1 and 5),
  soreness text,
  pain text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.training_entries enable row level security;
alter table public.plans enable row level security;
alter table public.test_results enable row level security;
alter table public.recovery_logs enable row level security;

do $$ declare t text; begin
  foreach t in array array['training_entries','plans','test_results','recovery_logs'] loop
    execute format('drop policy if exists "Users manage own %1$s" on public.%1$I', t);
    execute format('create policy "Users manage own %1$s" on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
