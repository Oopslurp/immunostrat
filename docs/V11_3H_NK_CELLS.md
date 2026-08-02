# V11.3H — Cellule NK animée

## Source et préparation

- Source : `D:\Mathieu's data\Vibe learning\Immunos\NK-ss.png`
- Dimensions : `1448 × 1086`, PNG RGB sans canal alpha.
- Transparence source : aucune (`0` pixel transparent) ; damier clair réellement incorporé.
- Traitement : `chroma-variance`, seuil `3`, composantes minimales `8`, remplissage des trous internes.
- Les titres ont été exclus par six séries de huit rectangles explicites.
- Bandes verticales utilisées : `45–165`, `220–325`, `375–480`,
  `535–660`, `728–840` et `915–1030`; les huit colonnes suivent les
  séparations `20/190/365/540/715/890/1065/1240/1440`.
- Sortie RGBA : grille `8 × 6`, frames `72 × 64`, échelle commune `0.3675675676`, alignement `bottom-center`.
- Aucun étirement : une seule échelle proportionnelle est appliquée aux 48 frames.

## Animations de la feuille

1. `IDLE`
2. `MOVE`
3. `ATTACK`
4. `CYTOTOXIC STRIKE`
5. `HURT`
6. `DEATH`

## États réellement exposés par le code

- Repos/garde.
- Déplacement tactique et poursuite locale.
- Une attaque courte contre les pathogènes libres et menaces avancées,
  observée par la remise à zéro du cooldown.
- Une branche d’attaque existante contre les cellules tissulaires infectées,
  qui émet un effet `cytotoxic`.
- Blessure, observée par une baisse de points de vie.
- Mort/disparition de l’entité.
- Détection par proximité de certaines menaces cancéreuses ou furtives.

La ligne `CYTOTOXIC STRIKE` représente la branche déjà codée contre une cellule
infectée. Un champ visuel `sourceEntityId` a été ajouté aux effets de combat
existants afin que le contrôleur puisse attribuer ce signal à la bonne NK sans
modifier les dégâts, cibles, cooldowns ou conséquences. Ce n’est pas une
nouvelle compétence activable ni un finisher.

## Matrice de couverture

| État/action du code | Animation de la feuille | Intégration | Écart ou fallback |
|---|---|---|---|
| Repos/garde | `IDLE` | Boucle | Fallback procédural si asset indisponible |
| Déplacement/poursuite | `MOVE` | Boucle, retournement horizontal | Fallback procédural si animation indisponible |
| Attaque contre pathogène libre/menace avancée | `ATTACK` | One-shot sur reset du cooldown | Aucun |
| Attaque contre cellule infectée | `CYTOTOXIC STRIKE` | One-shot quand l’effet `cytotoxic` porte l’identifiant de cette NK | Variante visuelle de l’attaque existante, pas une nouvelle compétence |
| Blessure | `HURT` | One-shot sur baisse de PV | Fallback procédural si animation indisponible |
| Mort/disparition | `DEATH` | One-shot terminal | Fondu procédural conservé si animation indisponible |
| Détection de menace furtive/cancéreuse par proximité | Non | Reste sur `idle` ou `move` | État gameplay codé sans animation dédiée |

## Intégration Phaser

- Asset : `public/assets/sprites/units/nk-cell/unit_nk.png`
- Métadonnées : `public/assets/sprites/units/nk-cell/unit_nk.json`
- Aperçu : `public/assets/sprites/units/nk-cell/unit_nk_preview.png`
- Configuration : `scripts/sprite-configs/nk-cell.json`
- Manifest : texture `unit_nk`, orientation `flipHorizontal`, origine `(0.5, 1)`, offset `(0, 20)`, scale Phaser `1`.
- Points d’attache : attaque `(23, -5)`, impact `(0, -4)`, centre `(0, 0)`, effet au sol `(0, 20)`.
- Les sélections, jauges de vie, ordres et VFX restent des overlays séparés.
- Le rendu procédural NK reste actif lorsque le manifest, la texture ou une animation demandée manque.

## Validation

- Validation de spritesheet : valide, aucune erreur ou alerte, 48 frames
  non vides, aucun contenu au bord, alpha `0–255` et `160164` pixels
  transparents.
- Tests : `34` fichiers et `201` tests réussis.
- Build TypeScript/Vite : réussi ; seul l’avertissement de taille de chunk
  déjà présent reste affiché.
- Playtest navigateur : les six lignes ont été jouées simultanément dans le
  viewer de développement `?nkDebug=1`; échelle, ancrage, particules,
  silhouette et poses terminales sont lisibles, sans texte ni damier.
- Console navigateur : aucune erreur et aucun avertissement.
- Zoom testé : zoom tactique actuel `1`; aucun autre niveau de zoom n’est
  exposé par ce prototype.
