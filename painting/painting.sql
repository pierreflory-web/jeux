-- Painting Further Away : progression de chaque joueur (missions, avatar choisi, niveau)
-- pour la retrouver sur tous ses appareils.
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run

alter table public.players add column if not exists painting jsonb;
