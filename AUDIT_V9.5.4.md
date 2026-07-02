# AUDIT Immunostrat — V9.5.4

> Audit en lecture seule réalisé avant V11. Aucun fichier de code modifié.
> Chaque problème est étiqueté `[CONFIRMÉ]` (vu dans le code / exécuté) ou `[SUSPECTÉ]` (déduction plausible non exécutée).

## Transparence de périmètre (priorisation)

Le projet fait ~21 000 lignes / 94 fichiers. Conformément à l'ordre de priorité demandé, ont été **lus en profondeur** :
- **Cartes / seed** : `tacticalMapSeed.ts`, `tacticalMapGenerator.ts` (intégral), `bodyMapGenerator.ts`.
- **RTS** : `movementSystem.ts`, `combatSystem.ts` (intégral), extraits ciblés de `MissionScene.ts`, `commands.ts` (partiel via review précédente).
- **Balance** : `balance.ts` (intégral), `tissueRegenerationSystem.ts`, `entityLimitSystem.ts`, `waveSystem.ts`, `inflammationSystem.ts` (refs).
- **Sauvegardes / reset** : `bodyMapSave.ts`, `campaign/progress.ts`, `infinite/infiniteProgress.ts`, `bodyMapSystem.ts` (intégral), `App.tsx`, `bodyMapTypes.ts`, `bodyRegions.ts`.
- **Rest** : `GamePage.tsx`, `BodyMapPage.tsx`, `NormalGamePage.tsx`, `PhaserGame.tsx`, `GameBridge.ts`, `stepSimulation.ts`, `endConditionSystem.ts`.

**Non lus en profondeur** (survolés ou via usages seulement — à vérifier manuellement pour la science/texte) : `pathogens.ts` (1769 l.), `missions.ts` (1359 l.), `tacticalMaps.ts` (templates, 1318 l.), `advancedThreatSystem.ts`, `treatments.ts`, `infiniteMode.ts` (interne), `virusSystem.ts`, `debrisSystem.ts`, `createInitialState.ts`, `runtimeMapBalance.ts`, `mapScaleBalance.ts`, `campaign/objectives.ts`, corps complet de `MissionScene.ts` (1464 l.).

---

## 1. Verdict global

**PRESQUE PRÊT pour V11.** L'architecture, la génération par seed, la caméra, le RTS semi-guidé, les sauvegardes et les conditions de victoire/défaite sont solides et testés (build OK, 106 tests verts, `tsc --noEmit` OK, 0 `any`, 0 `Math.random`). **Un blocker gameplay confirmé** dans la « partie normale » (carte du corps) doit être corrigé avant V11, plus 2-3 correctifs moyens. Aucun système central n'est à réinventer.

## 2. Résumé (≤10 lignes)

