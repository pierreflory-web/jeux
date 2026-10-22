-- Messages épinglés dans le fil des nouvelles du Saloon
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run
-- Un événement avec une date dans epingle_jusqu reste en tête du fil jusqu'à ce jour inclus.

alter table public.events add column if not exists epingle_jusqu text;

-- Exemple (message de Clara, jusqu'au 2 novembre 2026) :
-- insert into public.events (emoji, texte, epingle_jusqu)
-- values ('💌', E'Coucou, sachez qu''il y a un nouveau jeu sur votre lanceur !\nPS : si Riri et Zozo pouvaient m''envoyer un message. Merci !\n— Clara Flory', '2026-11-02');
