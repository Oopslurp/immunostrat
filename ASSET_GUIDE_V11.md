# ASSET_GUIDE_V11 — Direction artistique Immunostrat

Ce document fige la direction artistique approuvée pour la V11 (HUD, carte, sprites, animations,
effets, sons, menus). Il sert de référence unique pendant V11.0 → V11.5.

Statut : **direction artistique approuvée, palette hex candidate stable — à validation humaine
avant usage massif** (voir section 13 « Décisions post-rapport » et section 14 « Versioning de
la palette »).

Ce document ne modifie ni le gameplay, ni l'architecture, ni la génération de carte, ni la logique
seed. Aucun sprite n'est créé à cette étape.

---

## 1. Vision globale

Immunostrat doit devenir un RTS biologique en pixel-art stylisé.

Style voulu :
- pixel-art propre ;
- biologique / organique ;
- coloré ;
- lisible en vue RTS ;
- vivant ;
- non gore ;
- pas trop réaliste ;
- pas médical froid ;
- pas placeholder ;
- pas "simples formes géométriques".

Le jeu doit évoquer un champ de bataille microscopique dans un tissu vivant.

Référence visuelle principale (unités) : infographie moderne du système immunitaire — cellules
rondes, colorées, stylisées, membranes visibles, noyaux, appendices, formes lisibles, couleurs
fortes. **On ne copie pas cette image** : on reprend son langage visuel et on le transforme en
pixel-art cohérent.

Direction résumée : *"Pixel-art inspiré d'illustrations immunitaires modernes et colorées, avec
silhouettes biologiques simplifiées, lisibles et expressives."*

Contexte projet (`CONTEXT_V11.md`) : jeu portfolio, ~70% ludique / 30% inspiré de la science,
RTS semi-guidé (pas de full-auto global), 3 modes (campagne fixe, partie normale/carte du corps
seed-based, mode infini seed-based).

---

## 2. Structure visuelle en deux layers

### Layer A — background décoratif lointain
Rôle : ambiance, tissu vivant, cohérence biologique, profondeur, grandes structures organiques.
Contenu possible : tissu rose/mauve, cavités, fibres, membranes, poches, gros vaisseaux, zones
lymphatiques suggérées, variations régionales.
Contraintes : décoratif, moins contrasté, plus doux ; ne gêne jamais la lecture du gameplay ;
ne porte jamais la logique de collision/pathfinding ; ne remplace pas les données de génération.

### Layer B — foreground interactif proche
Rôle : gameplay, lisibilité tactique, déplacement, combat, feedback.
Contenu : unités immunitaires, pathogènes, foyers infectieux, zones de déplacement, points
d'entrée/diapédèse, sorties lymphatiques, marqueurs RTS, VFX, projectiles/particules.
Contraintes : plus net, plus contrasté, prioritaire sur le décor ; doit permettre une lecture
tactique rapide.

**Ancrage technique réel** : aujourd'hui, `MissionScene.ts` dessine tout sur une seule couche
`Graphics` en immediate-mode (pas de séparation background/foreground). La séparation Layer A/B
n'existe pas encore dans le code — c'est un objectif de rendu pour V11.2, pas un état actuel.
Le rendu procédural existant utilise déjà implicitement un ordre proche de Layer A → Layer B
(tissu → vaisseaux → sites de combat → entités → overlays), ce qui donne un point de départ
naturel pour introduire de vrais containers/layers Phaser plus tard.

---

## 3. Génération seed-based et compatibilité background

Règle absolue : **même seed = même map + même décor.**

La carte est générée par seed / sous-seeds via un PRNG déterministe
(`src/game/data/tacticalMapSeed.ts`, `createSeededRandom`). Il n'existe **aucun** `Math.random()`
dans `src/` — cette contrainte est déjà vérifiée par l'audit V9.5.4 et doit être préservée pour
tout code de décor futur.

Le background décoratif ne doit **jamais** être une image unique statique. Il doit être :
- soit généré déterministement à partir de la seed (mêmes helpers que `tacticalMapSeed.ts`) ;
- soit assemblé en chunks/tuiles/patterns décoratifs alignés sur les zones déjà générées
  (`tissueZones`, `vesselPaths`, `combatSites`, `lymphaticExits` dans `TacticalMapDefinition`,
  fichier `src/game/data/tacticalMaps.ts`) ;
- soit enrichi à partir des metadata visuelles déjà présentes (`v11VisualMetadata.ts`,
  `visualIdentity` dans `bodyRegions.ts`, `TacticalMapVisualHints` dans `tacticalMaps.ts`).

