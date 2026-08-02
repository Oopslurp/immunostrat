# V11.3B — Macrophage animé

## Asset livré

- Source reçue : planche RGB de 1448 × 1086 px, damier et labels aplatis, sans canal alpha.
- Extraction : `scripts/extract_macrophage_sheet.py` exclut les six labels et les pixels gris du
  damier, reconstruit l'alpha puis normalise les 48 silhouettes avec une échelle commune.
- Sortie : `public/assets/sprites/units/macrophage/unit_macrophage.png`.
- La rangée `phagocytosis` peut être remplacée isolément avec
  `scripts/replace_macrophage_animation_row.py` : les cinq autres rangées restent
  pixel pour pixel identiques et la nouvelle action conserve l'échelle et l'ancre livrées.
- Grille : 8 colonnes × 6 lignes, 48 frames, 64 × 64 px par frame.
- Feuille : 512 × 384 px RGBA.
- Margin : 0 ; spacing : 0 ; padding interne : 4 px.
- Normalisation source : 0.3612903226, nearest-neighbor.
- Phaser : scale 1, origin bas-centre `(0.5, 1)`, offset visuel `(0, 24)`.
- Point local de phagocytose : `(17, -2)` par rapport au centre de gameplay.

## Animations

| État | Frames globales | FPS | Lecture | Repère visuel |
|---|---:|---:|---|---:|
| idle | 0–7 | 7 | boucle | — |
| move | 8–15 | 10 | boucle | — |
| attack | 16–23 | 12 | unique | impact frame 20 |
| phagocytosis | 24–31 | 10 | unique | fermeture frame 29 |
| hurt | 32–39 | 14 | unique | — |
| death | 40–47 | 9 | unique | — |

Les dégâts d'attaque restent appliqués par la simulation au moment existant. La frame d'impact
est un repère visuel pour de futurs VFX et ne déclenche aucun second dégât.

## Contrôleur visuel

`MacrophageVisualController` maintient des sprites Phaser jetables, dérivés du `GameState` :

- move repose sur le déplacement réellement observé entre deux snapshots ;
- attack repose sur la remontée réelle du cooldown après une frappe ;
- hurt repose sur une baisse réelle des points de vie, avec cooldown visuel ;
- phagocytosis repose sur `phagocytosedByEntityId` et `phagocytosisRemainingMs` ;
- death est jouée après disparition de l'entité de simulation, puis le sprite est détruit ;
- l'orientation utilise le déplacement, puis la cible, avec seuil anti-oscillation ;
- les animations ponctuelles ne sont pas relancées à chaque frame ;
- priorité : death > phagocytosis > hurt > attack > move > idle ;
- les frappes non létales jouent `attack` avec les pseudopodes ;
- `phagocytosis` est une exécution non interruptible (sauf par la mort), déclenchée uniquement
  lorsque les dégâts calculés du prochain coup seraient létaux pour une petite bactérie.

La cible phagocytée reste une entité séparée. Son rendu est interpolé vers le point d'attache et
rétréci pendant les 820 ms existantes, sans modifier sa position ni ses règles de simulation.

## Overlays et fallback

Sélection, barre de vie, ordre de déplacement, rayon de garde et autres marqueurs restent dessinés
séparément au-dessus du sprite. Si la texture ou une animation utilisable manque, le resolver rend
la main au dessin procédural. Les warnings de fallback ne sont émis qu'en développement.

## Viewer de développement

Ajouter `?macrophageDebug=1` à l'URL en développement :

- `1` idle, `2` move, `3` attack, `4` phagocytosis, `5` hurt, `6` death ;
- `F` flip horizontal ;
- `[` et `]` vitesse temporaire ;
- affichage de la frame, de l'origine et du point de phagocytose.

Le viewer est protégé par `import.meta.env.DEV` et n'est pas accessible en production.

## Limites assumées

- Le jeu ne possède actuellement qu'un zoom caméra de 1 ; il n'existe pas de zoom minimal ou
  maximal distinct à tester sans ajouter une nouvelle fonction hors périmètre.
- Aucun timing de dégâts, statistique, mouvement, seed ou comportement de simulation n'a changé.
