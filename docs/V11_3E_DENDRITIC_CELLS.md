# Immunostrat V11.3E — cellules dendritiques

## Couverture réelle

| État visuel | Source gameplay | Intégration |
| --- | --- | --- |
| `idle` | cellule sans déplacement | boucle |
| `move` | position modifiée par le système de mouvement | boucle |
| `collect` | `carriedDebrisCount` augmente | one-shot |
| `carry` | antigène transporté sans mouvement | boucle |
| `moveCarry1` | déplacement avec 1 débris | boucle |
| `moveCarry2` | déplacement avec 2 débris | boucle |
| `moveCarry3` | déplacement avec 3 débris, capacité maximale | boucle |
| `signal` | `deliverDendriticAntigens`, puis transit `away` | one-shot au relais lymphatique |
| `hurt` | baisse de santé | one-shot |
| `dead` | suppression par le cycle de vie immunitaire | one-shot terminal |

`SIGNAL` n'est pas un nouveau pouvoir et n'est jamais utilisé comme animation
de mouvement. Il visualise la livraison existante qui augmente les antigènes et
`missionStats.lymphSignalsDelivered`.

## États sans ligne dédiée

- Le trajet hors carte et le retour après livraison restent un fondu/masquage
  procédural. La planche ne montre pas cette absence temporaire.
- La cellule dendritique n'a ni attaque, ni phagocytose de pathogène dans le
  gameplay. Aucun comportement offensif n'a été ajouté.
- Il n'existe pas d'action séparée de « présentation antigénique » sur la carte :
  la livraison au relais lymphatique est l'événement adaptatif existant.

## Débris antigéniques

Les anciens triangles violets ont été remplacés par de petits cercles
jaune/orange avec contour et reflet, cohérents avec les antigènes visibles dans
les deux planches. Le même rendu est conservé dans le fallback procédural.

## Validation locale

En développement, `?dendriticDebug=1` affiche les dix animations ensemble pour
contrôler le découpage, la transparence, l'ancrage et le rythme.
