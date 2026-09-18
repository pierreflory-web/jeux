-- Journal des exploits (fil des nouvelles du Saloon)
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run

create table public.events (
  id uuid primary key default gen_random_uuid(),
  emoji text not null default '⭐',
  texte text not null,
  created_at timestamptz not null default now()
);

-- Accès : lecture et création ouvertes à la clé publique
-- (cadre familial ; la clé service_role reste seule à pouvoir modifier ou supprimer)
alter table public.events enable row level security;

create policy "lecture publique"  on public.events for select using (true);
create policy "creation publique" on public.events for insert with check (true);
