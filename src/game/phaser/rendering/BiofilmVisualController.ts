import Phaser from "phaser";
import type { BiofilmZone, GameState } from "../../simulation/core/GameState";
import {
  createBiofilmVisualPattern,
  type BiofilmVisualPattern,
} from "./biofilmVisualModel";

type BiofilmVisual = {
  graphics: Phaser.GameObjects.Graphics;
  radius: number;
};

const BIOFILM_DEPTH = -0.5;

export class BiofilmVisualController {
  private readonly visuals = new Map<string, BiofilmVisual>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const activeIds = new Set<string>();

    for (const zone of state.biofilmZones) {
      activeIds.add(zone.id);
      const visual = this.ensureVisual(zone);
      visual.graphics.setPosition(
        Math.round(zone.position.x),
        Math.round(zone.position.y),
      );
    }

    for (const [zoneId, visual] of this.visuals) {
      if (!activeIds.has(zoneId)) {
        visual.graphics.destroy();
        this.visuals.delete(zoneId);
      }
    }
  }

  destroy(): void {
    for (const visual of this.visuals.values()) {
      visual.graphics.destroy();
    }
    this.visuals.clear();
  }

  private ensureVisual(zone: BiofilmZone): BiofilmVisual {
    const current = this.visuals.get(zone.id);

    if (current?.radius === zone.radius) {
      return current;
    }

    current?.graphics.destroy();
    const graphics = this.scene.add.graphics().setDepth(BIOFILM_DEPTH);
    drawBiofilmPattern(
      graphics,
      createBiofilmVisualPattern(zone.id, zone.radius),
    );
    const visual = { graphics, radius: zone.radius };
    this.visuals.set(zone.id, visual);

    return visual;
  }
}

function drawBiofilmPattern(
  graphics: Phaser.GameObjects.Graphics,
  pattern: BiofilmVisualPattern,
): void {
  graphics.fillStyle(0x294f38, 0.34);
  graphics.fillPoints([...pattern.boundary], true);
  graphics.fillStyle(0x6c9f68, 0.16);
  graphics.fillPoints([...pattern.innerBoundary], true);

  graphics.lineStyle(1, 0x8fc47d, 0.2);
  for (let index = 1; index < pattern.nodules.length; index += 1) {
    const previous = pattern.nodules[index - 1];
    const current = pattern.nodules[index];
    graphics.lineBetween(previous.x, previous.y, current.x, current.y);
  }

  graphics.lineStyle(1, 0xb7e39a, 0.34);
  for (let index = 0; index < pattern.boundary.length; index += 2) {
    const current = pattern.boundary[index];
    const next = pattern.boundary[(index + 1) % pattern.boundary.length];
    graphics.lineBetween(current.x, current.y, next.x, next.y);
  }

  for (const pocket of pattern.pockets) {
    graphics.fillStyle(0x10251d, 0.5);
    graphics.fillRect(
      pocket.x - Math.floor(pocket.size / 2),
      pocket.y - Math.floor(pocket.size / 2),
      pocket.size,
      Math.max(3, pocket.size - 2),
    );
  }

  for (const nodule of pattern.nodules) {
    graphics.fillStyle(0x173b2a, 0.86);
    graphics.fillRect(
      nodule.x - Math.floor(nodule.width / 2) - 1,
      nodule.y - Math.floor(nodule.height / 2) - 1,
      nodule.width + 2,
      nodule.height + 2,
    );
    graphics.fillStyle(nodule.tone === 0 ? 0x76b96d : 0xa1d483, 0.9);
    graphics.fillRect(
      nodule.x - Math.floor(nodule.width / 2),
      nodule.y - Math.floor(nodule.height / 2),
      nodule.width,
      nodule.height,
    );
  }
}
