# V11.2A - Tactical map rendering audit

## Objectif

Cette etape prepare V11.2 sans changer le gameplay. Elle audite le rendu actuel
des cartes tactiques, identifie les fichiers a proteger, puis propose une
integration visuelle progressive compatible avec les grandes cartes biologiques.

Non-objectifs V11.2A:

- pas de refonte de simulation;
- pas de changement de seed, vagues, pathfinding, combat ou equilibre;
- pas de nouveau systeme complet de generation;
- pas de remplacement immediat du rendu Phaser.

## Fichiers inspectes

### Generation et donnees de carte

- `src/game/data/tacticalMaps.ts`: types, templates tactiques, zones, vaisseaux,
  sites de combat, points de diapedese, sorties lymphatiques.
- `src/game/data/tacticalMapGenerator.ts`: variations seedees pour body battle et
  infinite, validation de distances, jitter de sites/entrees/sorties.
- `src/game/data/tacticalMapSeed.ts`: PRNG deterministe, `deriveSeed`,
  `createRunSeed`.
- `src/game/data/runtimeTacticalMap.ts`: choix du template et du seed au
  lancement d'une mission.
- `src/game/data/missions.ts`: lien mission -> carte tactique, fallback legacy.
- `src/game/bodyMap/bodyRegions.ts`: region du corps -> template tactique.
- `src/game/bodyMap/bodyMapSystem.ts`: preparation d'une bataille regionale et
  seed tactique derive.
- `src/game/data/mapScaleBalance.ts`: modificateurs selon mode, taille de carte
  et difficulte.

### Rendu, input et integration Phaser/React

- `src/game/phaser/scenes/MissionScene.ts`: rendu principal de carte et entites.
- `src/game/phaser/scenes/PreloadScene.ts`: actuellement aucun preload asset.
- `src/game/phaser/createPhaserConfig.ts`: taille canvas, camera, scene config.
- `src/game/phaser/PhaserGame.tsx`: montage/demontage Phaser dans React.
- `src/game/phaser/GameBridge.ts`: snapshots vers le HUD React.
- `src/pages/GamePage.tsx`: HUD React, commandes et overlays de bataille.

### Systemes qui lisent la carte logique

- `src/game/simulation/systems/waveSystem.ts`: spawns pathogenes par zones de la
  carte tactique.
- `src/game/simulation/core/commands.ts`: entree des unites et sortie lymphatique.
- `src/game/simulation/systems/tissueSystem.ts`: clamp dans les limites monde.

## Flux actuel

```txt
React page
  -> PhaserGame
  -> createPhaserConfig
  -> createRuntimeTacticalMap
  -> tactical map definition / generated tactical map
  -> createInitialState
  -> MissionScene renders the logical map with Phaser Graphics
  -> GameBridge snapshots
  -> GamePage React HUD
```

La source de verite de carte est deja la definition tactique. Le rendu visuel,
lui, est encore majoritairement procedurale et placeholder dans `MissionScene`.

## Templates tactiques existants

| Template | Modes | Region | Taille | Sites | Entrees | Sorties |
| --- | --- | --- | --- | ---: | ---: | ---: |
| `skin_small_wound_fixed` | campaign | skin | small 1800x1100 | 1 | 2 | 1 |
| `skin_multi_wound_template` | campaign/bodyBattle | skin | medium 2600x1600 | 3 | 2 | 2 |
| `lung_branching_vessels_template` | campaign/bodyBattle | lungs | large 3600x2200 | 3 | 2 | 2 |
| `intestine_clustered_sites_template` | campaign/bodyBattle | intestine | large 3600x2200 | 3 | 2 | 1 |
| `blood_vessel_crossroads_template` | bodyBattle | blood | large 3600x2200 | 3 | 3 | 2 |
| `lymph_node_signal_template` | campaign/bodyBattle | lymphNodes | large 3600x2200 | 2 | 2 | 2 |
| `infinite_large_tissue_template` | infinite | mixed | huge 4800x2800 | 5 | 6 | 3 |

Les tailles reelles de monde sont deja plus grandes que le canvas visible. Il
faut donc ameliorer l'habillage sans revenir a une petite arene.

## Ce qui est deja separable