**Point d'ancrage concret déjà existant** : chaque template de carte définit un objet
`visual: TacticalMapVisualHints` (`backgroundHint`, `vesselVisualHint`, `tissueVisualHint`,
`lymphVisualHint`, `diapedesisVisualHint`, `infectionVisualHint`, `inflammationVisualHint`,
`lightingHint`, `animationNotes`, `v11PolishNotes`). Un des `v11PolishNotes` actuels dit déjà
littéralement *"Replace circles and lines with original pixel-art biological tiles."* — c'est
l'intention déjà écrite dans le code pour V11.2. Le Layer A décoratif devrait dériver de ces
hints par `regionType`/template plutôt que d'inventer un système parallèle.

Ne pas remplacer : génération de map, metadata V11, logique des régions, logique des vaisseaux,
logique des entrées/sorties, pathfinding, gameplay RTS semi-guidé.

---

## 4. Règles pixel-art

- chaque unité identifiable en moins d'une seconde ;
- chaque famille visuelle a une couleur dominante ;
- éviter les micro-détails illisibles ;
- 3 à 5 valeurs (tons) max par élément important ;
- effets visuels courts et informatifs ;
- lisibilité > réalisme.

---

## 5. Palette candidate — vue d'ensemble

Voir le détail hex en section 6. Résumé par catégorie (esprit approuvé, à respecter même si les
codes hex évoluent) :

- **Tissu** : rose violacé, mauve, prune, violet sombre dans les creux.
- **Vaisseaux sanguins** : rouge profond, bordeaux, rouge violacé.
- **Lymphe** : cyan, turquoise, vert-jaune léger.
- **Unités immunitaires** : bleu, violet, cyan, rose, orange en accent.
- **Pathogènes** : orange toxique, jaune agressif, rouge chaud, vert acide selon sous-types.
- **Effets** : inflammation orange/rouge pulsant ; cytokines particules lumineuses ; anticorps
  blanc/lilas/violet clair ; interférons bleu-cyan lumineux ; ordres RTS clairs mais discrets.

---

## 6. Palette hex candidate stable — à validation humaine

Cette palette n'est pas définitivement approuvée du simple fait d'être écrite ici. Voir section 14
pour le journal de suivi des changements, et section 13 pour les décisions déjà tranchées depuis
le premier rapport.

### 6.1 Tissu biologique (Layer A)
| Usage | Hex | Note |
|---|---|---|
| Base tissu clair | `#E8B4D9` | rose violacé lumineux |
| Tissu médium | `#C77DB8` | mauve |
| Tissu profond | `#8E4A8C` | prune |
| Creux / ombre | `#4A2A52` | violet sombre |
| Membrane / fibre | `#B590C7` | violet doux, contours de structures |

### 6.2 Vaisseaux sanguins (Layer A/B)
| Usage | Hex | Note |
|---|---|---|
| Vaisseau base | `#7A1F3D` | bordeaux — **proche de l'existant** `0x79314d` déjà utilisé dans `MissionScene.ts` |
| Vaisseau flux | `#B0335C` | rouge violacé — proche de l'existant `0xd94f6a` |
| Vaisseau highlight | `#E8879F` | rouge clair — proche de l'existant `0xff9faf` |
| Vaisseau profond | `#4D1428` | rouge très sombre, ombre |

### 6.3 Lymphe / sorties lymphatiques (Layer A/B)
| Usage | Hex | Note |
|---|---|---|
| Lymphe base | `#3FD9C7` | cyan turquoise |
| Lymphe claire | `#7FF0E0` | cyan pâle, portail lumineux |
| Lymphe accent | `#C7E86B` | vert-jaune léger |
| Lymphe sombre | `#1F8A7D` | contour/ombre |

**Conflit connu avec le code actuel** : `MissionScene.ts` dessine aujourd'hui les sorties
lymphatiques en jaune/vert (`0xf8d84a`, `0x99e27b`), sans cyan. Voir section 12 (risques) et
section 13 (décision : cyan/turquoise dominant confirmé).

### 6.4 Unités immunitaires (Layer B)
| Unité | Hex proposé | Existant en jeu (`getImmuneUnitColor`, `MissionScene.ts`) |
|---|---|---|
| Macrophage | `#4FD3C4` | `0x62d3c8` (turquoise) — cohérent |
| Neutrophile | `#FFC76B` | `0xffc76b` (ambre) — identique, déjà figé |
| Cellule dendritique | `#B69CFF` | `0xb69cff` (violet lavande) — identique, déjà figé |
| Plasmocyte / B | `#F7E9C7` | `0xf7f0d8` (crème pâle) — proche |
| NK | `#5FD3FF` | `0x5fd3ff` (bleu ciel) — identique, déjà figé |
| T cytotoxique | `#F06CD6` | `0xf06cd6` (magenta) — identique, déjà figé |
| Accent commun (highlight sélection) | `#FFA84D` | orange d'accent, contours/sélection |

