import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createPhaserConfig } from "./createPhaserConfig";
import type { GameBridge } from "./GameBridge";
import type { MissionId, MissionPreparation } from "../data/missions";

type PhaserGameProps = {
  bridge: GameBridge;
  missionId: MissionId;
  preparation?: MissionPreparation;
};

export function PhaserGame({ bridge, missionId, preparation }: PhaserGameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return undefined;
    }

    gameRef.current = new Phaser.Game(
      createPhaserConfig(hostRef.current, bridge, missionId, preparation),
    );

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [bridge, missionId, preparation]);

  return <div className="phaser-host" ref={hostRef} />;
}
