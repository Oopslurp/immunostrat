import type { EncyclopediaEntry } from "../../content/encyclopediaEntries";
import { SpecimenVisual } from "./SpecimenVisual";

type SpecimenCompareProps = {
  entry: EncyclopediaEntry;
};

export function SpecimenCompare({ entry }: SpecimenCompareProps) {
  return (
    <section
      aria-label={`Comparaison jeu et biologie : ${entry.title}`}
      className={`specimen-compare ${entry.realVisual ? "" : "specimen-compare-single"}`}
    >
      <figure className="specimen-window specimen-window-game">
        <div className="specimen-window-header">
          <span>01</span>
          <div>
            <small>Observation tactique</small>
            <strong>Dans Immunostrat</strong>
          </div>
        </div>
        <div className="specimen-visual-stage">
          <span aria-hidden="true" className="specimen-reticle" />
          <SpecimenVisual visual={entry.gameVisual} />
        </div>
        <figcaption>
          {entry.gameVisual.kind === "procedural"
            ? "Rendu procédural réellement utilisé en partie — aucun spritesheet n’existe pour cette famille."
            : "Asset réellement utilisé par le jeu, affiché sans étirement et avec son ratio d’origine."}
        </figcaption>
      </figure>

      <div aria-hidden="true" className="specimen-transfer">
        <span>observer</span>
        <i />
        <span>transposer</span>
      </div>

      {entry.realVisual ? (
        <figure className="specimen-window specimen-window-real">
          <div className="specimen-window-header">
            <span>02</span>
            <div>
              <small>Référence biologique</small>
              <strong>Dans le vivant</strong>
            </div>
          </div>
          <div className="specimen-real-frame">
            <img alt={entry.realVisual.alt} src={entry.realVisual.src} />
            <span className="specimen-scale-warning">Échelles & couleurs non comparables</span>
          </div>
          <figcaption>
            {entry.realVisual.caption}{" "}
            <a href={entry.realVisual.sourceUrl} rel="noreferrer" target="_blank">
              {entry.realVisual.credit} · {entry.realVisual.license}
            </a>
          </figcaption>
        </figure>
      ) : (
        <aside className="specimen-no-photo">
          <span>02</span>
          <strong>Pas de fausse “photo réelle”</strong>
          <p>
            Ce concept n’a pas une apparence unique honnête à montrer ici. La fiche
            privilégie donc le phénomène et les relations biologiques.
          </p>
        </aside>
      )}
    </section>
  );
}
