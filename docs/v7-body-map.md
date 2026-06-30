# Immunostrat V7.1 - Carte globale du corps

V7 ajoute une couche strategique au-dessus des batailles locales existantes.
V7.1 transforme cette couche en vraie partie normale generee.
La campagne V6 reste separee et jouable comme mode apprentissage.

## Modes de jeu

- Campagne : missions fixes, tutoriel progressif, objectifs pedagogiques.
- Carte du corps : partie normale rejouable, generee avec seed et difficulte.
- Mode infini : reserve a V8, plus dur, avec crises et mutations futures.

## Ce que V7/V7.1 ajoute

- un mode `Carte du corps`, debloque apres le palier de mission 7 ;
- une nouvelle partie normale avec difficulte facile, normale ou difficile ;
- une generation initiale controlee par seed ;
- huit regions visibles : peau, poumons, intestin, sang, ganglions lymphatiques, rate, moelle osseuse, foie ;
- un etat sauvegarde par region : sante locale, infection, inflammation, menace, pathogenes, renforts ;
- des ganglions regionaux strategiques ;
- une propagation lisible par tour strategique, influencee par menace, sang, ganglion, difficulte et dernier resultat ;
- des renforts convertis en unites de depart dans les batailles locales ;
- un retour de resultat de bataille vers la carte globale.

## Presets de batailles normales

Les batailles locales de la carte du corps ne pointent plus directement vers les missions de campagne.
Elles utilisent des presets separes :

- `skinBacterialSkirmish`
- `skinBiofilmPressure`
- `lungViralSpread`
- `intestineBacillusSwarm`
- `bloodMixedAlert`
- `lymphNodeSignalResponse`
- `spleenBloodFiltering`
- `boneMarrowReinforcementPressure`

## Architecture

- `src/game/bodyMap/bodyRegions.ts` contient les donnees de carte.
- `src/game/bodyMap/bodyMapGenerator.ts` genere les parties normales.
- `src/game/bodyMap/bodyMapSystem.ts` contient les regles strategiques pures.
- `src/game/bodyMap/bodyMapSave.ts` gere `localStorage`.
- `src/pages/BodyMapPage.tsx` affiche la carte et les actions.
- `src/pages/GamePage.tsx` reutilise le canvas tactique existant en mode campagne ou carte du corps.

## Science vs gameplay

Le trajet dendritique -> lymphe -> ganglion regional est encore simplifie,
mais V7.1 compte maintenant les signaux au moment ou la dendritique livre vraiment a la sortie lymphatique.
Un ganglion actif donne un petit bonus de depart en antigenes/cytokines.

## Hors scope

- pas de mode infini complet V8 ;
- pas de mutations ou score infini ;
- pas de champignons, parasites ou cancers V9 ;
- pas de factions pathogenes jouables V10 ;
- pas de simulation medicale realiste ;
- pas de polish visuel V11.
