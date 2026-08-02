# Immunostrat V11.3D — neutrophile et NETose

## Intégration visuelle

La source 1448 × 1086 contient un faux damier et des libellés. La feuille de
production est une spritesheet RGBA 512 × 448, en cadres 64 × 64, sans texte.
Le cadrage est normalisé avec une ancre basse centrée, une échelle commune et
le filtrage nearest-neighbor déjà imposé par le runtime Phaser.

Deux lignes de la source comportent sept images réelles (`ATTACK` et
`NET BURST`). Leur huitième case reste vide dans la grille 8 × 7 ; les plages
d'animation s'arrêtent donc respectivement aux frames 22 et 30 afin de ne
jamais afficher une frame vide.

| Ligne source | État simulation/rendu | Clé Phaser | Couverture |
| --- | --- | --- | --- |
| IDLE | neutrophile vivant, immobile | `unit.neutrophil.idle` | utilisée |
| MOVE | position modifiée par la simulation | `unit.neutrophil.move` | utilisée |
| ATTACK | remise à zéro du cooldown d'attaque | `unit.neutrophil.attack` | utilisée |
| NET BURST | mort avec pathogène valide à proximité | `unit.neutrophil.netBurst` | utilisée, terminale |
| NET TRAP | entité temporaire de terrain distincte | `hazard.netTrap.active` | utilisée, boucle |
| HURT | baisse de points de vie | `unit.neutrophil.hurt` | utilisée |
| DEATH | mort sans pathogène valide à proximité | `unit.neutrophil.death` | utilisée, terminale |

Le fallback procédural reste actif si la texture ou une animation manque.

## Durée de vie et décision de mort

Le neutrophile conserve sa durée de vie de 22 000 ms et son auto-dégât de
0,85 PV/s. Lorsque ses PV ou sa durée de vie atteignent zéro, la simulation
cherche un pathogène vivant dans le rayon de déclenchement :

- avec une menace dans le rayon : état irréversible `netBurst` ;
- sans menace : état irréversible `death`, sans piège ni dégât collatéral.

Pendant ces états le neutrophile est désélectionné, incontrôlable, immobile et
ne peut plus attaquer. Le piège apparaît une seule fois à 335 ms du burst.
La décision reste engagée si la cible meurt avant cette rupture.

## Configuration initiale

Toutes les valeurs sont regroupées dans `balanceValues.netosis`.

| Paramètre | Valeur |
| --- | ---: |
| Durée du piège | 3000 ms |
| Rayon de déclenchement/attraction/dégâts | 118 px |
| Rayon de capture | 52 px |
| Attraction | 74 px/s |
| Dégâts aux pathogènes | 10 PV/s |
| Dégâts aux cellules civiles | 2 PV/s |
| Ralentissement hors noyau | ×0,42 |
| Immobilisation dans le noyau | ×0 |
| Tick déterministe | 250 ms |

Trois secondes sont cohérentes comme valeur initiale : le piège inflige
30 dégâts maximum à une cible qui reste dans la zone, contre 6 dégâts à une
cellule civile. Il est donc tactiquement utile sans supprimer seul toutes les
menaces robustes. La durée devra être réévaluée en playtest quand plusieurs
neutrophiles sont produits simultanément.

La protection par interféron ne réduit pas les dégâts du NET, puisqu'aucune
résistance correspondante n'existait dans le gameplay.

## Cumul et déterminisme

Quand plusieurs NETs se chevauchent, le piège le plus proche possède la cible :
attraction, ralentissement et dégâts ne se cumulent pas. En cas d'égalité,
l'ordre stable des pièges tranche. Cette règle évite les aspirations
contradictoires et rend le coût civil lisible.

Les dégâts passent par l'API centrale de simulation et sont appliqués par
ticks de 250 ms. Phaser n'influence ni la durée, ni le déclenchement, ni les
dégâts. Une pause ou une fin de mission fige l'état ; le reset et le changement
de carte recréent une collection vide.

## Mode debug

En développement uniquement, ajouter `?neutrophilDebug=1` à l'URL :

- `N` : faire apparaître un neutrophile ;
- `L` : ramener sa durée de vie à 1 ms ;
- `K` : lui infliger des dégâts mortels ;
- `P` : ajouter/retirer un pathogène proche ;
- `C` : placer/retirer une cellule civile dans la zone.

Le mode affiche les rayons, le temps restant et le nombre de cibles capturées.
Il est éliminé du comportement de production par `import.meta.env.DEV`.
