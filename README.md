# Immunostrat

Immunostrat est un prototype web de strategie 2D inspire du systeme immunitaire.

La V6.5 consolide la campagne avec traitements simples, memoire immunitaire, vaccination optionnelle, sortie lymphatique locale et notes science/gameplay.

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

## Gameplay V4

- profils bacteriens data-driven ;
- cocci rapides de swarm ;
- bacilles proliferants ;
- bacteries resistantes avec armure ;
- colonies a biofilm ;
- bacteries toxiques optionnelles ;
- biofilm visible qui reduit les degats et ralentit legerement les unites immunitaires ;
- debris avec valeur antigenique selon le profil bacterien ;
- panneau de menaces detectees.

## Patch V4.1

- carte elargie et principaux points de mission mieux espaces ;
- ganglion replace en arriere de la ligne de front ;
- zones inflammatoires plus tactiques et moins couvrantes ;
- macrophage recentre sur tank/nettoyage/phagocytose courte ;
- neutrophile plus rapide, plus inflammatoire et limite dans le temps ;
- vagues espacees pour laisser le temps de collecter des antigenes ;
- biofilm ajuste pour rester genant sans bloquer le prototype.

## Patch V4.2

- clic gauche pour selectionner uniquement ;
- clic gauche + drag pour selectionner plusieurs unites immunitaires ;
- clic gauche sur le terrain pour donner un ordre de mouvement en formation ;
- clic gauche sur bacterie pour envoyer les unites combattantes vers la menace ;
- clic gauche sur debris pour ordonner une collecte par cellule dendritique ;
- clic gauche sur ganglion pour rappeler les dendritiques chargees ;
- clic droit + drag pour deplacer la camera ;
- clic droit simple sans ordre d'unite ;
- camera clavier avec WASD et ZQSD.

## Gameplay V5

- cellules civiles immobiles qui representent le tissu a proteger ;
- sante du tissu influencee par cellules detruites ou infectees ;
- virus libres data-driven ;
- infection de cellules civiles ;
- cellules infectees visibles qui produisent de nouveaux virus ;
- debris viraux collectables par les cellules dendritiques ;
- force immunitaire de depart pour agir immediatement ;
- couts de production un peu plus accessibles ;
- bouton `Signal antiviral` pour ralentir temporairement la propagation virale.

## Patch V5.1

- capacite `Interferons` avec zone de protection autour du tissu ;
- cellules civiles protegees temporairement contre la propagation virale ;
- production de cellules NK contre les cellules infectees ;
- recherche `Analyse virale` avec cout en antigenes ;
- lymphocytes T cytotoxiques debloques apres analyse virale ;
- T cytotoxiques puissants contre cellules infectees, peu utiles contre bacteries ;
- cellules infectees detruites qui exposent des antigenes viraux collectables ;
- HUD et rendu Phaser mis a jour pour NK, T cytotoxiques et analyse virale.

## Gameplay V6

- menu de campagne avec 8 missions progressives ;
- missions data-driven avec briefing, objectifs, ressources, unites et vagues propres ;
- deblocage progressif des macrophages, neutrophiles, dendritiques, plasmocytes, interferons, NK et T cytotoxiques ;
- progression sauvegardee en localStorage ;
- score simple et rang de mission ;
- ecran victoire/defaite avec objectifs, score, restart, retour missions et mission suivante ;
- scene Phaser generique chargee par `missionId`.

## Patch V6.5

- traitements simples data-driven : antibiotique, antiviral, anti-inflammatoire ;
- boutons de traitements seulement dans les missions qui les debloquent ;
- memoire immunitaire de campagne stockee dans la progression locale ;
- vaccination pre-mission optionnelle pour certaines missions virales ou mixtes ;
- sortie lymphatique locale pour les cellules dendritiques ;
- descriptions science vs gameplay dans `src/game/data/scienceGlossary.ts` ;
- documentation de consolidation dans `docs/v6-5-systems-roadmap.md`.

## Qualite

- `npm run test` teste la simulation pure avec Vitest.
- `npm run build` verifie TypeScript et genere le build Vite.

## Hors scope V6.5

Pas de vraie carte globale du corps, organes multiples, mode infini, champignons, parasites, cellules cancereuses, factions pathogenes jouables, arbre technologique complet, pixel art final ou polish visuel avance.
