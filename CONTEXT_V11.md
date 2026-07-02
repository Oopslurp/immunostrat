# CONTEXT V11 - Immunostrat

Ce fichier sert de passage de relais pour Claude Code / Fable 5 avant de commencer la V11.

Objectif principal : V11 doit polir le jeu, pas reinventer son gameplay.

## 1. Resume du projet

Immunostrat est un jeu web de strategie 2D, entre RTS semi-guide et tower defense, inspire du systeme immunitaire.

Le joueur controle des cellules immunitaires pour defendre des tissus biologiques contre des pathogenes : bacteries, virus, champignons, parasites, cellules anormales, infections mixtes. Le projet vise un rendu portfolio serieux mais jouable, environ 70% ludique et 30% scientifiquement inspire.

Technologies :

- Vite
- React
- TypeScript
- Phaser 3
- Vitest
- CSS simple
- Pas de backend
- Pas de base de donnees
- Sauvegardes via localStorage

Modes existants :

- Campagne : 8 missions progressives.
- Partie normale : carte du corps avec batailles locales regionales.
- Mode infini : grande carte tactique, vagues, score, phases et mutateurs.

## 2. Roadmap actuelle

Etat suppose atteint :

- V0 : fondation Vite / React / TypeScript / Phaser.
- V1 : prototype bacterien jouable.
- V2 : cytokines, inflammation, neutrophiles.
- V3 : antigenes, dendritiques, ganglion, reponse adaptative.
- V4 : varietes bacteriennes, colonies, biofilm.
- V5 : virus, cellules civiles, cellules infectees, interferences/interferons, NK, T cytotoxiques.
- V6 : campagne et missions progressives.
- V6.5 : consolidation pre-campagne.
- V7 : carte globale du corps.
- V8 : mode infini.
- V9 : menaces avancees.
- V9.5.1 : structures/templates de cartes biologiques.
- V9.5.1.1 : grand canvas, grand monde Phaser, camera RTS.
- V9.5.2 : generation seed des cartes.
- V9.5.3 : equilibrage grandes cartes.
- V9.5.4A : audit Claude Code.
- V9.5.4B : corrections post-audit.

Dernier etat connu apres V9.5.4B :

- Build OK.
- Tests OK : 109 tests.
- TypeScript OK avec `npx tsc --noEmit`.
- Pas de script lint dans `package.json`.
- L'audit `AUDIT_V9.5.4.md` existe a la racine mais n'est pas suivi par Git.
- Le backup zip du projet existe dans `backups/`, a ignorer pour le developpement.

Objectif V11 :

- V11.0 : asset guide / direction artistique.
- V11.1 : polish HUD / UI.
- V11.2 : carte biologique pixel-art.
- V11.3 : unites, pathogenes, sprites, animations.
- V11.4 : effets visuels, feedback, particules.
- V11.5 : sons, menus, ecrans finaux, polish complet.

## 3. Architecture generale

Le projet est organise pour separer :

- React : pages, menus, HUD, navigation entre modes.
- Phaser : rendu canvas, camera, input souris/clavier, scene de mission.
- Simulation : logique pure du jeu, etat, systemes, combat, ressources, vagues.
- Data : missions, unites, pathogenes, cartes, balance, traitements.
- Sauvegardes : localStorage, normalisation et versionnement.

Structure principale :

- `src/App.tsx` : routeur React maison, flux global des modes, campagne, carte du corps, infini.
- `src/pages/` : pages React.
- `src/game/phaser/` : integration Phaser et bridge React/Phaser.
- `src/game/phaser/scenes/MissionScene.ts` : scene Phaser principale.
- `src/game/simulation/core/` : etat, creation initiale, loop de simulation.
- `src/game/simulation/systems/` : regles de gameplay.
- `src/game/data/` : definitions data-driven.
- `src/game/bodyMap/` : partie normale / carte du corps.
- `src/game/campaign/` : progression et objectifs campagne.
- `src/game/infinite/` : progression du mode infini.
- `src/tests/` : tests Vitest par version/systeme.

React ne doit pas devenir la source de verite gameplay. Phaser ne doit pas contenir les regles de simulation. Les sprites/graphics Phaser doivent afficher l'etat de simulation, pas decider les regles.

## 4. Fichiers importants

Racine :

- `package.json` : scripts et dependances. Scripts utiles : `dev`, `build`, `preview`, `test`, `test:watch`.
- `AUDIT_V9.5.4.md` : audit pre-V11. Fichier non suivi, a lire avant grosses decisions.
- `CONTEXT_V11.md` : ce fichier.
- `backups/` : archives locales, a ignorer.

React / pages :