Le socle technique est sain : simulation pure et data-driven, séparation React/Phaser propre, cycle de vie Phaser correctement nettoyé, PRNG déterministe (aucun `Math.random`), sauvegardes versionnées avec try/catch et normalisation. Le plus gros risque est un **soft-lock de victoire sur la carte du corps** : une région peut afficher « saine » tout en bloquant la victoire (seuil de victoire à 10 % d'infection, mais bouton bataille désactivé sous 18 %), sans moyen intuitif d'agir — exactement l'impasse déjà vécue. Il touche ~45 % des parties générées. Correctible en quelques lignes de logique. Secondairement : effets de bord `setState` dans un updater (risque StrictMode), quelques scans O(n²) bornés par des caps, HUD très dense (pour V11.1). Recommandation : une **V9.5.4B** courte avant V11.

## 3. Ce qui fonctionne bien

- **Build / tests / types** : `npm run build` OK (exit 0), `npm test` = **106 tests / 20 fichiers, tous verts**, `tsc --noEmit` OK. Working tree propre (tout commité).
- **Déterminisme** `[CONFIRMÉ]` : **aucun `Math.random`** dans `src`. PRNG hash-based (`createSeededRandom`, mulberry-like) dans `tacticalMapSeed.ts:18`. Retries pliés dans le seed (`tacticalMapGenerator.ts:78`) → génération reproductible. Campagne = template fixe, pas de variation (`tacticalMapGenerator.ts:63`).
- **Qualité TS** `[CONFIRMÉ]` : 0 `any`, 0 `@ts-ignore`, 0 `TODO/FIXME/HACK`.
- **Cycle de vie Phaser** `[CONFIRMÉ]` : désabonnement du bridge câblé sur `SHUTDOWN` **et** `DESTROY` (`MissionScene.ts:92-93`), destruction du jeu au démontage (`PhaserGame.tsx:26`). `bridge` en `useMemo([])` et `preparation`/`missionId` issus du state App → pas de recréation Phaser en boucle.
- **Sauvegardes robustes** `[CONFIRMÉ]` : `try/catch` + fallback défaut + contrôle de `version` + normalisation à la lecture ET à l'écriture, garde SSR (`typeof window`) dans `bodyMapSave.ts`, `campaign/progress.ts`, `infiniteProgress.ts`, `bodyMapProgress.ts`.
- **Caps d'entités** `[CONFIRMÉ]` : `entityLimits` par classe (`balance.ts:101`), `canSpawnPathogen` + `trimTransientCollections` (`entityLimitSystem.ts`) → pas d'explosion non bornée.
- **Attrition des unités** `[CONFIRMÉ]` : les unités immunitaires prennent des dégâts (contact bactérien `tissueSystem.ts:49`, inflammation critique `inflammationSystem.ts:129`) — la faille « unités immortelles » des versions antérieures est corrigée.
- **Régénération tissu avec feedback** `[CONFIRMÉ]` : `tissueRegenerationSystem.ts` expose `status`/`blockedReason` (infection/inflammation/combat) remontés au HUD (`GamePage.tsx:692`).
- **RTS semi-guidé** `[CONFIRMÉ]` : `engagementRadius`, `leashRadius`, `orderAnchor`, machine `tacticalState`, retour à l'ancre au-delà du leash (`movementSystem.ts:15-27`), priorités de cible par rôle (`combatSystem.ts:317`).
- **Victoire/défaite data-driven** `[CONFIRMÉ]` : conditions lues depuis la mission (`endConditionSystem.ts`), défaite testée avant victoire (pas de double déclenchement), condition « cellules civiles compromises ≥ ratio » présente.

## 4. Blockers avant V11

### B1 — Soft-lock de victoire « carte du corps » : régions « saines » qui bloquent la victoire sans être jouables
- **Statut** : `[CONFIRMÉ]`
- **Gravité** : Élevée (bloque la boucle de victoire du mode « partie normale »).
- **Fichiers** : `game/data/balance.ts:115`, `game/bodyMap/bodyMapSystem.ts:997-1030` (`getRegionStatus`), `bodyMapSystem.ts:661-797` (`getBodyMapVictoryProgress`), `pages/BodyMapPage.tsx:491-506` (`canRegionLaunchBattle`), `game/bodyMap/bodyMapGenerator.ts:253`, `game/bodyMap/bodyRegions.ts:288-297`, `bodyMapSystem.ts:526-551` (`advanceStrategicTurn`).
- **Description** : La victoire exige `infection <= victoryMaxRegionInfection` (**10 %**) pour chaque région non perdue. Mais `getRegionStatus` ne renvoie « alert » qu'à partir de **18 %** d'infection ; en dessous, la région est « healthy ». Or `canRegionLaunchBattle` **refuse la bataille** pour toute région `healthy`/`controlled`. Il existe donc une bande **10 % < infection < 18 %** où la région : (a) apparaît **verte/saine**, (b) **bloque la victoire**, (c) a son **bouton « Lancer bataille » grisé**. La génération place `infection = Math.floor(random()*12)` = **0..11** sur toutes les régions à menace non-« none » (`bodyMapGenerator.ts:253`), et `blood` démarre à **12** par défaut (`bodyRegions.ts:293`). `advanceStrategicTurn` ne fait que **croître** l'infection des régions `infection>0` (jamais décroître sans bataille, `bodyMapSystem.ts:529+`). Le seul échappatoire est contre-intuitif : cliquer « Avancer un tour » jusqu'à ce que la région empire (≥18 %), puis la combattre. Probabilité qu'au moins une région démarre à exactement 11 % : ~45 % des parties (7 régions éligibles × 1/12).
- **Conséquence en jeu** : Le joueur voit des régions « saines », le bandeau de victoire affiche « régions encore infectées : N », mais **aucune action évidente** — exactement l'impasse rapportée (« 2 régions à nettoyer mais saines, rien à faire »). Note : le bouton « Avancer un tour » (`BodyMapPage.tsx:123`) évite un **gel dur**, mais l'expérience reste « bloquée ».
- **Correction recommandée** (une des options) :
  1. Faire **décroître passivement** l'infection des régions à menace `none` sous le seuil de victoire (dans `advanceStrategicTurn`/`applyPassiveBodyMapInfectionTick`), pour qu'elles s'auto-nettoient sous 10 %.
  2. **OU** aligner les seuils : `victoryMaxRegionInfection` ≥ seuil « alert » (18), pour qu'une région saine ne bloque jamais.
  3. **OU** autoriser une « bataille de nettoyage » dès que `infection > victoryMaxRegionInfection`, même en statut healthy (assouplir `canRegionLaunchBattle`).
- **Priorité** : P0 (avant V11).

### B2 — Effets de bord `setState` imbriqués dans un updater d'état (risque StrictMode / double-persistance)
- **Statut** : `[SUSPECTÉ]`
- **Gravité** : Moyenne-haute.
- **Fichiers** : `App.tsx:141-156` (`handleBodyBattleComplete` : `saveBodyMapState`, `maybeRecordBodyMapResult`, `setHasActiveBodyMapRun` appelés **à l'intérieur** de l'updater de `setBodyMapState`), `App.tsx:158-180` (`maybeRecordBodyMapResult` appelle `setBodyMapProgress` + `saveBodyMapProgress`).
- **Description** : Appeler d'autres `setState` et des écritures `localStorage` **dans** la fonction updater de `setBodyMapState` est un anti-pattern React. En `StrictMode` (dev) les updaters sont invoqués deux fois → double sauvegarde et potentielle double comptabilisation du résultat de run (`recordBodyMapRun`).
- **Conséquence** : En dev, stats de « partie normale » potentiellement doublées ; comportement fragile. En prod (sans StrictMode) l'impact est masqué, mais le couplage reste risqué avant refonte V11.
- **Correction recommandée** : Déplacer les effets (`save*`, `record*`, autres `setState`) hors de l'updater, dans un `useEffect` réagissant à `bodyMapState`, ou calculer l'état suivant de façon pure puis committer une seule fois.
- **Priorité** : P1 (avant V11, faible coût).

## 5. Corrections recommandées pour V9.5.4B (par priorité)

1. **P0 — B1** : corriger la logique d'impasse victoire/bataille sur la carte du corps (voir options B1). Ajouter un test de non-régression (voir §12).
2. **P1 — B2** : sortir les effets de bord des updaters `setState` dans `App.tsx`.
3. **P2 — Feedback d'impasse** : dans `BodyMapPage`, si une région bloque la victoire mais n'est pas battable, afficher un message d'action clair (« Avancer un tour pour laisser la crise mûrir » ou bouton nettoyage) plutôt que des blockers muets.
4. **P2 — Double `applyBiofilmSystem`** (`stepSimulation.ts:35` et `:40`) : confirmer l'intention ou retirer le doublon.
5. **P3 — Passive tick BodyMap** : la dépendance `state` du `useEffect` (`BodyMapPage.tsx:73-83`) recrée l'intervalle à chaque changement d'état ; le tick de 5 s ne se déclenche qu'après 5 s d'inactivité. À revoir si le tick passif doit être régulier.

## 6. Problèmes importants mais non bloquants

- **[SUSPECTÉ] Cible d'attaque explicite non verrouillée** : dans `combatSystem.ts:293-301`, `explicitTargetEntityId` est OR'é dans la sélection mais peut être écrasé par un pathogène de priorité supérieure rencontré ensuite → un ordre « attaque cette cible » peut ne pas « tenir » si une cible mieux priorisée est à portée. RTS légèrement contre-intuitif.
- **[CONFIRMÉ] Perf — scans linéaires répétés** : `combatSystem` filtre tous les pathogènes puis fait O(unités × pathogènes) par frame (`combatSystem.ts:26,268`) ; `canSpawnPathogen` recompte toutes les entités à chaque spawn (`entityLimitSystem.ts:83`) ; `cloneState` clone tout l'état chaque frame. Sûr aux caps actuels (`maxActivePathogens: 140`) mais à surveiller en fin de run infinie / grandes cartes. Pas de partitionnement spatial.
- **[SUSPECTÉ] Run infinie non reprise après reload** : le seed infini (`createRunSeed("infinite")`, `App.tsx:183`) vit uniquement dans le state React `selectedPreparation`, non persisté. Reload en cours de run infinie = run perdue. Probablement voulu (mode score), à confirmer.
- **[CONFIRMÉ] Bundle mono-chunk 1,71 Mo (469 Ko gzip)** : warning Vite « chunks > 500 kB », pas de code-splitting (Phaser inclus). Non bloquant ; candidat lazy-load post-V11.

## 7. À garder pour V11.1 (HUD/UI)

- **HUD très dense** `[CONFIRMÉ]` : `GamePage.tsx` empile ~11 boutons d'action + `hud-strip` de ~20 items + 2 panneaux de menaces (`GamePage.tsx:451-627`). `BodyMapPage` a aussi de nombreux panneaux. Lisible mais chargé — cible naturelle du polish HUD.
- **[SUSPECTÉ] `wave-alert-overlay`** (`GamePage.tsx:401`) superposé au canvas : si `pointer-events` n'est pas à `none`, il pourrait intercepter des clics carte pendant l'alerte. À vérifier dans `layout.css`.
- Débordements de texte / tailles de boutons / objectifs longs : à traiter au polish (non vérifié en profondeur).

## 8. À garder pour V11.2/V11.3/V11.4 (polish visuel)

- Le rendu Phaser est en `Graphics` immédiat (formes procédurales) et **découplé de la logique** (simulation pure → snapshot). Le remplacement par pixel art/sprites n'exige pas de réécrire la simulation. `v11VisualMetadata.ts` et les `visualIdentity`/`futureSpriteKey`/`vfxTags` (ex. `bodyRegions.ts:33`) préparent déjà les assets. Bon augure pour V11.
- Animations, effets, sons, feedback : à définir (voir §14 asset guide).

## 9. Problèmes pouvant attendre après V11

- Code-splitting / lazy-load du bundle.
- Partitionnement spatial pour la recherche de cibles (si les effectifs augmentent nettement).
- Reprise de run infinie après reload (si jugée souhaitable).

## 10. Analyse par système

- **Architecture** `[CONFIRMÉ]` : saine. Simulation pure (`stepSimulation` orchestre 16 systèmes), data-driven, React/Phaser découplés par `GameBridge` (snapshots). Fichiers volumineux à surveiller : `pathogens.ts` (1769), `MissionScene.ts` (1464), `bodyMapSystem.ts` (1388), `missions.ts` (1359), `tacticalMaps.ts` (1318) — surtout des données ; seul `MissionScene` est un gros fichier logique+rendu.
- **Modes** : Campagne (missions fixes, unlocks, progression persistée), Partie normale (carte du corps générée, victoire/défaite globales), Infini (score, phases, mutateurs, caps). Bien séparés dans `App.tsx`. **Impasse B1** dans la partie normale.
- **Cartes** `[CONFIRMÉ]` : `TacticalMapDefinition` riche (worldW/H, sites, diapédèse, sorties lymphatiques, spawns, corridors, chokepoints, obstacles) ; validation + fallback template après 4 retries (`tacticalMapGenerator.ts:53,97`).
- **Seed** `[CONFIRMÉ]` : déterministe ; seed de bataille dérivé de l'état persistant (`bodyMapSystem.ts:346`) → reproductible au reload. Campagne = fixe.
- **Gameplay RTS** `[CONFIRMÉ]` : sélection/ordres + auto-combat local borné par leash/anchor ; caméra bornée (`MissionScene.ts:83`), drag clic droit, clic gauche = ordres. Un bémol mineur (cible explicite, §6).
- **Balance** `[CONFIRMÉ, partiel]` : centralisée dans `balance.ts` + `mapScaleBalance`/`runtimeMapBalance` (scaling par taille de carte, non lu en détail). Régénération tissu conditionnée et lisible. Inflammation à double tranchant. Valeurs numériques d'équilibrage non jouées → §11.
- **Immunologie** `[SUSPECTÉ]` : infrastructure science/gameplay présente (`gameplayRole`, `realLifeInspiration`, `simplificationNote` affichés en tooltips, `GamePage.tsx:611`, `BodyMapPage.tsx:302`). Exactitude des textes non vérifiée (fichiers `pathogens.ts`/`treatments.ts` non lus en détail) → à vérifier manuellement.
- **Sauvegardes** `[CONFIRMÉ]` : robustes, versionnées ; **sauf** B2 (effets de bord dans updater).
- **Performance** : caps en place ; scans O(n²) bornés (§6).
- **UI/UX** : fonctionnelle, dense (V11.1).
- **Tests** : 20 fichiers, 106 tests, couvrant seed, cartes, RTS, endings carte du corps, infini, stabilisation grandes cartes. Manques ciblés en §11.

## 11. Tests lancés

| Commande | Résultat |
|---|---|
| `npm run build` (`tsc -b && vite build`) | **OK (exit 0)**. Warning : chunk 1,71 Mo > 500 kB (mono-bundle, Phaser). |
| `npm test` (`vitest run`) | **OK — 106 tests / 20 fichiers, tous verts.** |
| `npx tsc --noEmit` | **OK (exit 0)**, aucune erreur de typage. |
| `npm run lint` | **Non disponible** (aucun script `lint` dans `package.json`, aucune config ESLint versionnée). Recommandé d'en ajouter un. |
| `git status` | Propre (aucune modif non commitée). Dernier commit : `fdc57ed Tune body map battles and regional loss flow`. |
| Secrets/sécurité | `[CONFIRMÉ]` Aucune clé/token en clair repéré ; usage `localStorage` uniquement (progress/saves). |

## 12. Tests automatisés recommandés (à ajouter)

1. **Body map — non-impasse** : pour toute région non perdue, `infection > victoryMaxRegionInfection` ⇒ soit `canRegionLaunchBattle` vrai, soit un chemin de nettoyage existe (test anti-B1).
2. **Body map — état initial généré** : aucune région ne démarre dans la bande « saine mais bloquante » (10 < infection < seuil battable) après `createGeneratedBodyMapState` sur N seeds.
3. **Seed determinism** : `generateTacticalMapFromTemplate` avec mêmes entrées ⇒ carte identique ; seeds différents ⇒ cartes différentes.
4. **Reload determinism** : `deriveSeed` de bataille identique après round-trip `save/load` de `BodyMapState`.
5. **Save/reset** : `normalize*` idempotents ; version mismatch ⇒ défaut.
6. **Entity caps** : sous spawn massif, comptes ≤ `entityLimits`.
7. **Victory/defeat carte du corps** : pas de double déclenchement ; défaite prioritaire.
8. **RTS leash/engagement** : unité au-delà du leash revient à l'ancre ; ne poursuit pas hors zone.
9. **Regen tissu** : bloquée si inflammation ≥ danger / infection / combat ; active sinon.

## 13. Tests manuels recommandés

Campagne mission 1 ; campagne mission avancée ; partie normale nouvelle run (×3 seeds) ; **partie normale : vérifier qu'aucune région « saine » ne bloque la victoire sans action possible (B1)** ; continuer une partie normale ; victoire globale ; défaite globale ; infini phase 1 ; infini phase avancée (perf) ; grande carte + caméra (drag droit, WASD, bornes) ; même seed = même carte ; seeds différents = cartes différentes ; régénération tissu visible ; plusieurs fronts ; restart de bataille ; **reload navigateur mid-partie normale (seed/carte identiques)**.

## 14. Plan de correction Codex (étapes petites)

1. **Étape 1** — Corriger B1 (option recommandée : décroissance passive de l'infection des régions à menace `none` sous `victoryMaxRegionInfection`, + n'exclure des blockers que les régions réellement non nettoyables). Fichiers : `bodyMapSystem.ts` (`advanceStrategicTurn`/`applyPassiveBodyMapInfectionTick`/`getBodyMapVictoryProgress`), éventuellement `BodyMapPage.tsx` (`canRegionLaunchBattle`).
2. **Étape 2** — Ajouter le test anti-impasse (§12.1/12.2).
3. **Étape 3** — Corriger B2 : sortir `save*`/`record*`/`setState` des updaters (`App.tsx`).
4. **Étape 4** — Ajouter un message d'action UX quand une région bloque sans bataille possible (`BodyMapPage.tsx`).
5. **Étape 5** — Trancher le doublon `applyBiofilmSystem` (`stepSimulation.ts`).
6. **Étape 6** — (Optionnel) Ajouter un script `lint` + config ESLint.
7. **Étape 7** — Vérifier `pointer-events` de `wave-alert-overlay` (`layout.css`).
8. **Étape 8** — Relancer `npm run build`, `npm test`, `tsc --noEmit`, puis passer à V11.

## 15. Risques pour V11

- Si **B1** n'est pas corrigé, le polish V11 se ferait sur un mode « partie normale » qui peut sembler injouable/bloqué → mauvaise première impression malgré le polish.
- Si **B2** n'est pas corrigé, des bugs de sauvegarde intermittents pourraient être confondus avec des régressions de polish.
- Le reste (HUD dense, bundle) n'empêche pas le polish et est justement le périmètre de V11/V11.1.

## Verdict final

**Je recommande de passer à V11 APRÈS correction de B1 (impasse victoire carte du corps) et B2 (effets de bord dans les updaters `setState`), via une courte passe V9.5.4B.** Les systèmes centraux (cartes, seed, caméra, RTS, pathogènes, balance, sauvegardes, victoire/défaite, modes) sont en place et n'ont pas besoin d'être réinventés.
