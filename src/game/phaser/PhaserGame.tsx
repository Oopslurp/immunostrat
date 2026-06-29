import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createPhaserConfig } from "./createPhaserConfig";
import type { GameBridge } from "./GameBridge";

type PhaserGameProps = {
  bridge: GameBridge;
};

export function PhaserGame({ bridge }: PhaserGameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return undefined;
    }

    gameRef.current = new Phaser.Game(createPhaserConfig(hostRef.current, bridge));

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [bridge]);

  return <div className="phaser-host" ref={hostRef} />;
}
