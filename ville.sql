-- Ma Ville : la ville de chaque joueur et ce que les jeux lui envoient
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run

alter table public.players add column if not exists ville jsonb;
alter table public.players add column if not exists ville_gains jsonb not null default '[]';