Ces couleurs runtime existent déjà en dur dans `MissionScene.ts:1403-1425`
(`getImmuneUnitColor`) et sont réutilisées comme base plutôt que réinventées : c'est déjà la
palette "bleu, violet, cyan, rose, orange en accent" demandée en section 5 du brief. La palette
candidate ci-dessus **aligne** les hex figés sur l'existant au lieu de les contredire.

### 6.5 Pathogènes (Layer B)
| Famille | Hex proposé | Note |
|---|---|---|
| Bactéries | `#FF8C3F` | orange toxique |
| Bactéries agressives | `#FF3B3B` | rouge chaud |
| Virus | `#8C2FD9` | violet-indigo — **volontairement décalé du bleu/cyan** utilisé par les unités immunitaires (voir risque section 12 et décision section 13) |
| Champignons | `#9ACD32` | vert acide |
| Parasites / menaces lourdes | `#C77B3F` | ambre brun |
| Cellules anormales / cancer | `#B23A6B` | magenta sourd, distinct des T cytotoxiques |

### 6.6 Inflammation (Layer B, effet)
| Usage | Hex |
|---|---|
| Cœur pulsant | `#FF5A3C` |
| Halo | `#FF9F43` |
| Bord critique | `#FF2E4D` |

### 6.7 Cytokines / interférons / anticorps (VFX)
| Élément | Hex |
|---|---|
| Cytokines (particules) | `#FFD75E` |
| Interférons | `#3FD1F0` |
| Anticorps | `#F5F0FF` (blanc lilas) / `#C7A8FF` (violet clair) |

### 6.8 HUD / UI
| Usage | Hex | Note |
|---|---|---|
| Fond principal | `#101820` | **existant**, `src/styles/globals.css` / `layout.css` |
| Fond dégradé mid | `#172233` | **existant** |
| Fond dégradé violet | `#251B2E` | **existant** |
| Texte principal | `#F5FBFF` | **existant** |
| Texte secondaire | `#C7D7DF` | **existant** |
| Accent principal | `#62D3C8` | **existant**, cyan HUD |
| Succès / santé | `#7EE28A` | **existant** |
| Alerte / danger | `#FF7F8F` | **existant** |
| Warning | `#FFC76B` | **existant** |
| Adaptatif / mémoire | `#B69CFF` | **existant** |

Le HUD a déjà une palette sombre bio-tech cohérente (fond marine → violet, accents saturés) dans
`src/styles/layout.css` (~1111 lignes, couleurs en dur, pas de variables CSS). V11.1 doit
**étendre** cette base plutôt que la remplacer.

---

## 7. Grille pixel-art et résolution de référence

- Unités principales : **32×32 px**.
- Petites entités / projectiles / particules : **16×16** ou **20×20 px**.
- Grosses entités importantes (boss, structures) : **32×32 px ou plus**, à valider au cas par cas.
- Éléments de carte : chunks/tuiles/patterns adaptés à l'échelle de `TacticalMapDefinition`
  (`width`/`height`/`worldWidth`/`worldHeight`, variables selon `mapSizeCategory`).

Rendu crisp dans Phaser :
- `createPhaserConfig.ts` a déjà `render: { pixelArt: true, antialias: false }` — **le mode
  pixel-art est déjà activé**, aucune configuration Phaser à ajouter pour ça.
- `scale.mode: Phaser.Scale.FIT` avec `autoCenter: CENTER_BOTH` : le canvas est redimensionné en
  fonction du viewport (960–1920 × 620–1080), ce qui peut introduire un scaling non entier. À
  surveiller en V11.2/V11.3 : préférer un zoom caméra à valeurs entières (1x, 2x, 3x) pour éviter
  le shimmer sur du pixel-art.
- Aucun `camera.setZoom` explicite n'a été trouvé actuellement (`MissionScene.ts` utilise
  `camera.zoom` en lecture pour les bornes, donc zoom implicite = 1). Une fois des sprites 32×32
  intégrés, il faudra probablement fixer un zoom caméra RTS cohérent avec la taille des
  `TacticalMapDefinition` existantes.
- Lisibilité caméra RTS : à la taille de caméra actuelle (grandes cartes `huge`/`large` testées en
  V9.5.3), un détail plus petit qu'environ 2-3 px à l'écran devient inutile. Éviter les détails
  fins sur les sprites 16×16 qui ne survivront pas au zoom RTS par défaut.

---

