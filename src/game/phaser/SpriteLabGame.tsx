import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createSpriteLabConfig } from "./createSpriteLabConfig";

export function SpriteLabGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return undefined;
    }

    gameRef.current = new Phaser.Game(createSpriteLabConfig(hostRef.current));

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="sprite-lab-host" ref={hostRef} />;
}
