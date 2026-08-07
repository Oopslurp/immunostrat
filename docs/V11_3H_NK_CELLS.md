# V11.3H — Cellule NK : détection et finisher

## Source et préparation

- Source : `D:\Mathieu's data\Vibe learning\Immunos\NK-ss2.png`
- Dimensions : `1448 × 1086`, PNG RGB sans canal alpha.
- Transparence source : aucune ; damier gris réellement incorporé.
- Traitement : `chroma-variance`, seuil `3`, composantes minimales `8`,
  remplissage des trous internes.
- Les huit libellés ont été exclus par huit séries de huit rectangles explicites.
- Sortie RGBA : grille `8 × 8`, 64 frames de `72 × 64`, échelle commune
  `0.3885714286`, alignement `bottom-center`.
- Aucun étirement : la même échelle proportionnelle est appliquée aux 64 frames.

## Comportement gameplay

La NK n’attaque plus les bactéries, virus libres, champignons, parasites ou
autres pathogènes ordinaires. Elle surveille uniquement :

- les cellules tissulaires normales ou infectées ;
- les menaces de catégorie `cancerCell`.

Une cible locale doit être analysée pendant `1400 ms`. Une cellule normale est
mémorisée puis laissée intacte. Une cellule infectée ou cancéreuse déclenche
ensuite `CYTOTOXIC STRIKE`, qui la détruit en une seule frappe. La détection
instantanée des cancers par la NK a été retirée ; la détection existante du
T cytotoxique reste inchangée.

## Matrice de couverture

| État/action du code | Animation | Intégration | Écart |
|---|---|---|---|
| Repos/garde | `IDLE` | boucle | aucun |
| Déplacement/approche | `MOVE` | boucle et flip horizontal | aucun |
| Analyse d’une cellule saine | `DETECT NORMAL` | boucle pendant 1400 ms | aucun |
| Analyse d’une cellule infectée/cancéreuse | `DETECT ABNORMAL` | boucle pendant 1400 ms | aucun |
| Finisher anormal | `CYTOTOXIC STRIKE` | one-shot après analyse | aucun |
| Blessure | `HURT` | one-shot | aucun |
| Mort | `DEATH` | terminal | fondu procédural si animation absente |
| Attaque ordinaire | `ATTACK` | enregistrée mais jamais demandée | ligne inutilisée volontairement |

## Fichiers produits et intégration

- Production : `public/assets/sprites/units/nk-cell/unit_nk.png`
- Métadonnées : `public/assets/sprites/units/nk-cell/unit_nk.json`
- Aperçu : `public/assets/sprites/units/nk-cell/unit_nk_preview.png`
- Validation : `public/assets/sprites/units/nk-cell/unit_nk_validation.json`
- Configuration : `scripts/sprite-configs/nk-cell.json`
- Manifest : texture `unit_nk`, 64 frames, origine `(0.5, 1)`, offset `(0, 20)`.
- Fallback procédural, sélection, vie, ordres et VFX restent séparés.

## Validation

Le validateur confirme 64 frames RGBA non vides, aucune frame au bord, aucune
erreur et aucun avertissement. Le viewer `?nkDebug=1` expose `IDLE`, `MOVE`,
`CYTOTOXIC`, `HURT`, `DEATH`, `DETECT OK` et `DETECT KO`. La ligne `ATTACK`
reste volontairement hors de la machine d’états gameplay.
