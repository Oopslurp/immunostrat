import Phaser from "phaser";
import { balanceValues } from "../../data/balance";
import { missionDefinitions } from "../../data/missions";
import type { GameBridge, GameSnapshot } from "../GameBridge";
import { Simulation } from "../../simulation/core/Simulation";
import type { GameCommand } from "../../simulation/core/commands";
import type { GameState } from "../../simulation/core/GameState";
import { distanceSquared } from "../../types/shared";
import {
  isBacterium,
  isDendriticCell,
  isImmuneUnit,
  isNeutrophil,
  isPlasmocyte,
} from "../../simulation/entities";

export class MissionScene extends Phaser.Scene {
  private simulation = new Simulation();
  private dynamicLayer?: Phaser.GameObjects.Graphics;
  private bridgeUnsubscribe?: () => void;
  private snapshotElapsedMs = 0;
  private lastPublishedStatus: GameState["status"] | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;

  constructor(private readonly bridge: GameBridge) {
    super("MissionScene");
  }

  create() {
    const mission = missionDefinitions[this.simulation.getState().missionId];
    const map = mission.map;

    this.cameras.main.setBounds(0, 0, map.width, map.height);
    this.input.mouse?.disableContextMenu();
    this.dynamicLayer = this.add.graphics();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupBridge());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanupBridge());

    this.add
      .text(map.width / 2, 42, "Immunostrat - Wound Defense V3", {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "24px",
      })
      .setOrigin(0.5);

    this.add
      .text(
        map.width / 2,
        72,
        "Drag to select immune units. Click the tissue map to move.",
        {
          color: "#a8c0cc",
          fontFamily: "monospace",
          fontSize: "15px",
        },
      )
      .setOrigin(0.5);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) =>
      this.handlePointerDown(pointer),
    );
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) =>
      this.handlePointerMove(pointer),
    );
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) =>
      this.handlePointerUp(pointer),
    );

    this.bridgeUnsubscribe = this.bridge.subscribeCommand((command) => {
      this.handleCommand(command);
    });

    this.publishSnapshot();
  }

  update(_time: number, delta: number) {
    const state = this.simulation.step(delta);

    this.renderState(state);
    this.snapshotElapsedMs += delta;

    const statusChanged = state.status !== this.lastPublishedStatus;

    const shouldPublishRunningSnapshot =
      state.status === "running" &&
      this.snapshotElapsedMs >= balanceValues.snapshotPublishIntervalMs;

    if (shouldPublishRunningSnapshot || statusChanged) {
      this.snapshotElapsedMs = 0;
      this.publishSnapshot(state);
    }
  }

  shutdown() {
    this.cleanupBridge();
  }

  private cleanupBridge() {
    this.bridgeUnsubscribe?.();
    this.bridgeUnsubscribe = undefined;
    this.dragStart = null;
    this.dragCurrent = null;
  }

  private handleCommand(command: GameCommand) {
    this.simulation.dispatch(command);
    this.publishSnapshot();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    if (!pointer.leftButtonDown()) {
      return;
    }

    const state = this.simulation.getState();

    if (state.status !== "running") {
      return;
    }

    this.dragStart = {
      x: pointer.worldX,
      y: pointer.worldY,
    };
    this.dragCurrent = { ...this.dragStart };
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragStart || !pointer.leftButtonDown()) {
      return;
    }

    this.dragCurrent = {
      x: pointer.worldX,
      y: pointer.worldY,
    };
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    const state = this.simulation.getState();

    if (!this.dragStart || state.status !== "running") {
      this.dragStart = null;
      this.dragCurrent = null;
      return;
    }

    const position = {
      x: pointer.worldX,
      y: pointer.worldY,
    };
    const dragStart = this.dragStart;
    const dragWidth = Math.abs(position.x - dragStart.x);
    const dragHeight = Math.abs(position.y - dragStart.y);
    const isAreaSelection =
      dragWidth >= balanceValues.dragAreaSelectionThresholdPx ||
      dragHeight >= balanceValues.dragAreaSelectionThresholdPx;

    this.dragStart = null;
    this.dragCurrent = null;

    if (isAreaSelection) {
      const selectedIds = this.findImmuneUnitsInRect(state, dragStart, position);
      this.handleCommand({ type: "selectEntities", entityIds: selectedIds });
      return;
    }

    const clickedImmuneUnitId = this.findImmuneUnitAtPosition(state, position);

    if (clickedImmuneUnitId) {
      this.handleCommand({ type: "selectEntity", entityId: clickedImmuneUnitId });
      return;
    }

    if (state.selectedEntityIds.length > 0) {
      this.handleCommand({ type: "orderMove", position });
    }
  }

  private findImmuneUnitAtPosition(
    state: GameState,
    position: { x: number; y: number },
  ): string | null {
    for (const entity of Object.values(state.entities)) {
      if (
        isImmuneUnit(entity) &&
        distanceSquared(entity.position, position) <= entity.radius * entity.radius
      ) {
        return entity.id;
      }
    }

    return null;
  }

  private findImmuneUnitsInRect(
    state: GameState,
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): string[] {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    return Object.values(state.entities)
      .filter(
        (entity) =>
          isImmuneUnit(entity) &&
          entity.position.x >= minX &&
          entity.position.x <= maxX &&
          entity.position.y >= minY &&
          entity.position.y <= maxY,
      )
      .map((entity) => entity.id);
  }

  private renderState(state: GameState) {
    const graphics = this.dynamicLayer;

    if (!graphics) {
      return;
    }

    graphics.clear();
    this.drawMap(graphics, state);
    this.drawInflammatoryZones(graphics, state);
    this.drawDebris(graphics, state);
    this.drawEntities(graphics, state);
    this.drawEffects(graphics, state);
    this.drawSelectionRectangle(graphics);
  }

  private drawMap(graphics: Phaser.GameObjects.Graphics, state: GameState) {
    const mission = missionDefinitions[state.missionId];
    const map = mission.map;
    const playArea = map.playArea;
    const grid = map.grid;
    const tissueZone = mission.map.tissueZone;
    const entryZone = mission.map.bacteriaEntryZone;
    const entryVisual = balanceValues.bacteriaEntryVisual;

    graphics.fillStyle(0x101820, 1);
    graphics.fillRect(0, 0, map.width, map.height);

    graphics.fillStyle(0x203141, 1);
    graphics.fillRoundedRect(
      playArea.x,
      playArea.y,
      playArea.width,
      playArea.height,
      playArea.radius,
    );

    graphics.lineStyle(2, 0x62d3c8, 0.22);
    for (let x = grid.startX; x <= grid.endX; x += grid.stepX) {
      graphics.lineBetween(x, grid.startY, x + grid.skewX, grid.endY);
    }

    graphics.fillStyle(0x62d3c8, 0.18);
    graphics.fillRoundedRect(
      tissueZone.x,
      tissueZone.y,
      tissueZone.width,
      tissueZone.height,
      18,
    );
    graphics.lineStyle(4, 0x62d3c8, 0.6);
    graphics.strokeRoundedRect(
      tissueZone.x,
      tissueZone.y,
      tissueZone.width,
      tissueZone.height,
      18,
    );

    graphics.fillStyle(0xff7f8f, 0.16);
    graphics.fillRoundedRect(
      entryZone.x - entryVisual.xOffset,
      entryZone.yMin,
      entryVisual.width,
      entryZone.yMax - entryZone.yMin,
      entryVisual.radius,
    );
    graphics.lineStyle(3, 0xff7f8f, 0.45);
    graphics.strokeRoundedRect(
      entryZone.x - entryVisual.xOffset,
      entryZone.yMin,
      entryVisual.width,
      entryZone.yMax - entryZone.yMin,
      entryVisual.radius,
    );

    graphics.fillStyle(0xffc76b, 0.72);
    graphics.fillCircle(mission.map.macrophageSpawn.x, mission.map.macrophageSpawn.y, 10);

    graphics.fillStyle(0xb69cff, 0.22);
    graphics.fillCircle(map.lymphNode.x, map.lymphNode.y, map.lymphNode.radius);
    graphics.lineStyle(4, 0xb69cff, 0.65);
    graphics.strokeCircle(map.lymphNode.x, map.lymphNode.y, map.lymphNode.radius);
  }

  private drawEntities(graphics: Phaser.GameObjects.Graphics, state: GameState) {
    for (const entity of Object.values(state.entities)) {
      if (isImmuneUnit(entity)) {
        graphics.fillStyle(getImmuneUnitColor(entity.kind), 0.95);
        if (isDendriticCell(entity)) {
          graphics.fillTriangle(
            entity.position.x,
            entity.position.y - entity.radius,
            entity.position.x - entity.radius,
            entity.position.y + entity.radius,
            entity.position.x + entity.radius,
            entity.position.y + entity.radius,
          );
        } else if (isPlasmocyte(entity)) {
          graphics.fillRoundedRect(
            entity.position.x - entity.radius,
            entity.position.y - entity.radius,
            entity.radius * 2,
            entity.radius * 2,
            8,
          );
        } else {
          graphics.fillCircle(entity.position.x, entity.position.y, entity.radius);
        }
        graphics.lineStyle(3, 0xf5fbff, 0.22);
        graphics.strokeCircle(entity.position.x, entity.position.y, entity.radius + 4);

        if (state.selectedEntityIds.includes(entity.id)) {
          graphics.lineStyle(4, 0xffc76b, 0.95);
          graphics.strokeCircle(entity.position.x, entity.position.y, entity.radius + 10);
        }

        if (entity.targetPosition) {
          graphics.lineStyle(2, 0xffc76b, 0.45);
          graphics.lineBetween(
            entity.position.x,
            entity.position.y,
            entity.targetPosition.x,
            entity.targetPosition.y,
          );
          graphics.strokeCircle(entity.targetPosition.x, entity.targetPosition.y, 8);
        }

        this.drawHealthBar(graphics, entity.position.x, entity.position.y - 34, entity.health, entity.maxHealth);

        if (isDendriticCell(entity) && entity.carriedDebrisCount > 0) {
          graphics.fillStyle(0xb69cff, 0.95);
          for (let index = 0; index < entity.carriedDebrisCount; index += 1) {
            graphics.fillCircle(
              entity.position.x + entity.radius + index * 7,
              entity.position.y - entity.radius,
              4,
            );
          }
        }
      }

      if (isBacterium(entity)) {
        graphics.fillStyle(entity.pathogenTypeId === "toughBacterium" ? 0xb95c6a : 0xff7f8f, 0.95);
        graphics.fillEllipse(entity.position.x, entity.position.y, entity.radius * 2.2, entity.radius * 1.6);
        graphics.lineStyle(2, 0x3f111b, 0.5);
        graphics.strokeEllipse(entity.position.x, entity.position.y, entity.radius * 2.4, entity.radius * 1.8);
        this.drawHealthBar(graphics, entity.position.x, entity.position.y - 24, entity.health, entity.maxHealth);
      }
    }
  }

  private drawDebris(graphics: Phaser.GameObjects.Graphics, state: GameState) {
    for (const debris of state.debris) {
      graphics.fillStyle(0xb69cff, 0.9);
      graphics.fillTriangle(
        debris.position.x,
        debris.position.y - 8,
        debris.position.x - 8,
        debris.position.y + 7,
        debris.position.x + 8,
        debris.position.y + 7,
      );
      graphics.lineStyle(1, 0xf5fbff, 0.3);
      graphics.strokeCircle(debris.position.x, debris.position.y, 10);
    }
  }

  private drawInflammatoryZones(
    graphics: Phaser.GameObjects.Graphics,
    state: GameState,
  ) {
    for (const zone of state.inflammatoryZones) {
      const alpha = Phaser.Math.Clamp(zone.intensity, 0.08, 0.42);

      graphics.fillStyle(0xff7f33, alpha * 0.45);
      graphics.fillCircle(zone.position.x, zone.position.y, zone.radius);
      graphics.lineStyle(2, 0xffc76b, alpha);
      graphics.strokeCircle(zone.position.x, zone.position.y, zone.radius);
    }
  }

  private drawHealthBar(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    health: number,
    maxHealth: number,
  ) {
    const width = 44;
    const ratio = Phaser.Math.Clamp(health / maxHealth, 0, 1);

    graphics.fillStyle(0x071217, 0.75);
    graphics.fillRect(x - width / 2, y, width, 5);
    graphics.fillStyle(0x7ee28a, 0.9);
    graphics.fillRect(x - width / 2, y, width * ratio, 5);
  }

  private drawEffects(graphics: Phaser.GameObjects.Graphics, state: GameState) {
    for (const effect of state.effects) {
      const maxTtl =
        effect.kind === "attack" || effect.kind === "antibody"
          ? balanceValues.attackEffectTtlMs
          : effect.kind === "adaptive"
            ? balanceValues.attackEffectTtlMs * 2
            : balanceValues.tissueDamageEffectTtlMs;
      const alpha = Phaser.Math.Clamp(effect.ttlMs / maxTtl, 0, 1) * 0.75;

      graphics.lineStyle(
        effect.kind === "attack" ? 4 : 5,
        getEffectColor(effect.kind),
        alpha,
      );
      graphics.strokeCircle(effect.position.x, effect.position.y, effect.radius);
    }
  }

  private drawSelectionRectangle(graphics: Phaser.GameObjects.Graphics) {
    if (!this.dragStart || !this.dragCurrent) {
      return;
    }

    const x = Math.min(this.dragStart.x, this.dragCurrent.x);
    const y = Math.min(this.dragStart.y, this.dragCurrent.y);
    const width = Math.abs(this.dragCurrent.x - this.dragStart.x);
    const height = Math.abs(this.dragCurrent.y - this.dragStart.y);

    if (
      width < balanceValues.dragPreviewThresholdPx &&
      height < balanceValues.dragPreviewThresholdPx
    ) {
      return;
    }

    graphics.fillStyle(0x62d3c8, 0.08);
    graphics.fillRect(x, y, width, height);
    graphics.lineStyle(2, 0xffc76b, 0.85);
    graphics.strokeRect(x, y, width, height);
  }

  private publishSnapshot(state: GameState = this.simulation.getState()) {
    const mission = missionDefinitions[state.missionId];
    const snapshot: GameSnapshot = {
      status: state.status,
      tissueHealth: state.tissue.health,
      tissueMaxHealth: state.tissue.maxHealth,
      atp: state.resources.atp,
      cytokines: state.resources.cytokines,
      antigens: state.resources.antigens,
      inflammation: state.inflammation.value,
      neutrophilCooldownMs: state.productionCooldowns.neutrophilMs,
      massiveNeutralizationCooldownMs:
        state.productionCooldowns.massiveNeutralizationMs,
      bacterialAnalysisComplete:
        state.adaptiveResearch.bacterialAnalysisComplete,
      currentWave: Math.min(
        state.waves.currentWaveIndex + 1,
        mission.waves.length,
      ),
      totalWaves: mission.waves.length,
      entities: Object.values(state.entities),
      debrisCount: state.debris.length,
      selectedEntityIds: state.selectedEntityIds,
    };

    this.bridge.publishSnapshot(snapshot);
    this.lastPublishedStatus = state.status;
  }
}

function getImmuneUnitColor(kind: string): number {
  if (kind === "neutrophil") {
    return 0xffc76b;
  }

  if (kind === "dendriticCell") {
    return 0xb69cff;
  }

  if (kind === "plasmocyte") {
    return 0xf7f0d8;
  }

  return 0x62d3c8;
}

function getEffectColor(kind: string): number {
  if (kind === "antibody" || kind === "adaptive") {
    return 0xb69cff;
  }

  if (kind === "attack") {
    return 0xffc76b;
  }

  return 0xff7f8f;
}
