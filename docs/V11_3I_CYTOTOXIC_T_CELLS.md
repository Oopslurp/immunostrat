# Immunostrat V11.3I — T cytotoxique animé

## Source et préparation

- Source : `D:/Mathieu's data/Vibe learning/Immunos/T_cytotoxique-ss.png`
- Source : PNG RGB 1448 × 1086, sans canal alpha ni pixel transparent.
- Fond : chroma key vert `[16, 242, 15]`, tolérance 70.
- Un despill vert est appliqué aux lignes biologiques pour retirer la frange du fond sans modifier les deux effets de détection.
- Les libellés sont exclus par 56 rectangles explicites.
- Production : 8 colonnes × 7 lignes, frames 72 × 64, RGBA.
- Échelle commune de préparation : `0.4096385542`, sans étirement.
- Alignement et ancre : `bottom-center`, `(0.5, 1)`.

## Matrice de couverture

| État/action du code | Ligne du spritesheet | Intégration | Écart ou fallback |
|---|---|---|---|
| Repos | `IDLE` | boucle | aucun |
| Déplacement | `MOVE` | boucle, flip horizontal | aucun |
| Attaque générique existante | pas de ligne `ATTACK` | réutilise `CYTOTOXIC STRIKE` | aucune animation d’attaque distincte |
| Frappe sur cellule infectée | `CYTOTOXIC STRIKE` | one-shot sur reset du cooldown et effet sourcé | aucun |
| Dégât reçu | `HURT` | one-shot prioritaire | aucun |
| Mort | `DEATH` | terminale | aucun |
| Détection normale | `DETECT NORMAL` | enregistrée et visible en debug | aucune fonction de détection normale dans la simulation |
| Détection anormale | `DETECT ABNORMAL` | enregistrée et visible en debug | le cancer est révélé instantanément, sans état d’analyse observable |
| Recrutement/apparition | aucune | `IDLE` | pas d’animation dédiée dans la planche |

Les lignes de détection n’ajoutent aucune mécanique. Le contrôleur Phaser observe uniquement les positions, la santé, le cooldown et les effets déjà produits par la simulation.

## Fichiers

- Configuration : `scripts/sprite-configs/cytotoxic-t.json`
- Production : `public/assets/sprites/units/cytotoxic-t/unit_cytotoxic_t.png`
- Métadonnées : `public/assets/sprites/units/cytotoxic-t/unit_cytotoxic_t.json`
- Prévisualisation : `public/assets/sprites/units/cytotoxic-t/unit_cytotoxic_t_preview.png`
- Validation : `public/assets/sprites/units/cytotoxic-t/unit_cytotoxic_t_validation.json`

Le manifest conserve `allowProceduralFallback: true`. Les anneaux de sélection, la santé, les ordres et les effets de combat restent des overlays séparés.