- Les positions logiques existent: `combatSites`, `diapedesisPoints`,
  `lymphaticExits`, `pathogenSpawnZones`, `civilianCellZones`, `vesselPaths`,
  `corridors`, `chokePoints`, `obstacles`.
- Les seeds campagne sont fixes; body battle et infinite utilisent des seeds
  prepares ou derives.
- La camera utilise `tacticalMap.cameraBounds`.
- Les spawns pathogenes passent par `getPathogenSpawnPositionForWave`.
- Les unites produites cherchent un point d'entree via la carte tactique.
- Les dendritiques utilisent la sortie lymphatique tactique.

Ces points ne doivent pas etre remplaces par des coordonnees visuelles.

## Placeholders visuels actuels

Dans `MissionScene.ts`, la carte est dessinee avec des `Graphics` Phaser:

- fond uni `0x101820`;
- ancien `playArea` et grille legacy;
- ancienne zone tissu et entree bacterienne legacy;
- tissue zones en cercles/polygones transparents;
- vaisseaux en lignes rouges/violettes;
- corridors en lignes vertes/cyan;
- obstacles en formes sombres;
- sites de combat en cercles oranges;
- zones de spawn en cercles orange;
- choke points en marqueurs violets;
- entrees/diapedese en cercles bleus;
- sorties lymphatiques en cercles jaune-vert;
- cellules civiles, biofilms, zones inflammatoires et antivirales en overlays.

Ce rendu est lisible pour le debug, mais il ne porte pas encore l'identite
biologique/pixel-art V11.

## Zones de code a proteger

Ne pas modifier pour V11.2B sauf bug cible:

- `tacticalMapSeed.ts`;
- `tacticalMapGenerator.ts`, sauf ajout de metadata visuelle pure;
- `waveSystem.ts`;
- `commands.ts`;
- `tissueSystem.ts`;
- donnees de balance et couts;
- conditions de victoire/defaite;
- controles RTS existants.

Le rendu peut changer, mais les IDs, positions et rayons logiques doivent rester
stables.

## Zones de code candidates pour V11.2B

Modifications sures si elles restent visuelles:

- `PreloadScene.ts`: preload des assets de carte.
- `MissionScene.ts`: remplacer progressivement `drawTacticalMapTemplate` par
  couches visuelles, en gardant le fallback `Graphics`.
- Nouveau dossier recommande: `src/game/mapVisuals/`.
- Nouveaux assets recommandes: `src/assets/maps/v11/`.

## Strategie Layer A / Layer B

### Layer A - fond biologique

Layer A est un fond decoratif par type de carte. Il ne change aucune collision,
aucun spawn, aucun objectif.

Roles:

- donner l'ambiance biologique globale;
- remplir les grandes cartes sans bruit interactif;
- etre choisi selon `backgroundType`, `regionType`, mode et seed;
- rester lisible sous les entites et les overlays.

Types de fonds a prevoir:

- `skin`: tissu cutane, plaies, capillaires;
- `lung`: alveoles, ramifications bleues/vertes;
- `intestine`: couloirs sinueux, amas muqueux;
- `blood`: vaisseaux dominants, carrefour rouge/violet;
- `lymph`: violet/bleu, signalisation lymphatique;
- `mixed`: fond sombre de survie multi-fronts.

Implementation recommandee:

- manifest visuel type dans `src/game/mapVisuals/mapVisualAssets.ts`;
- preload dans `PreloadScene`;
- rendu dans une couche statique sous `dynamicLayer`;
- fallback `Graphics` si asset absent;
- selection seedee par `deriveSeed(mapSummary.seed, "visual", map.id, layer)`.

### Layer B - assets modulaires interactifs

Layer B pose les marqueurs et modules sur les donnees logiques existantes:

- segments de vaisseaux;
- points de diapedese;
- sorties lymphatiques;
- sites infectieux;
- corridors;
- obstacles;
- marqueurs de danger/objectif.

Layer B ne doit pas recreer une carte logique. Il doit lire:

- `vesselPaths`;
- `combatSites`;
- `diapedesisPoints`;
- `lymphaticExits`;
- `corridors`;
- `chokePoints`;
- `obstacles`.

## Metadata d'assets proposee

