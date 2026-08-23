import { useMemo, useState, type CSSProperties } from "react";
import { SpecimenVisual } from "../components/encyclopedia/SpecimenVisual";
import {
  encyclopediaCategories,
  encyclopediaEntries,
  type EncyclopediaCategory,
} from "../content/encyclopediaEntries";

type EncyclopediaPageProps = {
  onOpenEntry: (entryId: string) => void;
  onOpenScience: () => void;
  onPlay: () => void;
};

type CategoryFilter = "all" | EncyclopediaCategory;

export function EncyclopediaPage({
  onOpenEntry,
  onOpenScience,
  onPlay,
}: EncyclopediaPageProps) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");

    return encyclopediaEntries.filter((entry) => {
      const matchesCategory = category === "all" || entry.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${entry.title} ${entry.categoryLabel} ${entry.shortDescription}`
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const pathogenFamilies = encyclopediaEntries.filter(
    (entry) => entry.category === "infectiousAgents",
  );

  return (
    <div className="page encyclopedia-page">
      <header className="encyclopedia-hero">
        <div>
          <span className="encyclopedia-kicker">Archives biologiques · V12</span>
          <h1>Encyclopédie de terrain</h1>
          <p>
            Ouvrez une fiche comme un dossier d’opération : observez le phénomène,
            voyez ce que le modèle en retient, puis comprenez la décision proposée au joueur.
          </p>
          <div className="encyclopedia-hero-actions">
            <button className="button button-primary" onClick={onPlay} type="button">
              Passer au terrain
            </button>
            <button className="button" onClick={onOpenScience} type="button">
              Science vs Gameplay
            </button>
          </div>
        </div>
        <div className="encyclopedia-scan-orbit" aria-hidden="true">
          <i />
          <span>20</span>
          <small>dossiers actifs</small>
        </div>
      </header>

      <section aria-labelledby="families-title" className="family-command-strip">
        <div className="family-command-copy">
          <span className="eyebrow">Agents infectieux</span>
          <h2 id="families-title">Quatre familles, quatre lectures tactiques</h2>
          <p>
            “Cellule anormale” et “opportuniste” restent volontairement à part : la
            première n’est pas un pathogène, le second décrit un contexte.
          </p>
        </div>
        <div className="family-pulse-grid">
          {pathogenFamilies.map((entry, index) => (
            <button
              className="family-pulse-card"
              key={entry.id}
              onClick={() => onOpenEntry(entry.id)}
              style={{ "--entry-accent": entry.accent } as CSSProperties}
              type="button"
            >
              <span>0{index + 1}</span>
              <SpecimenVisual visual={entry.gameVisual} />
              <strong>{entry.title}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="encyclopedia-console" aria-label="Filtres de l’encyclopédie">
        <label className="encyclopedia-search">
          <span>Rechercher un dossier</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex. macrophage, antigène, parasite…"
            type="search"
            value={query}
          />
        </label>
        <div aria-label="Filtrer par catégorie" className="encyclopedia-filters" role="group">
          <button
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            type="button"
          >
            Tous
          </button>
          {encyclopediaCategories.map((item) => (
            <button
              aria-pressed={category === item.id}
              key={item.id}
              onClick={() => setCategory(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div aria-live="polite" className="encyclopedia-results-count">
        {visibleEntries.length} dossier{visibleEntries.length > 1 ? "s" : ""} affiché
        {visibleEntries.length > 1 ? "s" : ""}
      </div>

      <section className="encyclopedia-card-grid" aria-label="Dossiers biologiques">
        {visibleEntries.map((entry) => (
          <button
            className="encyclopedia-card"
            key={entry.id}
            onClick={() => onOpenEntry(entry.id)}
            style={{ "--entry-accent": entry.accent } as CSSProperties}
            type="button"
          >
            <span className="encyclopedia-card-category">{entry.categoryLabel}</span>
            <div className="encyclopedia-card-visual">
              <SpecimenVisual visual={entry.gameVisual} />
            </div>
            <div className="encyclopedia-card-copy">
              <h2>{entry.shortTitle}</h2>
              <p>{entry.shortDescription}</p>
            </div>
            <div className="encyclopedia-card-footer">
              <span>{entry.fieldNotes[0]}</span>
              <strong>Ouvrir le dossier →</strong>
            </div>
          </button>
        ))}
      </section>

      {visibleEntries.length === 0 ? (
        <div className="encyclopedia-empty">
          Aucun dossier ne correspond à cette recherche. Essayez un mécanisme ou une famille.
        </div>
      ) : null}
    </div>
  );
}
