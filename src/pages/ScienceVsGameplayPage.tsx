type ScienceVsGameplayPageProps = {
  onOpenEncyclopedia: () => void;
  onPlay: () => void;
};

const comparisons = [
  {
    title: "Cytokines regroupées en ressource",
    game: "Une valeur CYT paie des recrutements et plusieurs capacités.",
    biology: "De nombreuses cytokines transmettent des signaux différents, parfois opposés, selon les cellules et les récepteurs.",
    why: "Une ressource commune rend la communication visible et crée un arbitrage immédiat.",
  },
  {
    title: "Inflammation mesurable",
    game: "Une jauge locale et globale monte, puis menace directement l’intégrité du tissu.",
    biology: "L’inflammation est un phénomène distribué, multivariable, utile mais potentiellement dommageable.",
    why: "La jauge transforme une régulation complexe en risque stratégique que le joueur peut lire.",
  },
  {
    title: "Temps biologique compressé",
    game: "Analyse, recrutement adaptatif et mémoire s’enchaînent pendant une bataille de quelques minutes.",
    biology: "Activation, expansion et migration adaptatives peuvent demander bien plus de temps.",
    why: "Sans compression, l’information acquise pendant la partie n’aurait pas de conséquence jouable avant sa fin.",
  },
  {
    title: "Cellules guidées tactiquement",
    game: "Le joueur sélectionne et déplace directement ses unités sur le terrain.",
    biology: "Migration et recrutement reposent notamment sur chimiotactisme, adhésion, endothélium et gradients.",
    why: "Le contrôle direct produit des décisions de positionnement tout en évoquant une migration orientée.",
  },
  {
    title: "Diapédèse transformée en points d’entrée",
    game: "Des portails matérialisent l’arrivée de renforts depuis les vaisseaux.",
    biology: "La diapédèse est le passage de leucocytes à travers l’endothélium, régulé par de multiples interactions.",
    why: "Un point d’entrée crée des corridors à protéger et évite une apparition arbitraire au milieu du terrain.",
  },
  {
    title: "Anticorps rendus visibles",
    game: "Le plasmocyte lance des salves guidées et l’ultimate produit un effet spectaculaire.",
    biology: "Les anticorps neutralisent des cibles ou facilitent leur élimination ; ce ne sont ni des projectiles ni des explosifs.",
    why: "La trajectoire relie clairement production, cible et impact dans un RTS rapide.",
  },
  {
    title: "Points de vie, portée et cooldown",
    game: "Chaque entité possède santé, dégâts, portée, vitesse et cadence.",
    biology: "Cellules et microbes n’ont pas de barres de vie ; survie et destruction émergent de processus multiples.",
    why: "Ces conventions permettent d’anticiper, comparer et planifier sans prétendre être des mesures biologiques.",
  },
  {
    title: "Ganglion condensé en relais",
    game: "La dendritique sort de la carte, livre sa charge et génère une ressource antigénique.",
    biology: "Le ganglion organise des rencontres et activations complexes entre cellules et antigènes drainés.",
    why: "Un trajet visible puis un gain tangible font sentir le passage du local au systémique.",
  },
];

export function ScienceVsGameplayPage({
  onOpenEncyclopedia,
  onPlay,
}: ScienceVsGameplayPageProps) {
  return (
    <div className="page science-gameplay-page">
      <header className="science-gameplay-hero">
        <span className="encyclopedia-kicker">Journal de conception</span>
        <h1>Science vs Gameplay</h1>
        <p>
          Immunostrat s’inspire de relations biologiques réelles, puis les accélère,
          les regroupe ou les exagère pour produire des décisions lisibles. L’écart
          n’est pas caché : il fait partie du design.
        </p>
        <div>
          <button className="button button-primary" onClick={onOpenEncyclopedia} type="button">
            Explorer les fiches
          </button>
          <button className="button" onClick={onPlay} type="button">
            Éprouver les choix en jeu
          </button>
        </div>
      </header>

      <section className="design-method" aria-label="Méthode de conception">
        <div>
          <span>01</span>
          <small>Comprendre</small>
          <strong>Identifier le phénomène et ses relations essentielles.</strong>
        </div>
        <i aria-hidden="true">→</i>
        <div>
          <span>02</span>
          <small>Modéliser</small>
          <strong>Choisir les variables, états et délais que la simulation retient.</strong>
        </div>
        <i aria-hidden="true">→</i>
        <div>
          <span>03</span>
          <small>Rendre jouable</small>
          <strong>Transformer le modèle en information, risque et décision.</strong>
        </div>
      </section>

      <section className="comparison-stack" aria-label="Comparaisons science et gameplay">
        {comparisons.map((comparison, index) => (
          <article className="comparison-card" key={comparison.title}>
            <header>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h2>{comparison.title}</h2>
            </header>
            <div>
              <section>
                <small>Dans le jeu</small>
                <p>{comparison.game}</p>
              </section>
              <section>
                <small>En biologie</small>
                <p>{comparison.biology}</p>
              </section>
              <section>
                <small>Pourquoi ce choix</small>
                <p>{comparison.why}</p>
              </section>
            </div>
          </article>
        ))}
      </section>

      <aside className="science-limit-note">
        <strong>Limite essentielle</strong>
        <p>
          Immunostrat est un jeu pédagogique, pas une simulation médicale, un outil
          diagnostique ni un modèle prédictif du système immunitaire.
        </p>
      </aside>
    </div>
  );
}