- `src/App.tsx` : navigation globale et coordination entre campagne, carte du corps, mode infini et page de jeu.
- `src/app/routes.ts` : routes maison.
- `src/app/AppShell.tsx` : shell de navigation.
- `src/pages/HomePage.tsx` : accueil.
- `src/pages/CampaignPage.tsx` : selection campagne.
- `src/pages/GamePage.tsx` : HUD de bataille, boutons de production/capacites, result overlay, integration `PhaserGame`.
- `src/pages/BodyMapPage.tsx` : carte du corps, regions, renforts regionaux, lancement de bataille locale.
- `src/pages/NormalGamePage.tsx` : entree partie normale.
- `src/pages/InfinitePage.tsx` : entree mode infini.
- `src/ui/Button.tsx`, `src/ui/Panel.tsx` : composants UI simples.
- `src/styles/globals.css`, `src/styles/layout.css` : style global et HUD.

Phaser :

- `src/game/phaser/PhaserGame.tsx` : monte/demonte Phaser depuis React.
- `src/game/phaser/GameBridge.ts` : snapshots vers React, commandes vers Phaser/simulation.
- `src/game/phaser/scenes/MissionScene.ts` : scene principale, input RTS, camera, rendu placeholder, publication snapshots.

Simulation core :

- `src/game/simulation/core/GameState.ts` : forme centrale de l'etat de simulation.
- `src/game/simulation/core/Simulation.ts` : facade de simulation.
- `src/game/simulation/core/createInitialState.ts` : creation de l'etat initial depuis mission/preparation.
- `src/game/simulation/core/stepSimulation.ts` : ordre des systemes par tick.
- `src/game/simulation/core/commands.ts` : commandes joueur.
- `src/game/simulation/core/cloneState.ts` : clone d'etat.

Systemes gameplay :

- `src/game/simulation/systems/resourceSystem.ts` : ATP, cytokines, antigenes.
- `src/game/simulation/systems/waveSystem.ts` : vagues.
- `src/game/simulation/systems/pathogenSystem.ts` : pathogenes.
- `src/game/simulation/systems/virusSystem.ts` : virus et infection cellulaire.
- `src/game/simulation/systems/advancedThreatSystem.ts` : menaces avancees.
- `src/game/simulation/systems/movementSystem.ts` : mouvement, anchor, leash, idle.
- `src/game/simulation/systems/combatSystem.ts` : combat, priorites, cible explicite, phagocytose.
- `src/game/simulation/systems/tissueSystem.ts` : tissu, degats, proliferation bacterienne.
- `src/game/simulation/systems/inflammationSystem.ts` : inflammation et consequences.
- `src/game/simulation/systems/debrisSystem.ts` : debris et antigenes.
- `src/game/simulation/systems/biofilmSystem.ts` : biofilm.
- `src/game/simulation/systems/treatmentSystem.ts` : traitements.
- `src/game/simulation/systems/tissueRegenerationSystem.ts` : regeneration tissu.
- `src/game/simulation/systems/entityLimitSystem.ts` : caps d'entites.
- `src/game/simulation/systems/endConditionSystem.ts` : victoire/defaite locale.
- `src/game/simulation/systems/runtimeMapBalance.ts` : balance runtime selon carte.

Data :

- `src/game/data/balance.ts` : valeurs globales de balance.
- `src/game/data/units.ts` : unites immunitaires.
- `src/game/data/pathogens.ts` : pathogenes et menaces.
- `src/game/data/treatments.ts` : traitements.
- `src/game/data/missions.ts` : campagne, batailles de corps, mission infinie.
- `src/game/data/infiniteMode.ts` : phases, mutateurs et score infini.
- `src/game/data/tacticalMaps.ts` : definitions/templates de cartes.
- `src/game/data/tacticalMapGenerator.ts` : generation seed de cartes.
- `src/game/data/tacticalMapSeed.ts` : PRNG deterministe.
- `src/game/data/runtimeTacticalMap.ts` : choix de carte runtime par mission/preparation.
- `src/game/data/mapScaleBalance.ts` : scaling grandes cartes.
- `src/game/data/scienceGlossary.ts` : glossaire scientifique simplifie.
- `src/game/data/v11VisualMetadata.ts` : metadonnees visuelles V11 a conserver.

Carte du corps :

- `src/game/bodyMap/bodyMapSystem.ts` : logique strategic layer, renforts, batailles, victoire/defaite globale.
- `src/game/bodyMap/bodyMapGenerator.ts` : generation partie normale.
- `src/game/bodyMap/bodyMapSave.ts` : sauvegarde active.
- `src/game/bodyMap/bodyMapProgress.ts` : progression/resultats.
- `src/game/bodyMap/bodyMapTypes.ts` : types.
- `src/game/bodyMap/bodyRegions.ts` : definitions regions, noeuds, visualIdentity.

Progressions :

- `src/game/campaign/progress.ts` : progression campagne.
- `src/game/campaign/objectives.ts` : evaluation objectifs/scores/rangs.
- `src/game/infinite/infiniteProgress.ts` : meilleurs runs infinis.

