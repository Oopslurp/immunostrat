import { audioDirector } from "../audio/AudioDirector";
import { useAudioSettings } from "../audio/useAudioDirector";
import type { AudioVolumeKey } from "../audio/audioSettings";
import { Button } from "./Button";

type SettingsPanelProps = {
  onBack: () => void;
  title?: string;
};

const sliders: Array<{ key: AudioVolumeKey; label: string; description: string }> = [
  { key: "master", label: "Volume général", description: "Ensemble du mix" },
  { key: "music", label: "Musique", description: "Pulsation tactique" },
  { key: "ambience", label: "Ambiance", description: "Respiration microscopique" },
  { key: "sfx", label: "Combat", description: "Cellules, menaces et signaux" },
  { key: "ui", label: "Interface", description: "Menus et confirmations" },
];

export function SettingsPanel({ onBack, title = "Réglages" }: SettingsPanelProps) {
  const settings = useAudioSettings();
  const fullscreenAvailable = typeof document !== "undefined" && Boolean(document.documentElement.requestFullscreen);

  return (
    <div className="settings-panel-content">
      <div className="settings-heading">
        <span className="modal-kicker">Mixage immunitaire</span>
        <h2>{title}</h2>
        <p>Un mix doux et lisible, pensé pour les batailles longues.</p>
      </div>

      <div className="settings-sliders">
        {sliders.map((slider) => {
          const value = settings[slider.key];
          return (
            <label className="settings-slider" key={slider.key}>
              <span>
                <strong>{slider.label}</strong>
                <em>{slider.description}</em>
              </span>
              <input
                aria-label={slider.label}
                max="100"
                min="0"
                onChange={(event) =>
                  audioDirector.setVolume(slider.key, Number(event.target.value) / 100)
                }
                step="1"
                type="range"
                value={Math.round(value * 100)}
              />
              <output>{Math.round(value * 100)}%</output>
            </label>
          );
        })}
      </div>

      <div className="settings-toggle-row">
        <Button
          aria-pressed={settings.muted}
          className={settings.muted ? "settings-toggle-active" : ""}
          onClick={() => audioDirector.setMuted(!settings.muted)}
        >
          {settings.muted ? "Son coupé" : "Couper le son"}
        </Button>
        {fullscreenAvailable ? (
          <Button
            onClick={() => {
              if (document.fullscreenElement) {
                void document.exitFullscreen().catch(() => undefined);
              } else {
                void document.documentElement.requestFullscreen().catch(() => undefined);
              }
            }}
          >
            Plein écran
          </Button>
        ) : null}
        <Button onClick={() => audioDirector.resetSettings()}>Valeurs par défaut</Button>
      </div>

      <div className="modal-actions settings-actions">
        <Button data-audio="back" onClick={onBack} variant="primary">
          Retour
        </Button>
      </div>
    </div>
  );
}
