import Phaser from "phaser";
import {
  calculateMissionScore,
  evaluateMissionObjectives,
  getMissionRank,
} from "../../campaign/objectives";
import { balanceValues } from "../../data/balance";
import {
  missionDefinitions,
  type MissionId,
  type MissionPreparation,
} from "../../data/missions";
import { pathogenDefinitions, type PathogenTypeId } from "../../data/pathogens";
import type { GameBridge, GameSnapshot } from "../GameBridge";
import { Simulation } from "../../simulation/core/Simulation";
import type { GameCommand } from "../../simulation/core/commands";
import type { GameState } from "../../simulation/core/GameState";
import { distanceSquared } from "../../types/shared";
import {
  isBacterium,
  isCytotoxicT,
  isDendriticCell,
  isHostilePathogen,
  isImmuneUnit,
  isNkCell,
  isNeutrophil,
  isPlasmocyte,
  isVirus,
} from "../../simulation/entities";

type CameraKeys = {
  upW: Phaser.Input.Keyboard.Key;
  upZ: Phaser.Input.Keyboard.Key;
  leftA: Phaser.Input.Keyboard.Key;
  leftQ: Phaser.Input.Keyboard.Key;
  downS: Phaser.Input.Keyboard.Key;
  rightD: Phaser.Input.Keyboard.Key;
};

export class MissionScene extends Phaser.Scene {
  private simulation: Simulation;
  private dynamicLayer?: Phaser.GameObjects.Graphics;
  private bridgeUnsubscribe?: () => void;
  private snapshotElapsedMs = 0;
  private lastPublishedStatus: GameState["status"] | null = null;
  private leftDragStart: { x: number; y: number } | null = null;
  private leftDragCurrent: { x: number; y: number } | null = null;
  private rightDragStartScreen: { x: number; y: number } | null = null;
  private rightDragLastScreen: { x: number; y: number } | null = null;
  private rightDragMoved = false;
  private cameraKeys?: CameraKeys;

