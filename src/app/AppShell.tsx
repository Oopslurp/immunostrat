import type { ReactNode } from "react";
import { routes, type AppRoute } from "./routes";

type AppShellProps = {
  children: ReactNode;
  currentRoute: AppRoute;
  bodyMapUnlocked?: boolean;
  onNavigate: (route: AppRoute) => void;
  onOpenSettings: () => void;
};

export function AppShell({
  children,
  currentRoute,
  onNavigate,
  onOpenSettings,
}: AppShellProps) {
  const isGameplay = currentRoute === routes.game;
  const encyclopediaActive = currentRoute.startsWith("encyclopedia");
  const playActive =
    currentRoute === routes.campaign ||
    currentRoute === routes.normal ||
    currentRoute === routes.bodyMap ||
    currentRoute === routes.infinite;

  return (
    <div className={`app-shell ${isGameplay ? "app-shell-game" : ""}`.trim()}>
      {!isGameplay ? (
        <header className="top-bar">
          <div className="brand">
            <span className="brand-title">Immunostrat</span>
            <span className="brand-subtitle">Stratégie immunitaire 2D</span>
          </div>
          <nav className="top-nav" aria-label="Navigation principale">
            <button
              aria-current={currentRoute === routes.home ? "page" : undefined}
              className={`nav-button ${
                currentRoute === routes.home ? "nav-button-active" : ""
              }`}
              onClick={() => onNavigate(routes.home)}
              type="button"
            >
              Accueil
            </button>
            <button
              aria-current={playActive ? "page" : undefined}
              className={`nav-button ${playActive ? "nav-button-active" : ""}`}
              onClick={() => onNavigate(routes.campaign)}
              type="button"
            >
              Jouer
            </button>
            <button
              aria-current={encyclopediaActive ? "page" : undefined}
              className={`nav-button ${
                encyclopediaActive ? "nav-button-active" : ""
              }`}
              onClick={() => onNavigate(routes.encyclopedia)}
              type="button"
            >
              Encyclopédie
            </button>
            <button
              aria-current={
                currentRoute === routes.scienceVsGameplay ? "page" : undefined
              }
              className={`nav-button ${
                currentRoute === routes.scienceVsGameplay
                  ? "nav-button-active"
                  : ""
              }`}
              onClick={() => onNavigate(routes.scienceVsGameplay)}
              type="button"
            >
              Science vs Gameplay
            </button>
            <a
              className="nav-button nav-link-external"
              href="https://github.com/Oopslurp/immunostrat"
              rel="noreferrer"
              target="_blank"
            >
              GitHub ↗
            </a>
            <button
              className="nav-button nav-button-settings"
              onClick={onOpenSettings}
              type="button"
            >
              Réglages
            </button>
            {import.meta.env.DEV ? (
              <button
                aria-current={
                  currentRoute === routes.spriteLab ? "page" : undefined
                }
                className={`nav-button ${
                  currentRoute === routes.spriteLab ? "nav-button-active" : ""
                }`}
                onClick={() => onNavigate(routes.spriteLab)}
                type="button"
              >
                Laboratoire
              </button>
            ) : null}
          </nav>
          <span className="version-chip">V12</span>
        </header>
      ) : null}
      <main>{children}</main>
    </div>
  );
}