## 8. Formats de fichiers et conventions de nommage

### 8.1 Formats
- PNG avec alpha pour tous les sprites.
- Spritesheets PNG pour les animations.
- Atlas JSON (format Phaser `atlas`) uniquement si le nombre de frames par entité le justifie ;
  sinon, spritesheets simples suffisent pour V11.3.
- Dossier recommandé pour les nouveaux assets : `src/assets/sprites/` (déjà présent, contient
  un sous-dossier `placeholders/` vide) et `src/assets/audio/` (vide) pour le son. Ces dossiers
  existent déjà mais ne sont reliés à **aucun** loader Phaser pour l'instant (voir section 12,
  risque 5, et section 13, sous-étape V11.3A).

### 8.2 Convention de nommage des fichiers — **basée sur `futureSpriteKey` existant**

Le projet a **déjà** une convention de clé de sprite dans les données (`units.ts`, `pathogens.ts`
partiellement, `treatments.ts`, `bodyRegions.ts`, `v11VisualMetadata.ts`), via le champ
`futureSpriteKey`. Exemples réels déjà présents dans le code :

- `unit_macrophage`, `unit_neutrophil`, `unit_dendritic`, `unit_plasmocyte`, `unit_nk`,
  `unit_cytotoxic_t` (`src/game/data/units.ts`)
- `treatment_antibiotic`, `treatment_antiviral`, `treatment_anti_inflammatory`
  (`src/game/data/treatments.ts`)
- `cell_civilian`, `cell_infected`, `fx_antibody_y`, `fx_cytokines`, `fx_inflammation_zone`,
  `building_lymph_node`, `building_lymph_exit`, `ui_vaccination`, `ui_immune_memory`
  (`src/game/data/v11VisualMetadata.ts`)
- `region_skin` et équivalents par région (`src/game/bodyMap/bodyRegions.ts`)

**Règle** : le nom de fichier doit reprendre le `futureSpriteKey` existant tel quel, suffixé par
l'état d'animation :

```
unit_macrophage_idle.png
unit_macrophage_move.png
unit_macrophage_attack.png
unit_macrophage_hurt.png
unit_macrophage_death.png
fx_cytokines_burst.png
building_lymph_exit_idle.png
```

**Gap identifié** : `PathogenVisualIdentity` (`src/game/data/pathogens.ts`) n'a **pas** de champ
`futureSpriteKey` contrairement aux autres entités (voir section 12, risque 6, et section 13). Il
faudra l'ajouter en V11.3A/V11.3 en suivant le même schéma, par exemple `pathogen_{id}` à partir
de l'`id` existant (ex. `respiratoryVirus` → `pathogen_respiratory_virus`). Ce n'est **pas** fait
dans ce document.

### 8.3 Convention de nommage des animations Phaser

Clé de texture Phaser = `futureSpriteKey` tel quel (ex. `unit_macrophage`).
Clé d'animation = `{futureSpriteKey}.{état}`, cohérent avec la casse déjà utilisée dans le code
(camelCase pour les id, snake_case pour les futureSpriteKey) :

```
unit_macrophage.idle
unit_macrophage.move
unit_macrophage.attack
unit_macrophage.hurt
unit_macrophage.death
```

Aucune convention d'animation Phaser n'existe encore dans le code (`this.anims.create` : 0
occurrence trouvée). Cette convention doit être posée dès la première intégration en V11.3 pour
éviter une intégration ad hoc.

---

## 9. Standard minimal des animations

| État | Frames | FPS cible |
|---|---|---|
| Idle | 2 à 4 | 4 à 6 |
| Move | 4 à 6 | 6 à 10 |
| Attack | 3 à 5 | 8 à 12 |
| Hurt | 1 à 2 | bref, lisible |
| Death / despawn | 3 à 5 | bref, non gore, propre |
| Effets courts (VFX) | 3 à 8 selon importance | selon durée d'effet gameplay |

Aucune convention d'animation Phaser n'existant déjà dans le projet, ce standard n'a pas besoin
d'être adapté à un système existant — il devient la référence de départ pour V11.3.

---

## 10. Accessibilité et lisibilité couleur

Règles :
- ne jamais porter une information gameplay uniquement par la couleur ;
- différencier aussi par silhouette, contour, icône, mouvement, texture ;
- vérifier que vaisseaux, lymphe, infection, unités et pathogènes restent distinguables ;
- penser aux formes de daltonisme courantes (protanopie/deutéranopie surtout, qui compriment
  rouge/vert et bleu/violet — deux paires très présentes dans cette palette) ;
- garder un contraste suffisant entre Layer B (interactif, net) et Layer A (décoratif, doux).

