import { useState } from "react";
import { AppShell } from "./app/AppShell";
import { routes, type AppRoute } from "./app/routes";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";

export default function App() {
  const [route, setRoute] = useState<AppRoute>(routes.home);

  return (
    <AppShell currentRoute={route} onNavigate={setRoute}>
      {route === routes.home ? (
        <HomePage onPlay={() => setRoute(routes.game)} />
      ) : (
        <GamePage />
      )}
    </AppShell>
  );
}
