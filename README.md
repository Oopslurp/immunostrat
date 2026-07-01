# Immunostrat

Immunostrat est un prototype web de strategie 2D inspire du systeme immunitaire.

La V9.1 ajoute des sous-types data-driven pour bacteries, virus, champignons,
parasites, cellules anormales et opportunistes, avec metadata science/gameplay
et hooks visuels pour preparer V11.

La V9.2 ferme la structure de partie normale : carte du corps gagnable,
defaite globale, score de stabilisation, ecran final et sauvegarde des resultats.

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
- `src/game/bodyMap` : carte strategique du corps, propagation, ganglions regionaux et sauvegarde globale.
- `src/game/infinite` : sauvegarde des records du mode infini.
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

## Gameplay V7

- mode `Carte du corps` debloque apres la mission 7 ;
- huit regions strategiques : peau, poumons, intestin, sang, ganglions lymphatiques, rate, moelle osseuse, foie ;
- statut par region : sante locale, infection, inflammation, menace et pathogenes ;
- graphe de propagation simple par tour strategique ;
- ganglions regionaux avec signaux antigeniques et bonus leger ;
- renforts globaux convertis en unites de depart dans les batailles locales ;
- resultat de bataille locale applique a la region et a la sante globale ;
- sauvegarde separee de la carte du corps en localStorage ;
- documentation V7 dans `docs/v7-body-map.md`.

## Patch V7.1

- separation claire des modes : campagne guidee, partie normale generee, mode infini reserve a V8 ;
- bouton `Nouvelle partie normale` avec difficulte facile, normale ou difficile ;
- generation controlee par seed : foyers initiaux, region malade, menace, pathogenes et preset local ;
- presets de batailles normales separes des missions de campagne ;
- presets regionaux : peau bacterienne, peau biofilm, poumons viraux, intestin bacilles, sang mixte, ganglion, rate, moelle ;
- resultats de bataille plus detailles transmis a la carte du corps ;
- signaux dendritiques/lymphatiques comptes pendant la bataille locale ;
- propagation influencee par infection, inflammation, sang, menace, difficulte, ganglion et dernier resultat ;
- historique court des evenements strategiques.

## Gameplay V8

- troisieme grand mode : `Mode infini` ;
- mode separe de la campagne et de la carte du corps ;
- difficulte `Normal`, `Difficile`, `Nightmare` ;
- bataille locale longue avec vagues virtuelles generees sans plafond fixe ;
- cycles de 3 vagues ;
- 8 phases : contamination simple, expansion bacterienne, resistance, infection virale, infection mixte, mutation, crise systemique, Nightmare ;
- mutateurs data-driven visibles dans le HUD ;
- effets simples de mutateurs : vitesse, resistance, replication virale, fatigue ressources, tissu fragile, inflammation dangereuse ;
- score infini base sur vague, cycle, tissu, cellules, inflammation et antigenes ;
- meilleurs scores sauvegardes par difficulte en localStorage ;
- limites de performance sur les pathogenes actifs ;
- hooks devenus la base des menaces avancees V9.

## Gameplay V9

- nouvelles familles de menaces data-driven : champignons, spores, parasite mini-boss, cellules anormales, opportunistes ;
- entite de simulation `advancedThreat` separee du rendu Phaser ;
- champignons lents qui produisent des spores ;
- parasite rare, robuste et inflammatoire ;
- cellules anormales peu visibles, mieux gerees par NK et T cytotoxiques ;
- opportunistes qui servent de pression secondaire dans les crises mixtes ;
- cinq nouveaux presets de batailles locales pour la carte du corps ;
- generation de foyers V9 selon la difficulte de la partie normale ;
- mode infini enrichi avec menaces V9 et mutateur `Menaces avancees` ;
- entrees science vs gameplay pour expliquer les simplifications.

## Patch V9.1

- sous-types explicites par menace : `subtype`, inspiration, role gameplay, note de simplification ;
- virus supplementaires : cytolytique, latent/reactivation, immuno-evasif ;
- champignons supplementaires : levure opportuniste, moisissure a spores, champignon cutane lent ;
- parasites supplementaires : protozoaire sanguin et larve migratrice ;
- cellules anormales : discrete, proliferative, inflammatoire, invasive ;
- opportunistes : bacterie secondaire, flare fongique, reactivation virale, infection mixte opportuniste ;
- `visualIdentity` pour preparer silhouettes, couleurs, mouvements et VFX V11 sans creer les sprites finaux ;
- carte du corps enrichie avec pools regionaux plus varies ;
- mode infini mis a jour pour introduire les sous-types progressivement ;
- score bonus data-driven via `scoreValue` pour les menaces rares eliminees.

## Patch V9.2

- clarification des trois modes : campagne guidee, partie normale finie, mode infini ;
- ecran d'entree pour la partie normale, avec difficulte et meilleurs resultats ;
- victoire globale de la carte du corps apres plusieurs tours de stabilisation ;
- defaite globale par effondrement de sante, infection, inflammation ou regions critiques ;
- progression de stabilisation visible dans l'UI de carte du corps ;
- ecran final separe pour victoire/defaite de partie normale ;
- score et rang de stabilisation distincts du score infini ;
- sauvegarde locale des meilleurs resultats de partie normale ;
- blocage des actions incoherentes quand une partie normale est terminee.

## Qualite

- `npm run test` teste la simulation pure avec Vitest.
- `npm run build` verifie TypeScript et genere le build Vite.

## Hors scope V9.1

Pas de factions pathogenes jouables, arbre strategique pathogene, multijoueur,
boss complexe final, antifongique dedie, immunologie antiparasitaire avancee,
oncologie realiste, pixel art final, animations finales ou polish visuel avance.
