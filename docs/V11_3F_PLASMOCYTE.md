# Immunostrat V11.3F — plasmocyte

## Fonction réellement codée

Le plasmocyte possède déjà une attaque automatique :

- portée : 190 ;
- dégâts de base : 11 ;
- délai entre attaques : 950 ms ;
- cibles prioritaires : bactéries et virus ;
- résultat actuel : dégâts appliqués immédiatement et effet `antibody` créé
  directement sur la cible.

La planche ne change ni ces valeurs ni le ciblage.

## Matrice de couverture

| État gameplay | Animation | Intégration |
| --- | --- | --- |
| attente | `IDLE` | boucle |
| déplacement | `MOVE` | boucle et retournement horizontal |
| attaque automatique déclenchée | `PRODUCE` | première moitié du one-shot |
| même attaque automatique | `SECRETE` | seconde moitié du one-shot |
| baisse de santé | `HURT` | one-shot |
| suppression à zéro santé | `DEATH` | one-shot terminal mis en cache |

`PRODUCE` et `SECRETE` sont jouées en séquence en moins de 950 ms. Elles
observent le redémarrage du cooldown existant et ne modifient pas la simulation.

## Écarts et sprites encore utiles

Le projectile anticorps courbe/homing n'existe pas encore dans la simulation.
Les dégâts sont instantanés et `CombatEffect` ne conserve ni position de départ,
ni source, ni cible, ni progression de vol.

La ligne `SECRETE` contient des Y intégrés à l'animation de la cellule. Pour un
vrai projectile indépendant, il manque idéalement :

1. un petit Y isolé sur fond transparent, avec 2 à 4 frames de vol/rotation ;
2. une animation d'impact ou de fixation sur le pathogène ;
3. éventuellement une variante de salve pour la neutralisation massive.

En attendant, l'impact `antibody` existant affiche trois petits Y procéduraux
autour de la cible. La neutralisation massive reste un pouvoir global séparé et
n'utilise pas les animations du plasmocyte.

## Débogage

En développement, `?plasmocyteDebug=1` affiche les six animations ensemble.