Applications concrètes pour Immunostrat :
- la lymphe (cyan) doit aussi avoir une forme de portail/sortie spécifique, pas juste une couleur ;
- l'infection/inflammation (orange-rouge) doit avoir une texture pulsante, pas juste une teinte ;
- les pathogènes doivent avoir des silhouettes plus hostiles (anguleuses, épineuses, asymétriques)
  que les cellules immunitaires (rondes, membranes lisibles) — la silhouette porte la distinction
  ami/ennemi, pas seulement la couleur ;
- les unités immunitaires gardent des contours/noyaux lisibles même en cas de mauvaise perception
  des couleurs.

**Point d'attention spécifique identifié pendant l'inspection** : `pathogens.ts` donne déjà aux
virus des `colorHint` dans la famille bleu/cyan/indigo (`"bleu clair"`, `"cyan vif"`,
`"bleu-violet"`, `"bleu indigo"`) — la **même famille chromatique** que la palette approuvée pour
les unités immunitaires (bleu/violet/cyan). C'est un risque de confusion ami/ennemi si la couleur
seule est utilisée. La palette candidate (section 6.5) décale volontairement les virus vers
violet-indigo plus saturé et distinct, mais la vraie garantie de lisibilité doit venir de la
silhouette (capside à pointes anguleuse vs cellule ronde à membrane lisse), pas du hex seul.

---

## 11. Articulation avec les fichiers réels du projet (inventaire, lecture seule)

### 11.1 Dossiers d'assets existants
- `src/assets/sprites/placeholders/` — existe, **vide**.
- `src/assets/audio/` — existe, **vide**.
- `public/` — contient seulement `favicon.svg`.
- `src/game/render/` — dossier existe, **vide**, non utilisé actuellement.
- `src/game/scenes/` — dossier existe, **vide**, non utilisé actuellement (distinct de
  `src/game/phaser/scenes/`, qui est le vrai emplacement des scènes actives — voir risque
  section 12).

### 11.2 Scènes Phaser (`src/game/phaser/scenes/`)
- `BootScene.ts` — démarre, transition immédiate vers `PreloadScene`.
- `PreloadScene.ts` — transition immédiate vers `MissionScene` + lance `UIScene`. **Aucun
  chargement d'asset actuellement** (`this.load.*` : 0 occurrence dans tout le projet).
- `MissionScene.ts` (~1460 lignes) — scène principale : rendu de la carte tactique via
  `Graphics` en immediate-mode (formes procédurales, pas de sprites), input RTS
  (sélection/ordres clic gauche, caméra clic droit + WASD/ZQSD), simulation tick, publication de
  snapshots vers React.
- `UIScene.ts` — overlay quasi vide, un seul texte placeholder "V1 - placeholder gameplay
  prototype".

### 11.3 Chargement de textures
Aucun loader Phaser (`this.load.image` / `this.load.spritesheet` / `this.load.atlas`) n'existe
dans le projet. Toute l'intégration d'assets (loader dans `PreloadScene.ts`, manifest de clés,
appel `this.anims.create`) reste à construire en V11.3 — ce n'est pas un ajout mineur, c'est une
brique technique à part entière.

### 11.4 Rendu / couleurs runtime actuelles (`MissionScene.ts`)
Rendu 100% procédural avec couleurs en dur (`0xRRGGBB`) :
- fond de carte : `0x101820` / `0x203141` (bleu-gris sombre) ;
- zones de tissu : tons verts/olive (`0x9fcf58`, `0xd7b75b`, `0x78b96c`, `0x65b878`) — **en
  conflit avec la nouvelle direction tissu rose/mauve/prune** (voir risques) ;
- vaisseaux : `0x79314d` / `0xd94f6a` / `0xff9faf` (bordeaux → rouge violacé → rose clair) —
  **déjà cohérent** avec la palette candidate section 6.2 ;
- sorties lymphatiques : `0xf8d84a` (jaune) / `0x99e27b` (vert) — **pas de cyan actuellement**,
  conflit partiel avec la direction lymphe (voir risques) ;
- sites de combat/infection : `0xff7f33` / `0xff4f5d` / `0xff9f43` / `0x9b243d` (orange-rouge,
  cœur bordeaux) — cohérent avec la direction inflammation ;
- couleurs d'unités (`getImmuneUnitColor`, ligne ~1403) et d'effets (`getEffectColor`, ligne
  ~1427) — déjà largement alignées avec la palette candidate section 6.4/6.7.