  constructor(
    private readonly bridge: GameBridge,
    private readonly missionId: MissionId,
    private readonly preparation?: MissionPreparation,
  ) {
    super("MissionScene");
    this.simulation = new Simulation(missionId, preparation);
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
      .text(map.width / 2, 42, mission.title, {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "24px",
      })
      .setOrigin(0.5);

    this.add
      .text(
        map.width / 2,
        72,
        mission.tutorialHints?.[0]?.text ??
          "Left click selects and orders. Right drag or WASD/ZQSD moves camera.",
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
    this.cameraKeys = this.createCameraKeys();

    this.bridgeUnsubscribe = this.bridge.subscribeCommand((command) => {
      this.handleCommand(command);
    });

    this.publishSnapshot();
  }

  update(_time: number, delta: number) {
    this.recoverLostPointerRelease();
    this.updateCameraFromKeyboard(delta);
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

  private cleanupBridge() {
    this.bridgeUnsubscribe?.();
    this.bridgeUnsubscribe = undefined;
    this.leftDragStart = null;
    this.leftDragCurrent = null;
    this.rightDragStartScreen = null;
    this.rightDragLastScreen = null;
    this.rightDragMoved = false;
  }

  private handleCommand(command: GameCommand) {
    this.simulation.dispatch(command);
    this.publishSnapshot();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    const state = this.simulation.getState();

    if (state.status !== "running") {
      return;
    }

    if (pointer.rightButtonDown()) {
      this.rightDragStartScreen = { x: pointer.x, y: pointer.y };
      this.rightDragLastScreen = { ...this.rightDragStartScreen };
      this.rightDragMoved = false;
      return;
    }

    if (pointer.leftButtonDown()) {
      this.leftDragStart = {
        x: pointer.worldX,
        y: pointer.worldY,
      };
      this.leftDragCurrent = { ...this.leftDragStart };
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.rightDragStartScreen && this.rightDragLastScreen && pointer.rightButtonDown()) {
      const dx = pointer.x - this.rightDragLastScreen.x;
      const dy = pointer.y - this.rightDragLastScreen.y;
      const totalDx = pointer.x - this.rightDragStartScreen.x;
      const totalDy = pointer.y - this.rightDragStartScreen.y;
      const isCameraDrag =
        Math.sqrt(totalDx * totalDx + totalDy * totalDy) >=
        balanceValues.rightClickDragThresholdPx;

      if (isCameraDrag) {
        this.rightDragMoved = true;
        this.panCameraBy(
          -dx * balanceValues.camera.dragPanMultiplier,
          -dy * balanceValues.camera.dragPanMultiplier,
        );
      }

      this.rightDragLastScreen = { x: pointer.x, y: pointer.y };
      return;
    }

    if (!this.leftDragStart || !pointer.leftButtonDown()) {
      return;
    }

    this.leftDragCurrent = {
      x: pointer.worldX,
      y: pointer.worldY,
    };
  }

  private recoverLostPointerRelease(): void {
    const pointer = this.input.activePointer;

    if (this.leftDragStart && !pointer.leftButtonDown()) {
      this.leftDragStart = null;
      this.leftDragCurrent = null;
    }

    if (this.rightDragStartScreen && !pointer.rightButtonDown()) {
      this.rightDragStartScreen = null;
      this.rightDragLastScreen = null;
      this.rightDragMoved = false;
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    const state = this.simulation.getState();

    if (this.rightDragStartScreen) {
      this.rightDragStartScreen = null;
      this.rightDragLastScreen = null;
      this.rightDragMoved = false;

      return;
    }

    if (!this.leftDragStart || state.status !== "running") {
      this.leftDragStart = null;
      this.leftDragCurrent = null;
      return;
    }

    const position = {
      x: pointer.worldX,
      y: pointer.worldY,
    };
    const dragStart = this.leftDragStart;
    const dragWidth = Math.abs(position.x - dragStart.x);
    const dragHeight = Math.abs(position.y - dragStart.y);
    const isAreaSelection =
      dragWidth >= balanceValues.dragAreaSelectionThresholdPx ||
      dragHeight >= balanceValues.dragAreaSelectionThresholdPx;

    this.leftDragStart = null;
    this.leftDragCurrent = null;

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
      this.handleLeftClickOrder(state, position);
      return;
    }

    this.handleCommand({ type: "selectEntity", entityId: null });
  }

  private handleLeftClickOrder(
    state: GameState,
    position: { x: number; y: number },
  ) {
    if (state.selectedEntityIds.length === 0) {
      return;
    }

    const targetEnemyId = this.findHostileAtPosition(state, position);

    if (targetEnemyId) {
      this.handleCommand({ type: "orderAttack", targetEntityId: targetEnemyId });
      return;
    }

    const targetDebrisId = this.findDebrisAtPosition(state, position);

    if (targetDebrisId && this.hasSelectedDendriticCell(state)) {
      this.handleCommand({ type: "orderCollectDebris", debrisId: targetDebrisId });
      return;
    }

    const targetInfectedCellId = this.findInfectedCellAtPosition(state, position);

    if (targetInfectedCellId && this.hasSelectedCytotoxicResponder(state)) {
      this.handleCommand({
        type: "orderAttackTissueCell",
        tissueCellId: targetInfectedCellId,
      });
      return;
    }

    if (this.isLymphNodeAtPosition(state, position) && this.hasLoadedDendriticCell(state)) {
      this.handleCommand({ type: "orderReturnToLymphNode" });
      return;
    }

    this.handleCommand({ type: "orderMove", position });
  }

  private hasSelectedDendriticCell(state: GameState): boolean {
    return state.selectedEntityIds.some((entityId) => {
      const entity = state.entities[entityId];

      return entity ? isDendriticCell(entity) : false;
    });
  }

  private hasLoadedDendriticCell(state: GameState): boolean {
    return state.selectedEntityIds.some((entityId) => {
      const entity = state.entities[entityId];

      return entity ? isDendriticCell(entity) && entity.carriedDebrisCount > 0 : false;
    });
  }

  private hasSelectedCytotoxicResponder(state: GameState): boolean {
    return state.selectedEntityIds.some((entityId) => {
      const entity = state.entities[entityId];

      return entity ? isNkCell(entity) || isCytotoxicT(entity) : false;
    });
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

  private findHostileAtPosition(
    state: GameState,
    position: { x: number; y: number },
  ): string | null {
    for (const entity of Object.values(state.entities)) {
      if (
        isHostilePathogen(entity) &&
        distanceSquared(entity.position, position) <=
          (entity.radius + 8) * (entity.radius + 8)
      ) {
        return entity.id;
      }
    }

    return null;
  }

  private findDebrisAtPosition(
    state: GameState,
    position: { x: number; y: number },
  ): string | null {
    for (const debris of state.debris) {
      if (distanceSquared(debris.position, position) <= 18 * 18) {
        return debris.id;
      }
    }

    return null;
  }

  private findInfectedCellAtPosition(
    state: GameState,
    position: { x: number; y: number },
  ): string | null {
    for (const cell of state.tissueCells) {
      if (
        cell.status === "infected" &&
        distanceSquared(cell.position, position) <=
          (cell.radius + 12) * (cell.radius + 12)
      ) {
        return cell.id;
      }
    }

    return null;
  }

  private isLymphNodeAtPosition(
    state: GameState,
    position: { x: number; y: number },
  ): boolean {
    const missionMap = missionDefinitions[state.missionId].map;
    const lymphNode = missionMap.lymphExit ?? missionMap.lymphNode;

    return distanceSquared(lymphNode, position) <= lymphNode.radius * lymphNode.radius;
  }

  private createCameraKeys(): CameraKeys | undefined {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      return undefined;
    }

    return {
      upW: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      upZ: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      leftA: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      leftQ: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      downS: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      rightD: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private updateCameraFromKeyboard(deltaMs: number): void {
    if (!this.cameraKeys || isTextInputActive()) {
      return;
    }

    const xDirection =
      (this.cameraKeys.rightD.isDown ? 1 : 0) -
      (this.cameraKeys.leftA.isDown || this.cameraKeys.leftQ.isDown ? 1 : 0);
    const yDirection =
      (this.cameraKeys.downS.isDown ? 1 : 0) -
      (this.cameraKeys.upW.isDown || this.cameraKeys.upZ.isDown ? 1 : 0);

    if (xDirection === 0 && yDirection === 0) {
      return;
    }

    const length = Math.sqrt(xDirection * xDirection + yDirection * yDirection);
    const distance =
      balanceValues.camera.keyboardSpeedPerSecond * (deltaMs / 1000);

    this.panCameraBy(
      (xDirection / length) * distance,
      (yDirection / length) * distance,
    );
  }

  private panCameraBy(deltaX: number, deltaY: number): void {
    const camera = this.cameras.main;

    this.setCameraScroll(camera.scrollX + deltaX, camera.scrollY + deltaY);
  }

  private setCameraScroll(scrollX: number, scrollY: number): void {
    const state = this.simulation.getState();
    const map = missionDefinitions[state.missionId].map;
    const camera = this.cameras.main;
    const maxX = Math.max(0, map.width - camera.width / camera.zoom);
    const maxY = Math.max(0, map.height - camera.height / camera.zoom);

    camera.setScroll(
      Phaser.Math.Clamp(scrollX, 0, maxX),
      Phaser.Math.Clamp(scrollY, 0, maxY),
    );
  }

  private renderState(state: GameState) {
    const graphics = this.dynamicLayer;

    if (!graphics) {
      return;
    }

    graphics.clear();
    this.drawMap(graphics, state);
    this.drawTissueCells(graphics, state);
    this.drawAntiviralZone(graphics, state);
    this.drawInflammatoryZones(graphics, state);
    this.drawBiofilms(graphics, state);
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

    graphics.fillStyle(0x62d3c8, 0.08);
    graphics.fillRoundedRect(
      tissueZone.x,
      tissueZone.y,
      tissueZone.width,
      tissueZone.height,
      18,
    );
    graphics.lineStyle(3, 0x62d3c8, 0.28);
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

    graphics.fillStyle(0x62d3c8, 0.16);
    graphics.fillCircle(map.lymphExit.x, map.lymphExit.y, map.lymphExit.radius);
    graphics.lineStyle(3, 0x62d3c8, 0.58);
    graphics.strokeCircle(map.lymphExit.x, map.lymphExit.y, map.lymphExit.radius);
  }

  private drawTissueCells(graphics: Phaser.GameObjects.Graphics, state: GameState) {
    for (const cell of state.tissueCells) {
      if (cell.status === "destroyed") {
        graphics.fillStyle(0x2d3940, 0.52);
        graphics.fillCircle(cell.position.x, cell.position.y, cell.radius * 0.72);
        graphics.lineStyle(2, 0x51606a, 0.42);
        graphics.strokeCircle(cell.position.x, cell.position.y, cell.radius);
        continue;
      }

      if (cell.status === "infected") {
        graphics.fillStyle(0x8bbcff, 0.34);
        graphics.fillCircle(cell.position.x, cell.position.y, cell.radius + 10);
        graphics.fillStyle(0xb69cff, 0.94);
      } else {
        graphics.fillStyle(0x7ee28a, 0.84);
      }

      graphics.fillCircle(cell.position.x, cell.position.y, cell.radius);
      if (cell.antiviralProtectedMs > 0) {
        graphics.lineStyle(2, 0x8bbcff, 0.7);
        graphics.strokeCircle(cell.position.x, cell.position.y, cell.radius + 8);
      }
      graphics.lineStyle(
        cell.status === "infected" ? 4 : 2,
        cell.status === "infected" ? 0x8bbcff : 0xd9ffe0,
        cell.status === "infected" ? 0.82 : 0.44,
      );
      graphics.strokeCircle(cell.position.x, cell.position.y, cell.radius + 3);
      this.drawHealthBar(
        graphics,
        cell.position.x,
        cell.position.y - cell.radius - 12,
        cell.health,
        cell.maxHealth,
      );
    }
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
        } else if (isNkCell(entity)) {
          graphics.fillTriangle(
            entity.position.x,
            entity.position.y - entity.radius,
            entity.position.x - entity.radius,
            entity.position.y,
            entity.position.x,
            entity.position.y + entity.radius,
          );
          graphics.fillTriangle(
            entity.position.x,
            entity.position.y - entity.radius,
            entity.position.x + entity.radius,
            entity.position.y,
            entity.position.x,
            entity.position.y + entity.radius,
          );
        } else if (isCytotoxicT(entity)) {
          graphics.fillCircle(entity.position.x, entity.position.y, entity.radius);
          graphics.fillStyle(0x071217, 0.8);
          graphics.fillRect(
            entity.position.x - entity.radius * 0.7,
            entity.position.y - 2,
            entity.radius * 1.4,
            4,
          );
          graphics.fillRect(
            entity.position.x - 2,
            entity.position.y - entity.radius * 0.7,
            4,
            entity.radius * 1.4,
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

        if (isNeutrophil(entity) && entity.lifeRemainingMs !== undefined) {
          const lifeRatio = Phaser.Math.Clamp(
            entity.lifeRemainingMs / balanceValues.neutrophilLifetimeMs,
            0,
            1,
          );
          graphics.lineStyle(3, 0xffc76b, 0.3 + lifeRatio * 0.55);
          graphics.beginPath();
          graphics.arc(
            entity.position.x,
            entity.position.y,
            entity.radius + 8,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * lifeRatio,
          );
          graphics.strokePath();
        }

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
        const definition = pathogenDefinitions[entity.pathogenTypeId];

        graphics.fillStyle(definition.color, 0.95);
        drawPathogenShape(graphics, entity.position.x, entity.position.y, entity.radius, definition.shape);
        graphics.lineStyle(2, definition.outlineColor, 0.58);
        strokePathogenShape(graphics, entity.position.x, entity.position.y, entity.radius, definition.shape);
        graphics.fillStyle(0xf5fbff, 0.86);
        graphics.fillCircle(entity.position.x + entity.radius * 0.62, entity.position.y - entity.radius * 0.28, 2.2);
        this.drawHealthBar(graphics, entity.position.x, entity.position.y - 24, entity.health, entity.maxHealth);

        if (entity.phagocytosedByEntityId) {
          graphics.lineStyle(4, 0x62d3c8, 0.78);
          graphics.strokeCircle(entity.position.x, entity.position.y, entity.radius + 9);
        }
      }

      if (isVirus(entity)) {
        const definition = pathogenDefinitions[entity.pathogenTypeId];

        graphics.fillStyle(definition.color, 0.95);
        drawPathogenShape(
          graphics,
          entity.position.x,
          entity.position.y,
          entity.radius,
          definition.shape,
        );
        graphics.lineStyle(2, definition.outlineColor, 0.68);
        strokePathogenShape(
          graphics,
          entity.position.x,
          entity.position.y,
          entity.radius,
          definition.shape,
        );
        this.drawHealthBar(
          graphics,
          entity.position.x,
          entity.position.y - 20,
          entity.health,
          entity.maxHealth,
        );
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

  private drawAntiviralZone(
    graphics: Phaser.GameObjects.Graphics,
    state: GameState,
  ) {
    if (!state.antiviral.position || state.antiviral.activeMs <= 0) {
      return;
    }

    const ratio = Phaser.Math.Clamp(
      state.antiviral.activeMs / balanceValues.antiviral.durationMs,
      0,
      1,
    );

    graphics.fillStyle(0x8bbcff, 0.08 + ratio * 0.08);
    graphics.fillCircle(
      state.antiviral.position.x,
      state.antiviral.position.y,
      state.antiviral.radius,
    );
    graphics.lineStyle(3, 0x8bbcff, 0.3 + ratio * 0.35);
    graphics.strokeCircle(
      state.antiviral.position.x,
      state.antiviral.position.y,
      state.antiviral.radius,
    );
  }

  private drawBiofilms(graphics: Phaser.GameObjects.Graphics, state: GameState) {
    for (const zone of state.biofilmZones) {
      graphics.fillStyle(0x7cbf72, 0.16);
      graphics.fillCircle(zone.position.x, zone.position.y, zone.radius);
      graphics.lineStyle(3, 0x9ee08a, 0.44);
      graphics.strokeCircle(zone.position.x, zone.position.y, zone.radius);
      graphics.lineStyle(1, 0xf5fbff, 0.18);
      graphics.strokeCircle(zone.position.x, zone.position.y, zone.radius * 0.72);
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
          : effect.kind === "treatment"
            ? balanceValues.attackEffectTtlMs * 3
          : effect.kind === "phagocytosis"
            ? balanceValues.attackEffectTtlMs * 2
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
    if (!this.leftDragStart || !this.leftDragCurrent) {
      return;
    }

    const x = Math.min(this.leftDragStart.x, this.leftDragCurrent.x);
    const y = Math.min(this.leftDragStart.y, this.leftDragCurrent.y);
    const width = Math.abs(this.leftDragCurrent.x - this.leftDragStart.x);
    const height = Math.abs(this.leftDragCurrent.y - this.leftDragStart.y);

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
    const score = calculateMissionScore(state);
    const snapshot: GameSnapshot = {
      missionId: state.missionId,
      missionTitle: mission.title,
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
      antiviralSignalCooldownMs: state.productionCooldowns.antiviralSignalMs,
      antiviralActiveMs: state.antiviral.activeMs,
      treatmentCooldowns: { ...state.treatments.cooldowns },
      activeTreatments: { ...state.treatments.activeMs },
      bacterialAnalysisComplete:
        state.adaptiveResearch.bacterialAnalysisComplete,
      viralAnalysisComplete: state.adaptiveResearch.viralAnalysisComplete,
      objectives: evaluateMissionObjectives(state),
      score,
      rank: getMissionRank(score),
      currentWave: Math.min(
        state.waves.currentWaveIndex + 1,
        mission.waves.length,
      ),
      totalWaves: mission.waves.length,
      entities: Object.values(state.entities),
      debrisCount: state.debris.length,
      biofilmCount: state.biofilmZones.length,
      healthyTissueCells: state.tissueCells.filter(
        (cell) => cell.status === "healthy",
      ).length,
      infectedTissueCells: state.tissueCells.filter(
        (cell) => cell.status === "infected",
      ).length,
      destroyedTissueCells: state.tissueCells.filter(
        (cell) => cell.status === "destroyed",
      ).length,
      threatSummary: getThreatSummary(state),
      selectedEntityIds: state.selectedEntityIds,
    };

    this.bridge.publishSnapshot(snapshot);
    this.lastPublishedStatus = state.status;
  }
}

function drawPathogenShape(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  shape: string,
): void {
  if (shape === "coccus") {
    graphics.fillCircle(x, y, radius);
    return;
  }

  if (shape === "cluster") {
    graphics.fillCircle(x - radius * 0.45, y, radius * 0.72);
    graphics.fillCircle(x + radius * 0.4, y + radius * 0.1, radius * 0.7);
    graphics.fillCircle(x, y - radius * 0.45, radius * 0.62);
    return;
  }

  if (shape === "spore") {
    graphics.fillTriangle(x, y - radius, x - radius, y + radius * 0.8, x + radius, y + radius * 0.8);
    return;
  }

  if (shape === "virus") {
    graphics.fillCircle(x, y, radius);
    graphics.fillTriangle(x, y - radius * 1.7, x - radius * 0.45, y - radius * 0.65, x + radius * 0.45, y - radius * 0.65);
    graphics.fillTriangle(x, y + radius * 1.7, x - radius * 0.45, y + radius * 0.65, x + radius * 0.45, y + radius * 0.65);
    graphics.fillTriangle(x - radius * 1.7, y, x - radius * 0.65, y - radius * 0.45, x - radius * 0.65, y + radius * 0.45);
    graphics.fillTriangle(x + radius * 1.7, y, x + radius * 0.65, y - radius * 0.45, x + radius * 0.65, y + radius * 0.45);
    return;
  }

  graphics.fillEllipse(x, y, radius * 2.35, radius * (shape === "rod" ? 1.25 : 1.55));
}

function strokePathogenShape(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  shape: string,
): void {
  if (shape === "coccus" || shape === "cluster") {
    graphics.strokeCircle(x, y, radius * 1.15);
    return;
  }

  if (shape === "spore") {
    graphics.strokeTriangle(x, y - radius, x - radius, y + radius * 0.8, x + radius, y + radius * 0.8);
    return;
  }

  if (shape === "virus") {
    graphics.strokeCircle(x, y, radius * 1.25);
    return;
  }

  graphics.strokeEllipse(x, y, radius * 2.5, radius * (shape === "rod" ? 1.38 : 1.75));
}

function getThreatSummary(state: GameState): GameSnapshot["threatSummary"] {
  const counts = new Map<PathogenTypeId, number>();

  for (const entity of Object.values(state.entities)) {
    if (isHostilePathogen(entity)) {
      counts.set(entity.pathogenTypeId, (counts.get(entity.pathogenTypeId) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([pathogenTypeId, count]) => ({ pathogenTypeId, count }))
    .sort(
      (a, b) =>
        pathogenDefinitions[b.pathogenTypeId].targetPriority -
          pathogenDefinitions[a.pathogenTypeId].targetPriority ||
        b.count - a.count,
    );
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

  if (kind === "nkCell") {
    return 0x5fd3ff;
  }

  if (kind === "cytotoxicT") {
    return 0xf06cd6;
  }

  return 0x62d3c8;
}

function getEffectColor(kind: string): number {
  if (kind === "antibody" || kind === "adaptive") {
    return 0xb69cff;
  }

  if (kind === "phagocytosis") {
    return 0x62d3c8;
  }

  if (kind === "infection" || kind === "antiviral") {
    return 0x8bbcff;
  }

  if (kind === "treatment") {
    return 0x7ee28a;
  }

  if (kind === "cytotoxic") {
    return 0xf06cd6;
  }

  if (kind === "attack") {
    return 0xffc76b;
  }

  return 0xff7f8f;
}

function isTextInputActive(): boolean {
  const activeElement = document.activeElement;

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    activeElement?.getAttribute("contenteditable") === "true"
  );
}
