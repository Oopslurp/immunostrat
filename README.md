# Immunostrat

Immunostrat est un prototype web de strategie 2D inspire du systeme immunitaire.

La V1 ajoute un premier gameplay jouable : une plaie cutanee envahie par des bacteries, defendue avec des macrophages produits par le joueur.

## Stack

- Vite
- React
- TypeScript
- Phaser
- CSS simple
- Vitest

## Commandes

```bash
npm install
npm run dev
npm run build
npm run test
```

Pour eviter un port deja utilise :

```bash
npm run dev -- --port 5175
```

## Architecture

- `src/app` : shell React et navigation simple.
- `src/pages` : page d'accueil et page jeu.
- `src/ui` : petits composants React hors-jeu.
- `src/game/phaser` : creation de Phaser, configuration, scenes, rendu et input.
- `src/game/simulation` : logique du jeu independante de Phaser.
- `src/game/data` : definitions de mission, unites, pathogenes et balance.
- `src/game/types` : types partages.
- `src/game/content` : futurs textes scientifiques ou tutoriels.

## Gameplay V1

- sante du tissu ;
- ressource ATP avec regeneration passive ;
- production de macrophages ;
- selection et deplacement d'un macrophage ;
- selection de plusieurs macrophages au rectangle ;
- mouvement autonome lent des macrophages sans ordre ;
- vagues de bacteries ;
- combat automatique a courte portee ;
- victoire si toutes les vagues sont eliminees ;
- defaite si la sante du tissu tombe a 0.

## Qualite

- `npm run test` teste la simulation pure avec Vitest.
- `npm run build` verifie TypeScript et genere le build Vite.

## Hors scope V1

Pas d'inflammation, cytokines, neutrophiles, antigenes, cellule dendritique, virus, carte globale, mode infini, assets externes, pixel art final ou polish visuel avance.
