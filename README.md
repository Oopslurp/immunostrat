# Immunostrat

Immunostrat est un jeu de stratégie 2D jouable dans le navigateur. Le joueur
coordonne les défenses immunitaires, contrôle l'inflammation et protège les
tissus contre plusieurs familles de menaces.

Le projet est un jeu et une simplification pédagogique : il ne constitue pas
une source de conseil médical.

## Jouer

**[Jouer à Immunostrat](https://oopslurp.github.io/immunostrat/)**

Pour lancer le jeu localement :

```bash
git clone https://github.com/Oopslurp/immunostrat.git
cd immunostrat
npm ci
npm run dev
```

Vite affiche l'adresse locale à ouvrir dans le navigateur. Node.js 20.19 ou
plus récent est requis.

## Modes de jeu

- **Campagne** : missions progressives et déblocage des unités immunitaires.
- **Partie normale** : stabilisation stratégique de plusieurs régions du corps.
- **Mode infini** : vagues et menaces de difficulté croissante.

La progression et les meilleurs scores sont enregistrés uniquement dans le
`localStorage` du navigateur. Le projet n'utilise ni compte, ni serveur, ni
base de données distante.

## Commandes principales

- clic gauche : sélectionner une unité ou tracer une sélection multiple ;
- clic gauche sur le terrain ou une cible : donner un ordre ;
- clic droit maintenu : déplacer la caméra ;
- `WASD` ou `ZQSD` : déplacer la caméra.

Les commandes disponibles et leurs coûts sont également affichés dans
l'interface de combat.

## Développement

```bash
npm ci          # installation reproductible
npm run dev     # serveur de développement
npm run test    # tests Vitest
npm run build   # vérification TypeScript et build de production
npm run preview # aperçu local du dossier dist
```

Le dossier `dist/` est généré et ne doit pas être commité.

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` teste, construit et déploie
automatiquement le jeu après chaque push sur `main`. Le build Vite
utilise des chemins relatifs afin de fonctionner aussi bien sur un domaine
racine que sous `https://<compte>.github.io/<depot>/`.

Le déploiement publie seulement le contenu généré de `dist/`. Aucun secret
n'est nécessaire.

## Architecture

- `src/app` : navigation et shell React ;
- `src/pages` : écrans et HUD ;
- `src/game/phaser` : scènes, rendu, animations et entrées ;
- `src/game/simulation` : simulation indépendante du rendu ;
- `src/game/data` : missions, unités, menaces et équilibrage ;
- `src/game/bodyMap` : carte stratégique et progression ;
- `src/game/infinite` : mode infini et records ;
- `src/assets` et `public/assets` : ressources visuelles ;
- `src/tests` : tests de simulation et d'intégration visuelle ;
- `docs` : notes techniques détaillées par version et système.

Les sprites disposent d'un rendu procédural de secours lorsqu'une ressource ne
peut pas être chargée.

## Sécurité et confidentialité

Consultez [SECURITY.md](SECURITY.md) pour signaler une vulnérabilité. Ne placez
jamais de jeton, mot de passe ou fichier `.env` dans le dépôt. Les fichiers de
ce type sont exclus par `.gitignore`.

## Crédits

- conception, direction et sélection des assets : **Mathieu C. / Oopslurp** ;
- ressources visuelles générées avec **ChatGPT**, puis sélectionnées et
  intégrées pour Immunostrat ;
- assistance au développement : **OpenAI Codex** ;
- moteur et interface : Phaser, React et React DOM — voir
  [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licence

Le code et les ressources originales d'Immunostrat sont distribués sous
licence MIT, copyright 2026 Mathieu C. Consultez [LICENSE](LICENSE). Les
composants tiers restent soumis aux licences indiquées dans
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