### 11.5 Fichiers de metadata visuelle (source de vérité pour les futurs assets)
- `src/game/data/v11VisualMetadata.ts` — 9 entités transverses (cellule civile, infectée,
  anticorps, cytokines, inflammation, nœud lymphatique régional, sortie lymphatique,
  vaccination, mémoire immunitaire), chacune avec `shapeHint`, `colorHint`, `silhouetteHint`,
  `animationHint`, `effectHint`, `sizeClass`, `movementStyle`, `vfxTags`, `futureSpriteKey`,
  `futureSoundHint`.
- `src/game/data/units.ts` — 6 unités immunitaires, même structure `visualIdentity`.
- `src/game/data/pathogens.ts` — ~30 sous-types de pathogènes, structure `PathogenVisualIdentity`
  proche mais **sans** `futureSpriteKey`/`futureSoundHint`.
- `src/game/data/treatments.ts` — 3 traitements avec `visualIdentity` + `futureSpriteKey`.
- `src/game/bodyMap/bodyRegions.ts` — 8 régions du corps, chacune avec `visualIdentity`.
- `src/game/data/tacticalMaps.ts` — `TacticalMapVisualHints` par template de carte
  (`visualThemeHint`, `backgroundHint`, `vesselVisualHint`, `tissueVisualHint`,
  `lymphVisualHint`, `diapedesisVisualHint`, `infectionVisualHint`, `inflammationVisualHint`,
  `lightingHint`, `animationNotes`, `v11PolishNotes`).

### 11.6 Fichiers HUD/UI React concernés
- `src/pages/GamePage.tsx` — HUD de bataille principal (en-tête mission, briefing, cadre canvas
  Phaser, overlay résultat, `hud-strip` dense avec ~20 items). Fichier unique et dense, pas de
  sous-composants — c'est le point d'entrée pour V11.1.
- `src/pages/BodyMapPage.tsx` — carte du corps, régions, renforts, alertes.
- `src/pages/CampaignPage.tsx`, `HomePage.tsx`, `NormalGamePage.tsx`, `InfinitePage.tsx` — pages
  de navigation/menus.
- `src/ui/Button.tsx`, `src/ui/Panel.tsx` — seuls composants UI atomiques partagés.
- `src/styles/globals.css`, `src/styles/layout.css` (~1111 lignes) — tout le style HUD, couleurs
  en dur, **aucune variable CSS** actuellement.

### 11.7 Fichiers map/génération/metadata (référence uniquement, ne pas modifier)
- `src/game/data/tacticalMapSeed.ts` — PRNG déterministe (`createSeededRandom`,
  `createRunSeed`).
- `src/game/data/tacticalMapGenerator.ts` — génération de cartes à partir de templates, retries
  + fallback déterministe.
- `src/game/data/runtimeTacticalMap.ts` — sélection de carte runtime par mission/préparation.
- `src/game/data/mapScaleBalance.ts` — scaling des grandes cartes.
- `src/game/bodyMap/bodyMapGenerator.ts` — génération des crises régionales (partie normale).
- `src/game/data/infiniteMode.ts` — phases/mutateurs/score du mode infini.

### 11.8 Où V11.1/V11.2/V11.3 devront probablement intervenir (descriptif, pas une TODO list gameplay)
- V11.1 : `src/pages/GamePage.tsx`, `src/styles/layout.css`, `src/styles/globals.css`.
- V11.2 : `src/game/phaser/scenes/MissionScene.ts` (remplacement progressif des `Graphics`
  procéduraux par textures/tuiles), `src/game/phaser/scenes/PreloadScene.ts` (premier loader),
  `src/game/data/tacticalMaps.ts` (lecture des `TacticalMapVisualHints` existants, pas de
  modification de structure de données gameplay).
- V11.3 : `src/game/phaser/scenes/PreloadScene.ts` (loader complet + atlas), nouveau fichier
  d'enregistrement d'animations (à créer, emplacement à décider en V11.3 — probablement
  `src/game/phaser/` ou un nouveau dossier dédié), `src/game/data/pathogens.ts` (ajout du champ
  `futureSpriteKey` manquant — modification de data, pas de gameplay).

---

## 12. Risques techniques identifiés

1. **Conflit de palette tissu** : le rendu actuel (`MissionScene.ts` + `TacticalMapVisualHints.
   backgroundHint`) décrit un tissu **vert** ("soft green tissue field"), alors que la nouvelle
   direction approuvée demande un tissu **rose violacé/mauve/prune**. Décision à prendre
   explicitement en V11.2 (recolorer le placeholder existant ou transitionner progressivement) —
   pas une correction automatique.
2. **Conflit partiel lymphe** : sorties lymphatiques actuellement jaune/vert dans le code,
   palette candidate = cyan/turquoise/vert-jaune. Cyan absent du rendu actuel.
