import Phaser from "phaser";
import type {
  GameState,
  TissueCellState,
} from "../../simulation/core/GameState";
import { resolveEntityVisual } from "./spriteResolver";
import {
  selectTissueCellVisualState,
  type TissueCellVisualState,
} from "./tissueCellVisualState";

type TissueCellVisualRecord = {
  sprite: Phaser.GameObjects.Sprite;
  state: TissueCellVisualState | null;
  animationKey: string | null;
};

export class TissueCellVisualController {
  private readonly records = new Map<string, TissueCellVisualRecord>();

  constructor(private readonly scene: Phaser.Scene) {}

  update(state: GameState): void {
    const activeIds = new Set(state.tissueCells.map((cell) => cell.id));

    for (const cell of state.tissueCells) {
      const record = this.ensureRecord(cell);
      if (record) this.updateRecord(record, cell);
    }

    for (const [id, record] of this.records) {
      if (!activeIds.has(id)) {
        record.sprite.destroy();
        this.records.delete(id);
      }
    }
  }

  hasVisual(cellId: string): boolean {
    const record = this.records.get(cellId);
    return Boolean(record?.sprite.active && record.sprite.visible);
  }

  destroy(): void {
    for (const record of this.records.values()) record.sprite.destroy();
    this.records.clear();
  }

  private ensureRecord(cell: TissueCellState): TissueCellVisualRecord | null {
    const existing = this.records.get(cell.id);
    if (existing) return existing;

    const initialState = selectTissueCellVisualState(cell);
    const resolved = this.resolve(initialState);
    if (resolved.kind !== "sprite") {
      if (import.meta.env.DEV) {
        console.warn(`[tissue-cell-visual] procedural fallback: ${resolved.reason}`);
      }
      return null;
    }

    const sprite = this.scene.add
      .sprite(
        cell.position.x + resolved.definition.visualOffset.x,
        cell.position.y + resolved.definition.visualOffset.y,
        resolved.definition.textureKey,
      )
      .setOrigin(resolved.definition.anchor.x, resolved.definition.anchor.y)
      .setScale(resolved.definition.scale)
      .setDepth(-1);
    const record: TissueCellVisualRecord = {
      sprite,
      state: null,
      animationKey: null,
    };
    this.records.set(cell.id, record);
    this.updateRecord(record, cell);
    return record;
  }

  private updateRecord(
    record: TissueCellVisualRecord,
    cell: TissueCellState,
  ): void {
    const requestedState = selectTissueCellVisualState(cell);
    const resolved = this.resolve(requestedState);
    if (resolved.kind !== "sprite" || !resolved.animationKey) {
      record.sprite.setVisible(false);
      return;
    }

    record.sprite
      .setPosition(
        cell.position.x + resolved.definition.visualOffset.x,
        cell.position.y + resolved.definition.visualOffset.y,
      )
      .setVisible(true);

    const stateChanged = record.state !== requestedState;
    if (stateChanged) {
      record.sprite.play(resolved.animationKey);
      record.state = requestedState;
      record.animationKey = resolved.animationKey;
    } else if (
      requestedState !== "destroyed" &&
      (!record.sprite.anims.isPlaying ||
        record.animationKey !== resolved.animationKey)
    ) {
      record.sprite.play(resolved.animationKey);
      record.animationKey = resolved.animationKey;
    }
  }

  private resolve(state: TissueCellVisualState) {
    return resolveEntityVisual("tissueCell", state, {
      hasTexture: (key) => this.scene.textures.exists(key),
      hasAnimation: (key) => this.scene.anims.exists(key),
    });
  }
}
