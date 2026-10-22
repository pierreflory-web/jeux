# Painting Further Away

Jeu de peinture du lanceur **Mes Jeux** : ta tache suit la souris (ou ton doigt).
Sors de ta zone, dessine une boucle et reviens : tout l'intérieur se repeint à tes couleurs.
Le but : repeindre tout le terrain.

Jouable sur https://pierreflory-web.github.io/jeux/painting/ (dossier `painting/` du dépôt `jeux`, comme Ma Ville)

## Règles

- Diriger : souris ou doigt (au doigt, l'avatar vise un peu au-dessus pour rester visible). L'avatar va là où est la souris et s'arrête quand elle s'arrête.
- 3 niveaux à choisir sur l'accueil : Facile (3 adversaires lents), Normal (4), Difficile (4 adversaires rapides qui chassent ta trace).
- Hors de ta zone, tu laisses une trace. Rentrer chez toi transforme la boucle en terrain.
- Si un adversaire passe sur ta trace, tu perds. Passe sur la sienne et tu l'effaces.
- Si tu repasses sur ta propre trace, tu perds aussi (les adversaires aussi).
- Si ta zone est entièrement recouverte, tu perds aussi.
- Si tu effaces tous tes adversaires, tu as gagné aussi : le terrain se repeint à tes couleurs.
- À 95 % du terrain, le dernier coup de pinceau repeint tout le reste : **victoire**,
  puis retour automatique à l'accueil.

## Ambiance

Compte à rebours « 3, 2, 1, Peins ! », petite musique jouée par le navigateur (bouton 🎵 pour la couper).

## Avatars

35 avatars en 5 familles (Couleurs, Animaux, Véhicules, Aliments, Rigolos). Chacun a sa
peinture et sa trace. 5 sont ouverts au départ, les autres se débloquent avec des missions
(gagner, effacer des adversaires, atteindre un % du terrain…). Les statistiques sont gardées
dans le navigateur (`localStorage`, clé `painting_stats_<id joueur>`) et, pour un joueur connecté,
dans la colonne `painting` de la table `players` (script `painting.sql`, à exécuter une fois) :
la progression, l'avatar choisi et le niveau suivent le joueur sur tous ses appareils.

## Intégration au lanceur

- Charge `https://pierreflory-web.github.io/jeux/points.js` et appelle
  `MesJeux.award('painting', lignes, { secs, score })` à la victoire.
- Lignes du barème : « Terrain entièrement repeint » (30), « N adversaires effacés » (5 chacun),
  « Victoire en moins de 2 minutes » (10), « Tous les adversaires effacés » (10), « Victoire en niveau difficile » (10).

## Structure

- `index.html` — tout le jeu (grille 100 × 60, canvas).
- `manifest.webmanifest` + `icons/` + `sw.js` — PWA installable.