3. **Chevauchement chromatique virus / unités immunitaires** : les `colorHint` de virus dans
   `pathogens.ts` (bleu/cyan/indigo) recoupent la famille de couleurs des unités immunitaires.
   Nécessite un traitement silhouette-first en V11.3 (voir section 10).
4. **Deux dossiers stubs vides et ambigus** : `src/game/render/` et `src/game/scenes/` existent
   mais sont vides et **non utilisés** — les scènes réelles sont dans
   `src/game/phaser/scenes/`. Risque de confusion si un futur travail crée une structure de
   rendu concurrente dans le mauvais dossier. À clarifier avec l'utilisateur avant d'y placer du
   code en V11.2+ (ou les supprimer si confirmés obsolètes — décision hors scope V11.0).
5. **Aucune infrastructure de chargement/animation Phaser n'existe** : `this.load.*` et
   `this.anims.create` ont 0 occurrence dans le projet. La première intégration de sprite en
   V11.3 doit construire cette brique de zéro (loader, manifest de clés, atlas éventuel), pas
   juste "ajouter une image".
6. **`pathogens.ts` n'a pas de `futureSpriteKey`** contrairement aux autres entités data-driven
   (units, treatments, régions, v11VisualMetadata) — gap à combler en V11.3 par une modification
   de data ciblée, pas en V11.0.
7. **Bundle mono-chunk déjà signalé comme lourd** par l'audit V9.5.4 (risque connu, non
   bloquant). L'ajout de nombreux PNG/atlas en V11.2/V11.3 doit rester surveillé pour ne pas
   aggraver ce point (pas de contrainte technique nouvelle imposée ici, juste une vigilance).
8. **`layout.css` (~1111 lignes) n'a aucune variable CSS** — toutes les couleurs sont en dur et
   répétées. Introduire une palette centralisée en V11.1 impliquera une décision (variables CSS
   vs fichier de constantes JS/TS consommé par React) qui n'est pas prise dans ce document
   (voir section 13, sous-étape V11.1A, et section 15).
9. **Scale mode Phaser `FIT`** peut introduire un scaling non entier du canvas, ce qui peut
   dégrader la netteté du pixel-art une fois de vrais sprites en place — à vérifier
   concrètement dès les premiers sprites (V11.3), pas un problème avéré aujourd'hui.

---

## 13. Décisions post-rapport (V11.0B)

Passe de clarification (V11.0B, documentation only) suite à relecture du guide V11.0. Ces points
ne changent aucun code : ils figent des décisions de direction pour lever l'ambiguïté sur certains
risques de la section 12. Ils s'appliquent seulement quand les sous-étapes correspondantes
(V11.1A, V11.2, V11.3A, V11.3) démarreront réellement — pas maintenant.

- **Tissu** : le vert actuellement dessiné par `MissionScene.ts` (tons `0x9fcf58`/`0xd7b75b`/
  `0x78b96c`/`0x65b878`) et décrit dans `TacticalMapVisualHints.backgroundHint`
  ("soft green tissue field") est un **placeholder hérité** de V9.5.x, pas une direction
  artistique voulue. Direction finale pour V11.2 : tissu **rose/mauve/prune** (voir section 6.1).
- **Sorties lymphatiques** : direction finale = **cyan/turquoise dominant**, avec un accent
  vert-jaune léger toléré en complément, jamais comme couleur principale. Le jaune/vert
  actuellement codé en dur (`0xf8d84a`, `0x99e27b`) est lui aussi un placeholder hérité, à corriger
  en V11.2 (voir section 6.3).
- **Virus bleu/cyan** : le chevauchement avec la palette des unités immunitaires
  (bleu/violet/cyan) est confirmé comme risque réel, pas une fausse alerte. Décision : la
  distinction ami/ennemi doit être **obligatoirement portée par la silhouette** (capside
  anguleuse/à pointes pour les virus vs cellule ronde à membrane lisse pour les unités) — la
  couleur seule ne suffit jamais, même une fois la palette validée (voir section 10).
- **Scènes Phaser** : `src/game/phaser/scenes/` est confirmé comme le **chemin Phaser canonique**
  réellement utilisé par le jeu (Boot → Preload → Mission + UI). `src/game/render/` et
  `src/game/scenes/` restent des **dossiers stubs vides et ambigus** : ne pas y placer de code
  d'intégration visuelle sans vérification explicite avec l'utilisateur, y compris en V11.2/V11.3.
