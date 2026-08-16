import { useEffect, useSyncExternalStore } from "react";
import { audioDirector } from "./AudioDirector";

export function useAudioSettings() {
  return useSyncExternalStore(
    audioDirector.subscribe,
    audioDirector.getSettings,
    audioDirector.getSettings,
  );
}

export function useGlobalAudioInteractions(): void {
  useEffect(() => {
    let lastHoverTarget: EventTarget | null = null;
    const playAfterUnlock = (event: "back" | "confirm") => {
      void audioDirector.unlock().then(() => audioDirector.playUi(event));
    };

    const getControl = (target: EventTarget | null): HTMLElement | null =>
      target instanceof Element
        ? target.closest<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled), summary, [role='button']:not([aria-disabled='true'])")
        : null;

    const handlePointerOver = (event: PointerEvent) => {
      const control = getControl(event.target);
      if (!control || control === lastHoverTarget) return;
      lastHoverTarget = control;
      audioDirector.playUi("hover");
    };

    const handlePointerDown = (event: PointerEvent) => {
      const control = getControl(event.target);
      if (!control) {
        void audioDirector.unlock();
        return;
      }
      playAfterUnlock(control.dataset.audio === "back" ? "back" : "confirm");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        playAfterUnlock("back");
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (getControl(document.activeElement)) {
          playAfterUnlock("confirm");
        } else {
          void audioDirector.unlock();
        }
      } else {
        void audioDirector.unlock();
      }
    };

    const handleVisibility = () => audioDirector.setHidden(document.hidden);

    document.addEventListener("pointerover", handlePointerOver, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}
