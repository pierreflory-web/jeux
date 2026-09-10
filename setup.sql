-- Table des joueurs du lanceur « Mes Jeux »
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run

create table public.players (
  id uuid primary key default gen_random_uuid(),
  pseudo text not null,
  avatar text not null default '🙂',
  pin_hash text not null,
  question text not null default '',
  answer_hash text not null default '',
  points integer not null default 0,
  wins jsonb not null default '{}',
  coins integer not null default 0,
  days integer not null default 0,
  last_day text not null default '',
  avatars jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Pseudo unique sans tenir compte des majuscules
create unique index players_pseudo_lower_idx on public.players (lower(pseudo));

-- Accès : lecture, création et mise à jour ouvertes à la clé publique
-- (cadre familial ; la clé service_role reste seule à pouvoir supprimer)
alter table public.players enable row level security;

create policy "lecture publique"      on public.players for select using (true);
create policy "creation publique"     on public.players for insert with check (true);
create policy "mise a jour publique"  on public.players for update using (true) with check (true);
