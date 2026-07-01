import type { ReactNode } from "react";
import { routes, type AppRoute } from "./routes";

type AppShellProps = {
  children: ReactNode;
  currentRoute: AppRoute;
  bodyMapUnlocked?: boolean;
  onNavigate: (route: AppRoute) => void;
};

export function AppShell({
  children,
  currentRoute,
  bodyMapUnlocked = false,
  onNavigate,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-title">Immunostrat</span>
          <span className="brand-subtitle">RTS immunitaire 2D</span>
        </div>
        <nav className="top-nav" aria-label="Navigation principale">
          <button
            className={`nav-button ${
              currentRoute === routes.home ? "nav-button-active" : ""
            }`}
            type="button"
            onClick={() => onNavigate(routes.home)}
          >
            Accueil
          </button>
          <button
            className={`nav-button ${
              currentRoute === routes.campaign ? "nav-button-active" : ""
            }`}
            type="button"
            onClick={() => onNavigate(routes.campaign)}
          >
            Campagne
          </button>
          <button
            className={`nav-button ${
            currentRoute === routes.normal || currentRoute === routes.bodyMap
              ? "nav-button-active"
              : ""
            }`}
            disabled={!bodyMapUnlocked}
            title={
              bodyMapUnlocked
                ? "Ouvrir la partie normale"
                : "Debloque apres la mission 7"
            }
            type="button"
            onClick={() => onNavigate(routes.normal)}
          >
            Partie normale
          </button>
          <button
            className={`nav-button ${
              currentRoute === routes.infinite ? "nav-button-active" : ""
            }`}
            type="button"
            onClick={() => onNavigate(routes.infinite)}
          >
            Mode infini
          </button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