Tests importants :

- `src/tests/v7-body-map.test.ts` : carte du corps, regions perdues, anti-impasse.
- `src/tests/v9-2-body-map-endings.test.ts` : fins partie normale.
- `src/tests/v9-4-semi-guided-rts.test.ts` : RTS semi-guide, leash, cible explicite.
- `src/tests/v9-5-1-tactical-maps.test.ts` : templates cartes.
- `src/tests/v9-5-2-seeded-tactical-maps.test.ts` : generation seed.
- `src/tests/v9-5-3-large-map-balance.test.ts` : grandes cartes et fronts.
- `src/tests/v8-infinite-mode.test.ts` : mode infini.
- `src/tests/v6-campaign.test.ts` : campagne.

## 5. Regles gameplay a preserver

Regle centrale : Immunostrat n'est pas un full-auto global. C'est un RTS semi-guide.

A preserver absolument :

- Le joueur selectionne et donne des ordres.
- Les unites ne doivent pas courir automatiquement sur toute la carte.
- Les unites combattent localement autour de leur zone d'ordre.
- `engagementRadius` limite la detection locale.
- `leashRadius` limite la poursuite.
- `orderAnchor` / point d'ancrage garde le controle joueur.
- Si une unite depasse son leash, elle revient vers sa zone.
- Clic gauche = selection et ordres.
- Clic gauche drag = selection de groupe.
- Clic droit drag = camera uniquement.
- WASD/ZQSD = camera.
- Ordre d'attaque explicite garde la priorite tant que la cible est valide.
- Les dendritiques collectent les debris.
- Les regions perdues de la carte du corps ne bloquent plus toute la partie, mais coutent de la sante globale.
- Campagne = missions fixes et pedagogiques.
- Partie normale = carte du corps + batailles locales seed-based.
- Mode infini = grande carte stable, score, vagues, phases.

## 6. Regles techniques a preserver

- Meme seed + memes entrees = meme carte.
- Pas de `Math.random` pour la generation importante.
- Utiliser `tacticalMapSeed.ts` et les helpers deterministes.
- La campagne doit rester non procedurale/stable.
- Les cartes bodyBattle et infinite peuvent etre seed-based.
- Les sauvegardes localStorage doivent rester robustes : version, try/catch, normalisation.
- Ne pas mettre les regles de gameplay dans `MissionScene.ts`.
- Ne pas transformer React en moteur gameplay.
- Ne pas supprimer les caps d'entites.
- Ne pas changer massivement la balance pendant V11, sauf bug bloquant.
- Ne pas faire un gros refactor pendant V11.
- Avant chaque sous-version : build + tests.

Commandes de verification :

- `npm run build`
- `npm test`
- `npx tsc --noEmit`

Il n'existe pas de script `lint` actuellement dans `package.json`.

## 7. Etat de l'audit V9.5.4

Le fichier `AUDIT_V9.5.4.md` existe a la racine. Il etait non suivi par Git au moment de ce contexte.

Verdict de l'audit :

- Projet presque pret pour V11.
- Architecture saine.
- Build/tests/types OK.
- Seed/generation deterministes.
- Cycle Phaser propre.
- Sauvegardes robustes.
- RTS semi-guide correct.
- Caps d'entites presents.

Corrections importantes deja appliquees en V9.5.4B :

- Impasse victoire carte du corps corrigee : une region avec infection au-dessus du seuil de victoire peut etre ciblee en bataille locale.
- Effets de bord React sortis de l'updater `setBodyMapState` pour le resultat de bataille regionale.
- Double `applyBiofilmSystem` retire dans `stepSimulation.ts`.
- Cible d'attaque explicite prioritaire corrigee dans `combatSystem.ts`.
- Tests ajoutes : anti-impasse body map, generation sans region bloquante impossible a cibler, target explicite RTS.

Risques restants mentionnes par l'audit :

- HUD dense : a traiter en V11.1.
- Bundle mono-chunk lourd : peut attendre apres V11.
- Performance O(n^2) sur certains scans : acceptable avec caps actuels, a surveiller seulement si V11 augmente fortement le nombre d'entites.
- Reprise d'un run infini apres reload : pas une priorite V11.
- Exactitude fine des textes scientifiques : a relire plus tard si objectif portfolio/encyclopedie.

Verdict pour V11 : pret pour V11, avec recommandation de faire un playtest manuel rapide apres chaque sous-version.

## 8. Objectif artistique V11

Direction souhaitee :

