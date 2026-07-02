---
name: immunostrat-v11-art-style
description: Recall the approved Immunostrat V11 art direction (pixel-art biological RTS, layer A/B, palette, asset conventions) before touching HUD, map rendering, sprites, animations, VFX, or menus. Use during V11.1 through V11.5 to prevent style drift.
---

# Immunostrat V11 — rappel de direction artistique

**Source de vérité complète : `ASSET_GUIDE_V11.md` à la racine du repo.** Ce skill ne fait que
rappeler l'essentiel et forcer la consultation du guide — il ne remplace jamais son contenu.

Avant toute tâche visuelle (HUD, carte, sprite, animation, VFX, menu), relire
`ASSET_GUIDE_V11.md` en entier, en particulier la section concernée par la tâche.

## Rappel rapide (résumé, pas exhaustif)

- Style : pixel-art propre, biologique/organique, coloré, lisible en RTS, vivant, non gore, pas
  médical froid, pas placeholder.
- Deux layers : **Layer A** = background décoratif lointain (doux, non interactif, ne porte
  jamais collision/pathfinding) ; **Layer B** = foreground interactif (net, contrasté,
  prioritaire).
- Grille : unités 32×32 px, petites entités/particules 16×16 ou 20×20 px.
- Nommage : basé sur les `futureSpriteKey` déjà présents dans `units.ts`, `treatments.ts`,
  `bodyRegions.ts`, `v11VisualMetadata.ts` (ex. `unit_macrophage_idle.png`, animation
  `unit_macrophage.idle`). Ne pas inventer une convention parallèle. `pathogens.ts` n'a **pas**
  encore de `futureSpriteKey` : les pathogènes auront besoin d'un mapping équivalent, à ajouter
  en V11.3A/V11.3 (modification de data ciblée, sans changement de gameplay).
- Palette candidate hex : voir `ASSET_GUIDE_V11.md` section 6 — **candidate, pas définitivement
  validée**. Tout changement de couleur doit être journalisé dans la section 13 du guide.
- Accessibilité : jamais coder une info gameplay par la couleur seule — silhouette, contour,
  texture, mouvement en complément (ex. virus vs unités immunitaires : couleurs proches,
  silhouettes doivent porter la distinction).
- Carte seed-based : le décor ne remplace jamais la génération. Même seed = même map + même
  décor. Ne jamais toucher `tacticalMapSeed.ts`, `tacticalMapGenerator.ts`,
  `runtimeTacticalMap.ts`, `bodyMapGenerator.ts` pour des raisons visuelles.

## Ce que ce skill ne doit jamais faire

- Modifier le gameplay, la simulation, la balance, ou les systèmes (`src/game/simulation/**`).
- Créer de nouvelles mécaniques.
- Remplacer ou dupliquer en détail le contenu de `ASSET_GUIDE_V11.md` — toujours renvoyer au
  guide pour le détail (palette complète, tailles, conventions, risques, inventaire de fichiers).
- Servir de source de vérité indépendante en cas de contradiction : `ASSET_GUIDE_V11.md` prime
  toujours.
- Contenir des instructions de refactor d'architecture.

## Quand l'utiliser

Pendant V11.1 (HUD/UI), V11.2 (carte biologique), V11.3 (unités/pathogènes/sprites/animations),
V11.4 (VFX/feedback), V11.5 (sons/menus/polish) — chaque fois qu'une dérive de style est possible
(nouvelle couleur non prévue, silhouette qui copie trop la référence externe, sprite hors grille,
nommage improvisé).
