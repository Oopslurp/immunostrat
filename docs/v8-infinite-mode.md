# Immunostrat V8 - Mode infini

V8 ajoute un troisieme mode separe :

- Campagne : apprentissage guide.
- Carte du corps : partie normale generee.
- Mode infini : survie avancee, score et pression progressive.

## Choix d'architecture

Le mode infini V8 est implemente comme un mode local robuste.
Il reutilise la bataille Phaser existante et la simulation pure, mais avec une mission speciale `infiniteSurvivalV8`.

Ce choix evite de melanger :

- progression campagne ;
- sauvegarde carte du corps ;
- records infinis.

Le mode pourra devenir global plus tard si V10.5 valide l'equilibrage.

## Phases

Les cycles contiennent 3 vagues.
Les phases progressent selon le cycle :

1. Contamination simple
2. Expansion bacterienne
3. Resistance
4. Infection virale
5. Infection mixte
6. Mutation
7. Crise systemique
8. Nightmare

La phase 8 garde seulement des hooks pour V9.
Elle ne code pas encore les vraies menaces avancees.

## Mutateurs

Les mutateurs sont data-driven dans `src/game/data/infiniteMode.ts`.

Exemples :

- vitesse bacterienne augmentee ;
- resistance bacterienne ;
- replication virale ;
- biofilm renforce ;
- crise inflammatoire ;
- fatigue metabolique ;
- tissu fragilise ;
- nouvel antigene ;
- menace avancee inconnue comme hook V9.

## Score

Le score tient compte de :

- vagues ;
- cycles ;
- sante du tissu ;
- cellules civiles sauvees ou perdues ;
- pic d'inflammation ;
- antigenes collectes ;
- multiplicateur de difficulte.

Les meilleurs scores sont sauvegardes par difficulte dans `localStorage`.

## Limites

- Pas de vrais ennemis V9.
- Pas de mode infini global sur carte du corps.
- Pas de boss.
- Pas de polish visuel V11.
- Les vagues sont generees virtuellement et limitees par un plafond de pathogenes actifs pour proteger les performances.
