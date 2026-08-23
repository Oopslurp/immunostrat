import { SpecimenCompare } from "../components/encyclopedia/SpecimenCompare";
import type { CSSProperties } from "react";
import {
  encyclopediaEntryById,
  getEntryProfiles,
  type EncyclopediaEntry,
} from "../content/encyclopediaEntries";

type EncyclopediaEntryPageProps = {
  entryId: string;
  onBack: () => void;
  onOpenEntry: (entryId: string) => void;
  onOpenScience: () => void;
};

function ReasoningStep({
  index,
  label,
  text,
}: {
  index: string;
  label: string;
  text: string;
}) {
  return (
    <div className="reasoning-step">
      <span>{index}</span>
      <div>
        <small>{label}</small>
        <p>{text}</p>
      </div>
    </div>
  );
}

function EntryList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function EncyclopediaEntryPage({
  entryId,
  onBack,
  onOpenEntry,
  onOpenScience,
}: EncyclopediaEntryPageProps) {
  const entry = encyclopediaEntryById.get(entryId);

  if (!entry) {
    return (
      <div className="page encyclopedia-not-found">
        <span>Signal perdu</span>
        <h1>Dossier introuvable</h1>
        <p>Cette entrée n’existe pas ou a été déplacée.</p>
        <button className="button button-primary" onClick={onBack} type="button">
          Revenir à l’encyclopédie
        </button>
      </div>
    );
  }

  return (
    <article
      className="page encyclopedia-entry-page"
      style={{ "--entry-accent": entry.accent } as CSSProperties}
    >
      <button className="encyclopedia-back" onClick={onBack} type="button">
        ← Tous les dossiers
      </button>

      <header className="entry-hero">
        <div>
          <span className="entry-category">{entry.categoryLabel}</span>
          <h1>{entry.title}</h1>
          <p className="entry-tagline">{entry.tagline}</p>
          <div className="entry-field-notes" aria-label="Repères tactiques">
            {entry.fieldNotes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        </div>
        <div className="entry-index-mark" aria-hidden="true">
          <span>{entry.id.slice(0, 2).toUpperCase()}</span>
          <i />
        </div>
      </header>

      <SpecimenCompare entry={entry} />

      <section aria-labelledby="reasoning-title" className="reasoning-ribbon">
        <div className="reasoning-ribbon-intro">
          <span className="eyebrow">Trajet de conception</span>
          <h2 id="reasoning-title">Du phénomène à la décision</h2>
        </div>
        <ReasoningStep
          index="01"
          label="Comprendre"
          text={entry.biologyRole[0]}
        />
        <ReasoningStep
          index="02"
          label="Modéliser"
          text={entry.modelChoice[0]}
        />
        <ReasoningStep
          index="03"
          label="Rendre jouable"
          text={entry.playerDecision}
        />
      </section>

      <section className="entry-dossier-grid">
        <div className="entry-dossier-panel entry-dossier-game">
          <span className="dossier-letter">A</span>
          <small>Rôle dans Immunostrat</small>
          <h2>Ce que vous manipulez</h2>
          <p>{entry.gameRole}</p>
          <div className="player-decision-card">
            <span>Votre décision</span>
            <strong>{entry.playerDecision}</strong>
          </div>
        </div>

        <div className="entry-dossier-panel entry-dossier-biology">
          <span className="dossier-letter">B</span>
          <small>Rôle biologique simplifié</small>
          <h2>Dans le vivant</h2>
          <EntryList items={entry.biologyRole} />
        </div>

        <div className="entry-dossier-panel entry-dossier-faithful">
          <span className="dossier-letter">C</span>
          <small>Ce qui est fidèle</small>
          <h2>Relations conservées</h2>
          <EntryList items={entry.faithfulAspects} />
        </div>

        <div className="entry-dossier-panel entry-dossier-simplified">
          <span className="dossier-letter">D</span>
          <small>Ce qui est simplifié</small>
          <h2>Conventions de gameplay</h2>
          <EntryList items={entry.gameplaySimplifications} />
        </div>
      </section>

      <ProfileSection entry={entry} />

      <section className="related-dossiers">
        <div>
          <span className="eyebrow">Poursuivre l’enquête</span>
          <h2>Dossiers reliés</h2>
        </div>
        <div className="related-dossier-links">
          {entry.relatedIds.map((relatedId) => {
            const related = encyclopediaEntryById.get(relatedId);
            if (!related) {
              return null;
            }

            return (
              <button key={relatedId} onClick={() => onOpenEntry(relatedId)} type="button">
                <small>{related.categoryLabel}</small>
                <strong>{related.title}</strong>
                <span>→</span>
              </button>
            );
          })}
        </div>
        <button className="button" onClick={onOpenScience} type="button">
          Comparer toutes les abstractions
        </button>
      </section>
    </article>
  );
}

function ProfileSection({ entry }: { entry: EncyclopediaEntry }) {
  const profiles = getEntryProfiles(entry);

  if (profiles.length === 0) {
    return null;
  }

  return (
    <section className="profile-matrix" aria-labelledby="profile-title">
      <div className="profile-matrix-header">
        <div>
          <span className="eyebrow">Sous-profils réellement présents</span>
          <h2 id="profile-title">Variantes du modèle</h2>
        </div>
        <p>
          Ces noms décrivent des archétypes jouables. Ils ne correspondent pas à
          une liste d’espèces médicalement exactes.
        </p>
      </div>
      <div className="profile-matrix-grid">
        {profiles.map((profile) => (
          <article key={profile.id}>
            <span>{profile.shortLabel}</span>
            <h3>{profile.displayName}</h3>
            <p>{profile.gameplayRole ?? profile.gameplayDescription ?? profile.description}</p>
            <div>
              <small>Force</small>
              <strong>{profile.strengths?.[0] ?? profile.archetype}</strong>
            </div>
            <div>
              <small>Faiblesse</small>
              <strong>{profile.weaknesses?.[0] ?? "réponse coordonnée"}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