- Pixel-art propre, lisible et moderne.
- Style biologique organique mais clair pour un RTS.
- Cartes qui ressemblent a des tissus vivants : cellules, matrice, capillaires, zones de combat.
- Vaisseaux sanguins visibles comme routes/points de diapedese.
- Sorties lymphatiques lisibles.
- Foyers infectieux bien identifies.
- Couleurs vives mais controlees.
- Contraste fort entre allies, ennemis, cellules civiles, objectifs, debris.
- Feedback clair : attaque, phagocytose, infection, anticorps, inflammation, collecte antigenique.
- HUD plus compact, lisible, moins "page web", plus interface de jeu.
- Garder placeholders utiles tant que les assets finaux ne sont pas prets.

Sources internes importantes pour V11 :

- `src/game/data/v11VisualMetadata.ts`
- `visualIdentity` dans `src/game/bodyMap/bodyRegions.ts`
- Champs visuels dans `units.ts`, `pathogens.ts`, `treatments.ts`, `tacticalMaps.ts`
- `futureSpriteKey`, `vfxTags`, `futureSoundHint`

Ne pas copier exactement les images de reference externes. Les utiliser comme inspiration seulement.

## 9. Ce que V11 ne doit pas faire

Ne pas faire pendant V11 :

- Pas de nouveau mode.
- Pas de nouveaux pathogenes.
- Pas de refonte gameplay.
- Pas de refonte generation de cartes.
- Pas de grosse modification de balance.
- Pas de rewrite complet React/Phaser/simulation.
- Pas de suppression des systemes existants.
- Pas de suppression des metadonnees V11.
- Pas de suppression des placeholders utiles avant remplacement stable.
- Pas de backend.
- Pas de multijoueur.
- Pas de base de donnees.
- Pas de full-auto global.
- Pas de changement du schema de sauvegarde sans migration.
- Pas de gros chantier performance non demande.

## 10. Plan recommande pour commencer V11

Ordre recommande :

1. V11.0 - Asset Guide
   - Creer/mettre a jour un guide visuel markdown.
   - Definir palette, silhouettes, tailles, feedback, conventions UI.
   - Relier le guide aux `futureSpriteKey` existants.
   - Ne pas encore remplacer toute la carte.

2. V11.1 - HUD / UI polish
   - Rendre `GamePage.tsx` plus lisible.
   - Transformer les panneaux denses en HUD compact.
   - Garder les controles et boutons existants.
   - Ne pas changer la logique de simulation.

3. V11.2 - Carte biologique pixel-art
   - Travailler le rendu de `MissionScene.ts`.
   - Remplacer progressivement les graphics placeholders par sprites/textures.
   - Garder `TacticalMapDefinition` comme source de verite.

4. V11.3 - Unites/pathogenes/animations
   - Ajouter sprites/animations par type.
   - Conserver les entites et systemes actuels.

5. V11.4 - VFX/feedback
   - Particules cytokines, anticorps, phagocytose, inflammation.
   - Feedback de degats et collecte.

6. V11.5 - Sons/menus/final polish
   - Sons courts et lisibles.
   - Ecrans finaux, transitions, polish portfolio.

## 11. Commandes utiles

Depuis la racine `E:\Vibecoding\Immunostrat` :

```bash
npm run dev
npm run build
npm test
npm run test:watch
npm run preview
npx tsc --noEmit
```

Scripts presents dans `package.json` :

- `dev`: lance Vite.
- `build`: TypeScript build + Vite build.
- `preview`: preview Vite.
- `test`: Vitest run.
- `test:watch`: Vitest watch.

Pas de script `lint` actuellement.

## 12. Checklist avant chaque sous-version V11

Avant de commencer :

- Verifier `git status`.
- Faire un commit si des changements precedents sont prets.
- Lire ce fichier et `AUDIT_V9.5.4.md`.
- Choisir une zone limitee : HUD, carte, sprites, VFX, sons.

Pendant :

- Ne pas refactorer hors scope.
- Ne pas toucher a la balance sauf bug clair.
- Ne pas mettre de logique gameplay dans Phaser.
- Ne pas casser les controles RTS.
- Garder les chemins data-driven.

Avant de terminer :

- Lancer `npm run build`.
- Lancer `npm test`.
- Lancer `npx tsc --noEmit`.
- Verifier campagne.
- Verifier partie normale.
- Verifier mode infini.
- Verifier une grande carte avec camera.
- Verifier selection/ordres gauche et drag camera droit.
- Verifier que les overlays n'interceptent pas les clics de carte.
- Faire un rapport final clair : fichiers touches, tests, risques restants.

## 13. Notes finales pour Claude Code / Fable 5

Le projet est deja jouable et structure. La V11 doit donner envie de regarder et presenter le jeu, pas changer ce qu'il est.

Priorite V11 :

1. Lisibilite.
2. Feedback.
3. Identite visuelle.
4. Cohesion UI/canvas.
5. Animations propres.

Le plus important : preserver la base. Si une modification demande de changer simulation, data, Phaser et React en meme temps, elle est probablement trop grosse pour V11.
