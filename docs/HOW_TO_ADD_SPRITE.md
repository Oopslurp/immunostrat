# Ajouter une spritesheet d'entité

Le pipeline V11.3A est piloté par `src/game/phaser/assets/entitySpriteManifest.ts`.
Le rendu procédural de `MissionScene` reste le fallback tant qu'une entrée est désactivée,
que sa texture ne charge pas ou que l'animation demandée manque.

## 1. Placer et nommer le fichier

Place les fichiers servis par Phaser sous :

```text
public/assets/sprites/units/<entity>/
public/assets/sprites/tissue/<entity>/
public/assets/sprites/pathogens/<entity>/
public/assets/sprites/effects/<entity>/
```

Utilise la clé `futureSpriteKey` déjà définie dans les données quand elle existe. Pour le
macrophage : `unit_macrophage.png`, chargé avec la clé Phaser `unit_macrophage`.

## 2. Déclarer l'asset

Ajoute une `EntitySpriteDefinition` au manifest. Renseigne le type (`image`, `spritesheet` ou
`atlas`), le chemin public, la taille d'une frame, le nombre de frames et la grille. Une entrée
invalide est ignorée afin de préserver le fallback.

Pour un atlas, ajoute aussi `atlasDataPath`. N'active l'entrée (`enabled: true`) qu'après avoir
ajouté les fichiers et confirmé leur découpage.

## 3. Déclarer les animations

Chaque état déclare une plage de frames, une fréquence et `repeat` (`-1` pour une boucle, `0`
pour une lecture unique). Les clés suivent cette convention :

```text
unit.macrophage.idle
unit.macrophage.move
unit.macrophage.attack
unit.macrophage.phagocytosis
unit.macrophage.hurt
unit.macrophage.death
```

Le registre ne recrée jamais une animation Phaser existante. Si l'animation demandée manque,
le resolver essaie `idle`, puis demande le fallback procédural.

## 4. Régler l'ancrage, l'échelle et les offsets

- `anchor` utilise les coordonnées Phaser normalisées de 0 à 1.
- `visualOffset` déplace seulement l'image, jamais la position de simulation.
- `scale` règle la taille d'affichage.
- `attachmentPoints` utilise des pixels locaux relatifs au centre visuel du sprite.

Le macrophage actuel a un rayon de 24 px, soit environ 48 px de diamètre. La feuille V11.3B
utilise 48 frames de 64 x 64 px, un ancrage bas-centre, un offset vertical de 24 px et un scale
Phaser de `1`. La silhouette garde ainsi sa taille de gameplay avec des pixels nets. La caméra
reste actuellement à un zoom de 1 et la configuration utilise `pixelArt: true`, nearest-neighbor
et `antialias: false`.

## 5. Tester une intégration

1. Ajoute le fichier sous `public/assets/sprites/...`.
2. Corrige les dimensions et plages de frames dans le manifest.
3. Passe l'entrée à `enabled: true`.
4. Lance `npm test` puis `npm run build`.
5. Vérifie dans le jeu que l'image est nette et que la silhouette garde la taille attendue.
6. Renomme temporairement le fichier ou désactive l'entrée pour confirmer que le rendu
   procédural reprend sans texture manquante.

Le macrophage est le premier remplacement effectif V11.3B. Son contrôleur visuel est isolé de
la simulation et conserve le rendu procédural si la texture ou les animations sont absentes.

## Debug macrophage

En développement uniquement, ajoute `?macrophageDebug=1` à l'URL d'une bataille. Les touches
`1` à `6` forcent idle, move, attack, phagocytosis, hurt et death. `F` teste le flip horizontal,
et `[` / `]` modifient temporairement la vitesse. Ce viewer n'est jamais activé en production.