- **Pipeline asset Phaser** : l'absence actuelle de loader/atlas/animations (`this.load.*` et
  `this.anims.create` : 0 occurrence) est confirmée. Cette brique ne doit pas être improvisée au
  milieu d'une intégration de sprites : elle devient une sous-étape dédiée,
  **V11.3A — Asset pipeline Phaser**, à traiter avant l'intégration massive d'unités/pathogènes
  (voir section 16).
- **`pathogens.ts` sans `futureSpriteKey`** : confirmé — c'est le seul fichier de data visuelle du
  projet à ne pas avoir ce champ. Un mapping visuel équivalent (`futureSpriteKey` par sous-type de
  pathogène) devra être ajouté en V11.3A/V11.3, comme modification de data ciblée et non gameplay.
- **`layout.css` sans variables CSS** : confirmé (~1111 lignes, couleurs en dur, répétées).
  Plutôt qu'une réécriture complète du fichier, prévoir une sous-étape dédiée
  **V11.1A — UI theme tokens**, qui introduit progressivement des variables CSS sans réécrire tout
  `layout.css` (voir section 16).
- **Palette hex** : reste une **palette candidate stable**, pas définitivement validée du simple
  fait d'être écrite dans ce document. Pas d'usage massif en V11.1/V11.2/V11.3 avant relecture
  humaine explicite (voir section 6 et section 14).

---

## 14. Versioning de la palette

La palette de la section 6 est une **palette candidate stable**, pas irréversible. Tout
changement de couleur pendant V11.1 à V11.4 doit être documenté ici, dans une table de suivi,
avec : ancienne couleur, nouvelle couleur, raison, zone concernée (HUD / carte / unités /
pathogènes / effets).

### Journal des changements de palette
| Date | Ancienne couleur | Nouvelle couleur | Raison | Zone |
|---|---|---|---|---|
| — | — | — | Aucun changement enregistré depuis V11.0 | — |

Aucun changement de palette ne doit être fait silencieusement dans le code.

---

## 15. Ancrage technique futur de la palette (recommandation, pas une modification de code)

Aucun fichier de constantes/thème n'est créé en V11.0. Recommandation pour plus tard :

- Créer un fichier de données dédié, dans l'esprit des fichiers existants sous
  `src/game/data/` (ex. `src/game/data/v11Palette.ts`), exportant les hex par catégorie
  (tissu, vaisseaux, lymphe, unités, pathogènes, inflammation, VFX, HUD). C'est cohérent avec la
  convention déjà en place (`balance.ts`, `units.ts`, `pathogens.ts` sont déjà des fichiers de
  constantes data-driven dans ce dossier).
- Ce fichier serait consommé :
  - côté Phaser (`MissionScene.ts` et futurs fichiers de rendu) sous forme numérique
    (`0xRRGGBB`), pour remplacer les couleurs en dur actuelles ;
  - côté React/CSS (`layout.css`, `globals.css`) sous forme de chaîne (`#RRGGBB`), potentiellement
    via des variables CSS `--color-*` si `layout.css` est refactoré en V11.1.
- Ne pas dupliquer les valeurs à deux endroits différents une fois ce fichier créé — mais ce
  n'est **pas** fait dans ce document, c'est une recommandation pour V11.1+.

---

## 16. Priorités V11

- **V11.0** : documenter la direction artistique et les règles d'assets (ce document).
- **V11.0B** : passe de corrections documentation-only sur ce guide et le skill associé (voir
  section 13).
- **V11.1** : HUD / UI polish (`GamePage.tsx`, `layout.css`).
  - **V11.1A — UI theme tokens** : introduction progressive de variables CSS dans `layout.css`,
    sans réécrire tout le fichier. Objectif : centraliser les couleurs déjà en dur (section 6.8)
    sous forme de tokens réutilisables, en gardant le rendu HUD identique à l'existant.
- **V11.2** : carte biologique pixel-art — Layer A (background décoratif seed-based) et Layer B
  (foreground interactif), `MissionScene.ts`.
- **V11.3** : unités, pathogènes, sprites, animations.
  - **V11.3A — Asset pipeline Phaser** : construction du loader (`PreloadScene.ts`), du manifest
    de clés (`futureSpriteKey`), des spritesheets et des premières animations, validés sur **un
    seul asset pilote** avant toute intégration massive d'unités/pathogènes.
- **V11.4** : effets visuels, feedback, particules.
- **V11.5** : sons, menus, écrans finaux, polish complet.

Ce document prépare V11.1 sans le commencer.

---

## 17. Ce que ce document ne fait pas

- Ne modifie aucun fichier de gameplay, simulation, génération de carte ou logique seed.
- Ne refactore rien.
- Ne crée aucun sprite.
- Ne crée aucun fichier de constantes/thème dans le code.
- Ne commence pas V11.1/V11.2/V11.3.
