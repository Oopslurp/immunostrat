# V11.3C — Cellules du tissu

## Couverture

| Signal réel du code | Ligne de sprites | Rendu |
|---|---|---|
| `status === "healthy"` | `healthy` | boucle 0–7 |
| `status === "infected"` | `infected` | boucle 8–15 |
| `status === "destroyed"` | `destroyed` | lecture unique 16–23, dernière pose conservée |
| cellule saine avec `antiviralProtectedMs > 0` | `protected` | boucle 24–31 |
| cellule infectée avec `antiviralProtectedMs > 0` | `infectedProtected` | boucle 32–39 |

Aucune mécanique, durée, règle d’infection ou conséquence de gameplay n’a été
ajoutée. Les cinq combinaisons visuelles réellement émises sont couvertes.

## Préparation

- Source : planche utilisateur RGB 1448×1086 avec damier et libellés incorporés.
- Sortie : `public/assets/sprites/tissue/tissue-cell/cell_civilian.png`.
- Grille : 8 colonnes × 5 lignes, images 64×64.
- Échelle commune : 0,30, alignement centré, rééchantillonnage nearest-neighbor.
- Le damier est supprimé par variance chromatique ; les libellés sont exclus des
  zones de découpe.
- Le fichier de configuration reproductible est
  `scripts/sprite-configs/tissue-cell.json`.
- La ligne combinée provient d’une seconde source 2508×627. Elle utilise une
  échelle commune 0,17 afin de ramener son corps et son aura aux dimensions des
  quatre lignes précédentes. Sa configuration est
  `scripts/sprite-configs/tissue-cell-infected-protected.json`.

## Intégration et repli

Le manifeste central charge et enregistre les quatre animations. Un contrôleur
visuel lit uniquement `TissueCellState`; les barres de vie, l’aura infectée et
les autres effets restent des surcouches séparées. Si la texture ou les
animations sont absentes, le dessin procédural historique, y compris son anneau
d’interféron, reste actif.

En développement, `?tissueCellDebug=1` affiche les cinq lignes animées
simultanément dans une galerie visuelle, sans modifier l’état de la partie.