```ts
export type MapVisualAsset = {
  key: string;
  path: string;
  layer: "A" | "B";
  role:
    | "background"
    | "bloodVessel"
    | "lymphRoute"
    | "entryPoint"
    | "lymphExit"
    | "combatSite"
    | "corridor"
    | "chokePoint"
    | "obstacle"
    | "decor";
  regionTypes?: TacticalRegionType[];
  backgroundTypes?: TacticalMapDefinition["backgroundType"][];
  states?: Array<"healthy" | "warning" | "critical" | "infected" | "inflamed">;
  sockets?: Array<"N" | "E" | "S" | "W" | "NE" | "NW" | "SE" | "SW">;
  anchor?: { x: number; y: number };
  sourceSize: { width: number; height: number };
  recommendedScale: number;
  logicalRadius?: number;
  tags?: string[];
};
```

Pour les futurs sprites deja prepares, conserver aussi les hooks existants
comme `futureSpriteKey` et `v11VisualMetadata` lorsque presents.

## Contraintes seed et determinisme

- Ne pas utiliser `Math.random()` dans la selection visuelle.
- Deriver les variantes visuelles depuis le seed de carte.
- Une meme mission campagne doit garder le meme decor.
- Une meme bataille normale avec le meme seed doit garder le meme decor.
- Le mode infini doit pouvoir retrouver la meme identite visuelle depuis
  `tacticalMapSeed`.
- Les assets visuels ne doivent pas changer les resultats de tests gameplay.

## Risques techniques

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Assets trop lourds pour cartes huge | FPS bas | Layer A unique + Layer B limite, pas de redraw permanent |
| Confusion entre visuel et logique | Bugs de spawn/clic | Garder hit tests sur donnees tactiques |
| Fond trop charge | Unites illisibles | Opacite controlee, vignette faible, debug overlay |
| Beaucoup d'assets non preload | Flicker ou erreurs texture | Manifest central + preload dedie |
| Stretch des assets pixel-art | Flou | Dimensions proportionnelles, `pixelArt: true`, scale par ratio |
| Sites visuels decales | Joueur trompe | Ancrage par ID logique et overlays debug optionnels |

## Plan V11.2B-F

### V11.2B - Layer A backgrounds

- Ajouter manifest d'assets de fonds.
- Preloader les fonds dans `PreloadScene`.
- Afficher un fond par carte dans `MissionScene`.
- Garder le fallback placeholder actuel.
- Verifier campagne, partie normale, mode infini.

### V11.2C - Layer B vessel/corridor pass

- Ajouter types d'assets modulaires.
- Dessiner vaisseaux et corridors depuis `vesselPaths` / `corridors`.
- Conserver les lignes debug sous un flag ou fallback.
- Ne pas modifier les trajectoires logiques.

### V11.2D - Markers interactifs

- Remplacer visuellement diapedese, sorties lymphatiques, sites de combat et
  choke points.
- Garder les hit tests existants.
- Ajouter un mode debug pour afficher rayons/logique.

### V11.2E - Variantes seedees

- Selectionner variantes d'assets par seed.
- Introduire sockets simples pour orienter les segments.
- Verifier qu'une carte generee reste stable apres reload.

### V11.2F - QA et lisibilite

- Ajuster opacite, tailles et priorite visuelle des layers.
- Screenshot desktop sur campagne/body/infinite.
- Verifier les grandes cartes et le deplacement camera.
- Nettoyer les placeholders non utiles.

## Recommandation d'architecture

Ajouter progressivement:

```txt
src/game/mapVisuals/
  mapVisualTypes.ts
  mapVisualAssets.ts
  selectMapVisualPlan.ts
  TacticalMapLayerRenderer.ts
```

Le `TacticalMapLayerRenderer` peut recevoir une `TacticalMapDefinition` et une
scene Phaser, puis creer seulement les objets decoratifs statiques. La
simulation et les commandes continuent d'utiliser `GameState.tacticalMap`.

## Verdict V11.2A

Le projet est pret pour V11.2B. La base tactique est assez structuree pour
integrer des backgrounds et assets modulaires sans casser le gameplay, a
condition de garder une regle stricte: les assets decorent la carte logique, ils
ne deviennent jamais la source de verite.
