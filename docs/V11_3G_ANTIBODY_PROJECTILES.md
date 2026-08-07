# Immunostrat V11.3G — projectiles d’anticorps guidés

## Fonction réellement implémentée

L’attaque automatique du plasmocyte déclenche maintenant une salve de trois
anticorps. Le cooldown et les dégâts totaux existants sont conservés : les
trois projectiles partagent le résultat du calcul de dégâts de l’attaque.

- Les dégâts ne sont plus instantanés.
- La salve commence pendant l’animation `SECRETE`.
- Les trois anticorps partent successivement, espacés de `240 ms`.
- Chaque projectile suit une courbe quadratique jusqu’à sa cible mobile.
- Si la cible meurt avant l’arrivée, le projectile recherche une menace vivante
  proche.
- Sans cible de remplacement, le projectile expire sans créer de cible fantôme.
- À l’arrivée, l’animation `IMPACT` joue puis passe à la boucle `FIXED`.

La Neutralisation massive reste une capacité globale distincte et n’utilise pas
ces projectiles.

## Rôle de support

Le plasmocyte peut désormais soutenir un front sans entrer dans le cercle de
bataille :

- cercle d’activation et portée de tir : 440 px ;
- vitesse pendant l’activation : 35 % de la vitesse normale ;
- poursuite maximale autour de son point de garde : 500 px ;
- rayon de garde : 90 px.

Une cible vivante située dans le cercle de 440 px active le plasmocyte, ralentit
son déplacement et déclenche la sécrétion dès que le cooldown est prêt. Une
menace au-delà du cercle ne l’active pas ; la limite de 500 px empêche une
poursuite à travers toute la carte.

## Sources et préparation

| Source | Dimensions | Alpha source | Production |
|---|---:|---:|---|
| `anticorps-1.png` | 1448 × 1086 RGB | aucun | 192 × 160 RGBA |
| `anticorps-impact-spritesheet.png` | 1448 × 1086 RGB | aucun | 384 × 80 RGBA |

Les fonds verts ont été retirés par couleur clé. Les labels ont été exclus des
zones de découpe. Toutes les frames sont normalisées sur des canvases 48 × 40,
avec une échelle commune de 0,375 pour le vol et 0,4190476 pour l’impact.
Le rendu Phaser applique ensuite une échelle uniforme de 0,28 aux projectiles
et aux anticorps fixés, sans étirement ni rééchantillonnage du spritesheet.

## Matrice de couverture

| État gameplay | Animation | Couverture |
|---|---|---|
| Vol vers la droite | `RIGHT` | 4 frames en boucle |
| Vol vers le haut-droite | `UP-RIGHT` | 4 frames en boucle |
| Vol vers le bas-droite | `DOWN-RIGHT` | 4 frames en boucle |
| Vol vers la gauche | `LEFT` | 4 frames en boucle |
| Haut-gauche / bas-gauche | diagonales retournées horizontalement | couvert |
| Vertical haut / bas exact | diagonale la plus proche | approximation |
| Collision | `IMPACT` | 8 frames, une fois |
| Anticorps fixé | `FIXED` | 8 frames en boucle pendant la durée de l’effet |
| Texture ou animation absente | Y procédural | fallback conservé |

## Intégration

- Simulation : `antibodyProjectileSystem.ts`
- Rendu : `AntibodyProjectileVisualController.ts`
- Manifest central : `entitySpriteManifest.ts`
- Projectiles et impacts restent séparés des overlays et de la simulation
  d’entités Phaser.

Le seul état visuel non fourni exactement est le vol strictement vertical. La
direction diagonale la plus proche est utilisée ; aucune rotation lissée ou
déformation du pixel art n’est appliquée.

Le viewer de développement est accessible avec
`?plasmocyteDebug=1&antibodyDebug=1`. Il présente les directions, l’impact,
l’état fixé et une salve de trois trajectoires courbes sans modifier la
progression de campagne.
