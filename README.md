# Immunostrat

Immunostrat est un prototype web de strategie 2D inspire du systeme immunitaire.

La V3 ajoute debris pathogenes, antigenes, cellule dendritique, ganglion, recherche adaptative, plasmocytes et anticorps simples au prototype V2.

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

## Gameplay V2

- ressource cytokines ;
- jauge d'inflammation globale ;
- zones inflammatoires locales visibles ;
- production de neutrophiles avec cout ATP + cytokines ;
- cooldown de production des neutrophiles ;
- neutrophiles plus rapides et offensifs ;
- inflammation utile a niveau moyen, dangereuse a niveau eleve ;
- degats collateraux au tissu si l'inflammation devient excessive.

## Gameplay V3

- debris pathogenes apres mort bacterienne ;
- ressource antigenes obtenue via analyse ;
- cellule dendritique pour collecter les debris ;
- ganglion comme centre d'analyse ;
- recherche `Analyse bacterienne` ;
- plasmocytes debloques apres recherche ;
- attaques anticorps simples ;
- capacite speciale `Neutralisation massive`.

## Qualite

- `npm run test` teste la simulation pure avec Vitest.
- `npm run build` verifie TypeScript et genere le build Vite.

## Hors scope V3

Pas de medicaments, virus, cellules infectees, cellules NK, lymphocytes T, carte globale, mode infini, champignons, parasites, cellules cancereuses, factions pathogenes jouables, arbre technologique complet, pixel art final ou polish visuel avance.
