import Phaser from "phaser";
import {
  pathogenDefinitions,
  type PathogenTypeId,
} from "../../data/pathogens";
import { unitDefinitions, type UnitTypeId } from "../../data/units";
import {
  spriteLabPathogens,
  spriteLabUnits,
  spriteLabWorldWidth,
} from "../../debug/spriteLabRoster";
import {
  assignSpriteLabTarget,
  beginSpriteLabDrag,
  createSpriteLabSimulation,
  dragSpriteLabUnit,
  findNearestSpriteLabPathogen,
  resetSpriteLabUnit,
  stepSpriteLabSimulation,
  stopSpriteLabUnit,
  type SpriteLabAnimationState,
  type SpriteLabEvent,
  type SpriteLabSimulationState,
} from "../../debug/spriteLabSimulation";
import { registerEntityAnimations } from "../animations/registerEntityAnimations";
import { getEntitySpriteDefinition } from "../assets/entitySpriteManifest";
import { preloadEntitySprites } from "../assets/preloadEntitySprites";
import { drawProceduralPathogen } from "../rendering/drawProceduralPathogen";

const LAB_HEIGHT = 700;
const TOOLBAR_Y = 646;
const CAMERA_SPEED = 620;

type UnitView = {
  sprite?: Phaser.GameObjects.Sprite;
  graphics?: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
  infiniteHealthLabel: Phaser.GameObjects.Text;
  lastAnimationState?: SpriteLabAnimationState;
};

type PathogenView = {
  graphics: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
};

export class SpriteLabScene extends Phaser.Scene {
  private simulation: SpriteLabSimulationState = createSpriteLabSimulation();
  private selectedUnitId: UnitTypeId = spriteLabUnits[0].id;
  private selectedPathogenId: PathogenTypeId = spriteLabPathogens[0].id;
  private unitSelectionFrame?: Phaser.GameObjects.Graphics;
  private pathogenSelectionFrame?: Phaser.GameObjects.Graphics;
  private toolbarStatus?: Phaser.GameObjects.Text;
  private unitViews = new Map<UnitTypeId, UnitView>();
  private pathogenViews = new Map<PathogenTypeId, PathogenView>();
  private draggingUnitId: UnitTypeId | null = null;
  private dragPointerX: number | null = null;
  private cameraLeft?: Phaser.Input.Keyboard.Key;
  private cameraRight?: Phaser.Input.Keyboard.Key;

  constructor() {
    super("SpriteLabScene");
  }

  preload(): void {
    preloadEntitySprites(this);
  }

  create(): void {
    registerEntityAnimations(this);
    this.cameras.main.setBounds(0, 0, spriteLabWorldWidth, LAB_HEIGHT);
    this.input.mouse?.disableContextMenu();

    this.drawBackdrop();
    this.createUnitRow();
    this.createPathogenRow();
    this.unitSelectionFrame = this.add.graphics().setDepth(80);
    this.pathogenSelectionFrame = this.add.graphics().setDepth(80);
    this.createFixedInterface();
    this.setupCameraControls();
    this.redrawSelectionFrames();
    this.updateToolbarStatus();
  }

  update(time: number, deltaMs: number): void {
    const direction =
      (this.cameraRight?.isDown ? 1 : 0) -
      (this.cameraLeft?.isDown ? 1 : 0);

    if (direction !== 0) {
      this.panCamera(direction * CAMERA_SPEED * (deltaMs / 1000));
    }

    const result = stepSpriteLabSimulation(this.simulation, deltaMs);

    this.simulation = result.state;
    this.syncUnitViews();
    for (const pathogen of spriteLabPathogens) {
      this.renderPathogen(pathogen.id, time);
    }
    for (const event of result.events) {
      this.playInteractionEffect(event);
    }
    this.redrawSelectionFrames();
    this.updateToolbarStatus();
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics().setDepth(-10);

    graphics.fillStyle(0x071217, 1);
    graphics.fillRect(0, 0, spriteLabWorldWidth, LAB_HEIGHT);
    graphics.fillStyle(0x132c34, 0.92);
    graphics.fillRoundedRect(28, 142, spriteLabWorldWidth - 56, 154, 18);
    graphics.lineStyle(2, 0x62d3c8, 0.45);
    graphics.strokeRoundedRect(28, 142, spriteLabWorldWidth - 56, 154, 18);
    graphics.fillStyle(0x321c2c, 0.88);
    graphics.fillRoundedRect(28, 366, spriteLabWorldWidth - 56, 166, 18);
    graphics.lineStyle(2, 0xff7f8f, 0.5);
    graphics.strokeRoundedRect(28, 366, spriteLabWorldWidth - 56, 166, 18);

    this.add
      .text(48, 153, `UNITES IMMUNITAIRES - ${spriteLabUnits.length}`, {
        color: "#8cf5e8",
        fontFamily: "monospace",
        fontSize: "17px",
        fontStyle: "bold",
      })
      .setDepth(2);
    this.add
      .text(48, 377, `PATHOGENES - ${spriteLabPathogens.length}`, {
        color: "#ff9eaa",
        fontFamily: "monospace",
        fontSize: "17px",
        fontStyle: "bold",
      })
      .setDepth(2);
  }

  private createUnitRow(): void {
    for (const entry of spriteLabUnits) {
      const definition = unitDefinitions[entry.id];
      const spriteDefinition = getEntitySpriteDefinition(entry.id);
      const hitZone = this.add
        .zone(entry.x, entry.y, 96, 92)
        .setDepth(55)
        .setInteractive({ cursor: "grab", draggable: true });
      const infiniteHealthLabel = this.add
        .text(entry.x, entry.y - 52, "PV ∞", {
          color: "#7ee28a",
          fontFamily: "monospace",
          fontSize: "10px",
          fontStyle: "bold",
          backgroundColor: "#071217cc",
        })
        .setOrigin(0.5)
        .setDepth(45);
      const view: UnitView = { hitZone, infiniteHealthLabel };

      if (
        spriteDefinition?.enabled &&
        this.textures.exists(spriteDefinition.textureKey)
      ) {
        const sprite = this.add
          .sprite(
            entry.x + spriteDefinition.visualOffset.x,
            entry.y + spriteDefinition.visualOffset.y,
            spriteDefinition.textureKey,
            0,
          )
          .setOrigin(spriteDefinition.anchor.x, spriteDefinition.anchor.y)
          .setScale(spriteDefinition.scale * 1.18)
          .setDepth(10);
        const idleAnimation = spriteDefinition.animations.idle;

        if (idleAnimation && this.anims.exists(idleAnimation.key)) {
          sprite.play(idleAnimation.key);
        }
        view.sprite = sprite;
      } else {
        view.graphics = this.drawProceduralUnit(entry.id, entry.x, entry.y);
      }

      this.unitViews.set(entry.id, view);
      this.add
        .text(entry.x, entry.y + 52, definition.displayName, {
          align: "center",
          color: "#f5fbff",
          fontFamily: "monospace",
          fontSize: "13px",
          fontStyle: "bold",
          wordWrap: { width: 134 },
        })
        .setOrigin(0.5, 0)
        .setDepth(12);
      this.add
        .text(entry.x, entry.y + 89, entry.hasSprite ? "SPRITE" : "FALLBACK", {
          color: entry.hasSprite ? "#62d3c8" : "#ffc76b",
          fontFamily: "monospace",
          fontSize: "10px",
        })
        .setOrigin(0.5)
        .setDepth(12);
      hitZone.on("pointerdown", () => this.selectUnit(entry.id));
      this.input.setDraggable(hitZone);
      hitZone.on("dragstart", () => {
        this.draggingUnitId = entry.id;
        this.simulation = beginSpriteLabDrag(this.simulation, entry.id);
        this.selectUnit(entry.id);
      });
      hitZone.on(
        "drag",
        (
          _pointer: Phaser.Input.Pointer,
          dragX: number,
          dragY: number,
        ) => {
          const position = {
            x: Phaser.Math.Clamp(dragX, 48, spriteLabWorldWidth - 48),
            y: Phaser.Math.Clamp(dragY, 128, 555),
          };

          this.simulation = dragSpriteLabUnit(
            this.simulation,
            entry.id,
            position,
          );
          this.syncUnitViews();
        },
      );
      hitZone.on("dragend", () => {
        const unit = this.simulation.units[entry.id];
        const targetId = findNearestSpriteLabPathogen(
          this.simulation,
          unit.position,
        );

        this.draggingUnitId = null;
        this.selectedPathogenId = targetId;
        this.simulation = assignSpriteLabTarget(
          this.simulation,
          entry.id,
          targetId,
        );
        this.redrawSelectionFrames();
      });
    }
  }

  private createPathogenRow(): void {
    for (const entry of spriteLabPathogens) {
      const definition = pathogenDefinitions[entry.id];
      const hitZone = this.add
        .zone(entry.x, entry.y, 112, 92)
        .setDepth(55)
        .setInteractive({ cursor: "crosshair" });
      const view: PathogenView = {
        graphics: this.add.graphics().setDepth(10),
        hitZone,
      };

      this.pathogenViews.set(entry.id, view);
      this.renderPathogen(entry.id);
      this.add
        .text(entry.x, entry.y + 45, definition.displayName, {
          align: "center",
          color: "#f5fbff",
          fontFamily: "monospace",
          fontSize: "11px",
          fontStyle: "bold",
          wordWrap: { width: 126 },
        })
        .setOrigin(0.5, 0)
        .setDepth(12);
      this.add
        .text(entry.x, entry.y + 84, definition.pathogenClass.toUpperCase(), {
          color: "#ff9eaa",
          fontFamily: "monospace",
          fontSize: "9px",
        })
        .setOrigin(0.5)
        .setDepth(12);
      this.add
        .text(entry.x, entry.y - 42, "∞", {
          color: "#071217",
          fontFamily: "monospace",
          fontSize: "11px",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(12);
      hitZone.on("pointerdown", () => this.selectPathogen(entry.id));
    }
  }

  private drawProceduralUnit(
    id: UnitTypeId,
    x: number,
    y: number,
  ): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setPosition(x, y).setDepth(10);
    const color = getUnitColor(id);
    const radius = unitDefinitions[id].radius;

    graphics.fillStyle(color, 0.95);
    if (id === "dendriticCell") {
      graphics.fillTriangle(0, -radius, -radius, radius, radius, radius);
    } else if (id === "plasmocyte") {
      graphics.fillRoundedRect(-radius, -radius, radius * 2, radius * 2, 8);
    } else if (id === "nkCell") {
      graphics.fillTriangle(0, -radius, -radius, 0, 0, radius);
      graphics.fillTriangle(0, -radius, radius, 0, 0, radius);
    } else {
      graphics.fillCircle(0, 0, radius);
    }
    if (id === "cytotoxicT") {
      graphics.fillStyle(0x071217, 0.82);
      graphics.fillRect(-radius * 0.7, -2, radius * 1.4, 4);
      graphics.fillRect(-2, -radius * 0.7, 4, radius * 1.4);
    }
    graphics.lineStyle(3, 0xf5fbff, 0.3);
    graphics.strokeCircle(0, 0, radius + 4);

    return graphics;
  }

  private renderPathogen(id: PathogenTypeId, elapsedMs = 0): void {
    const entry = spriteLabPathogens.find((candidate) => candidate.id === id);
    const view = this.pathogenViews.get(id);

    if (!entry || !view) {
      return;
    }

    const definition = pathogenDefinitions[id];
    const graphics = view.graphics;
    const radius = Phaser.Math.Clamp(definition.radius * 1.2, 12, 30);
    const attackPreviewCooldownMs = 1_600;
    const attackPreviewAgeMs =
      (elapsedMs + entry.x * 3) % attackPreviewCooldownMs;

    graphics.clear();
    drawProceduralPathogen(graphics, {
      identity: `sprite-lab-${id}`,
      pathogenTypeId: id,
      x: entry.x,
      y: entry.y,
      radius,
      alpha: 0.95,
      elapsedMs,
      movementPhase: elapsedMs / 160,
      movementIntensity: 0.72,
      facingAngle: 0,
      attackCooldownMs: attackPreviewCooldownMs,
      attackCooldownRemainingMs:
        attackPreviewCooldownMs - attackPreviewAgeMs,
    });
    graphics.fillStyle(0x071217, 0.9);
    graphics.fillRoundedRect(entry.x - 30, entry.y - 43, 60, 6, 3);
    graphics.fillStyle(0x7ee28a, 1);
    graphics.fillRoundedRect(entry.x - 29, entry.y - 42, 58, 4, 2);
  }

  private createFixedInterface(): void {
    const topBar = this.add
      .rectangle(0, 0, this.scale.width, 112, 0x071217, 0.96)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900);
    topBar.setStrokeStyle(2, 0x62d3c8, 0.55);
    this.add
      .text(24, 14, "LABORATOIRE SPRITES - MODE DEV", {
        color: "#f8d84a",
        fontFamily: "monospace",
        fontSize: "22px",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(910);
    this.add
      .text(
        24,
        47,
        "Glissez une unite vers un pathogene, ou cliquez l'unite puis sa cible. PV infinis. Molette / Q-D / fleches: camera.",
        {
          color: "#b8ccd5",
          fontFamily: "monospace",
          fontSize: "13px",
          wordWrap: { width: Math.max(760, this.scale.width - 48) },
        },
      )
      .setScrollFactor(0)
      .setDepth(910);

    const toolbar = this.add
      .rectangle(0, 602, this.scale.width, 98, 0x071217, 0.97)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900);
    toolbar.setStrokeStyle(2, 0x62d3c8, 0.55);
    this.toolbarStatus = this.add
      .text(20, 611, "Selectionnez une entree", {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "13px",
      })
      .setScrollFactor(0)
      .setDepth(910);

    this.createButton(20, TOOLBAR_Y, 126, "Attaquer cible", () =>
      this.attackSelectedTarget(),
    );
    this.createButton(156, TOOLBAR_Y, 96, "Stop", () =>
      this.stopSelectedUnit(),
    );
    this.createButton(262, TOOLBAR_Y, 126, "Reset unite", () =>
      this.resetSelectedUnit(),
    );
    this.createButton(398, TOOLBAR_Y, 110, "Reset tout", () =>
      this.resetAllUnits(),
    );
    this.add
      .text(530, TOOLBAR_Y + 2, "Les ennemis restent immobiles et personne ne peut mourir.", {
        color: "#8fa8b4",
        fontFamily: "monospace",
        fontSize: "11px",
        wordWrap: { width: Math.max(320, this.scale.width - 550) },
      })
      .setScrollFactor(0)
      .setDepth(910);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    label: string,
    callback: () => void,
  ): void {
    const background = this.add
      .rectangle(x, y, width, 32, 0x163944, 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(920)
      .setStrokeStyle(1, 0x62d3c8, 0.8)
      .setInteractive({ cursor: "pointer" });
    const text = this.add
      .text(x + width / 2, y + 16, label, {
        color: "#f5fbff",
        fontFamily: "monospace",
        fontSize: "12px",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(921);

    background.on("pointerover", () => background.setFillStyle(0x24586a, 1));
    background.on("pointerout", () => background.setFillStyle(0x163944, 1));
    background.on("pointerdown", callback);
    text.setInteractive({ cursor: "pointer" }).on("pointerdown", callback);
  }

  private setupCameraControls(): void {
    const keyboard = this.input.keyboard;

    if (keyboard) {
      const leftArrow = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      const rightArrow = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      const leftQ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      const leftA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      const rightD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

      this.cameraLeft = leftArrow;
      this.cameraRight = rightArrow;
      leftQ.on("down", () => this.panCamera(-72));
      leftA.on("down", () => this.panCamera(-72));
      rightD.on("down", () => this.panCamera(72));
    }

    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
      ) => this.panCamera(deltaX + deltaY),
    );
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragPointerX = pointer.x;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (
        !pointer.isDown ||
        this.dragPointerX === null ||
        this.draggingUnitId !== null
      ) {
        return;
      }
      const delta = this.dragPointerX - pointer.x;
      this.dragPointerX = pointer.x;
      if (Math.abs(delta) > 1) {
        this.panCamera(delta);
      }
    });
    this.input.on("pointerup", () => {
      this.dragPointerX = null;
    });
  }

  private panCamera(deltaX: number): void {
    const camera = this.cameras.main;
    const maxScrollX = Math.max(0, spriteLabWorldWidth - camera.width);

    camera.setScroll(
      Phaser.Math.Clamp(camera.scrollX + deltaX, 0, maxScrollX),
      0,
    );
  }

  private selectUnit(unitId: UnitTypeId): void {
    this.selectedUnitId = unitId;
    this.redrawSelectionFrames();
    this.updateToolbarStatus();
  }

  private selectPathogen(pathogenId: PathogenTypeId): void {
    this.selectedPathogenId = pathogenId;
    this.simulation = assignSpriteLabTarget(
      this.simulation,
      this.selectedUnitId,
      pathogenId,
    );
    this.redrawSelectionFrames();
    this.updateToolbarStatus();
  }

  private redrawSelectionFrames(): void {
    const unit = this.simulation.units[this.selectedUnitId];
    const pathogen = this.simulation.pathogens[this.selectedPathogenId];

    this.unitSelectionFrame?.clear();
    this.unitSelectionFrame?.lineStyle(4, 0xf8d84a, 0.98);
    this.unitSelectionFrame?.strokeRoundedRect(
      unit.position.x - 48,
      unit.position.y - 48,
      96,
      96,
      13,
    );
    this.pathogenSelectionFrame?.clear();
    this.pathogenSelectionFrame?.lineStyle(3, 0xff8fa1, 0.95);
    this.pathogenSelectionFrame?.strokeRoundedRect(
      pathogen.position.x - 56,
      pathogen.position.y - 50,
      112,
      100,
      13,
    );
  }

  private attackSelectedTarget(): void {
    this.simulation = assignSpriteLabTarget(
      this.simulation,
      this.selectedUnitId,
      this.selectedPathogenId,
    );
  }

  private stopSelectedUnit(): void {
    this.simulation = stopSpriteLabUnit(
      this.simulation,
      this.selectedUnitId,
    );
  }

  private resetSelectedUnit(): void {
    this.simulation = resetSpriteLabUnit(
      this.simulation,
      this.selectedUnitId,
    );
    this.syncUnitViews();
  }

  private resetAllUnits(): void {
    for (const entry of spriteLabUnits) {
      this.simulation = resetSpriteLabUnit(this.simulation, entry.id);
    }
    this.syncUnitViews();
  }

  private syncUnitViews(): void {
    for (const unit of Object.values(this.simulation.units)) {
      const view = this.unitViews.get(unit.id);
      const spriteDefinition = getEntitySpriteDefinition(unit.id);

      if (!view) {
        continue;
      }

      view.sprite?.setPosition(
        unit.position.x + (spriteDefinition?.visualOffset.x ?? 0),
        unit.position.y + (spriteDefinition?.visualOffset.y ?? 0),
      );
      view.graphics?.setPosition(unit.position.x, unit.position.y);
      view.hitZone.setPosition(unit.position.x, unit.position.y);
      view.infiniteHealthLabel.setPosition(
        unit.position.x,
        unit.position.y - 52,
      );

      if (view.sprite && unit.targetPathogenId) {
        const target = this.simulation.pathogens[unit.targetPathogenId];
        view.sprite.setFlipX(target.position.x < unit.position.x);
      }
      this.playUnitAnimation(unit.id, unit.animationState);
    }
  }

  private playUnitAnimation(
    unitId: UnitTypeId,
    state: SpriteLabAnimationState,
  ): void {
    const view = this.unitViews.get(unitId);
    const spriteDefinition = getEntitySpriteDefinition(unitId);

    if (!view?.sprite || !spriteDefinition || view.lastAnimationState === state) {
      return;
    }

    const animation =
      spriteDefinition.animations[state] ??
      (state === "attack"
        ? spriteDefinition.animations.special ??
          spriteDefinition.animations.phagocytosis
        : undefined) ??
      spriteDefinition.animations.idle;

    if (animation && this.anims.exists(animation.key)) {
      view.sprite.play(animation.key, true);
      view.lastAnimationState = state;
    }
  }

  private playInteractionEffect(event: SpriteLabEvent): void {
    if (event.unitId === "plasmocyte") {
      this.launchAntibodyProjectile(event);
      return;
    }

    if (event.kind === "collect") {
      this.launchCollectionParticle(event);
      return;
    }

    this.flashPathogen(event.pathogenId, getUnitColor(event.unitId));
  }

  private launchAntibodyProjectile(event: SpriteLabEvent): void {
    const source = this.simulation.units[event.unitId].position;
    const target = this.simulation.pathogens[event.pathogenId].position;
    const spriteDefinition = getEntitySpriteDefinition("antibodyProjectile");
    let projectile: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;

    if (
      spriteDefinition?.enabled &&
      this.textures.exists(spriteDefinition.textureKey)
    ) {
      const sprite = this.add
        .sprite(source.x, source.y, spriteDefinition.textureKey, 0)
        .setDepth(60)
        .setScale(0.9);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const direction =
        dx < 0
          ? "left"
          : dy < -24
            ? "upRight"
            : dy > 24
              ? "downRight"
              : "right";
      const animation = spriteDefinition.animations[direction];

      if (animation && this.anims.exists(animation.key)) {
        sprite.play(animation.key);
      }
      projectile = sprite;
    } else {
      projectile = this.add.circle(source.x, source.y, 6, 0xf8d84a, 1);
    }

    this.tweens.add({
      targets: projectile,
      x: target.x,
      y: target.y,
      duration: 430,
      ease: "Sine.easeInOut",
      onComplete: () => {
        projectile.destroy();
        this.flashPathogen(event.pathogenId, 0xf8d84a);
      },
    });
  }

  private launchCollectionParticle(event: SpriteLabEvent): void {
    const source = this.simulation.units[event.unitId].position;
    const target = this.simulation.pathogens[event.pathogenId].position;
    const particle = this.add.circle(target.x, target.y, 6, 0xb69cff, 1).setDepth(60);

    this.tweens.add({
      targets: particle,
      x: source.x,
      y: source.y,
      alpha: 0.25,
      duration: 460,
      ease: "Sine.easeInOut",
      onComplete: () => particle.destroy(),
    });
    this.flashPathogen(event.pathogenId, 0xb69cff);
  }

  private flashPathogen(pathogenId: PathogenTypeId, color: number): void {
    const pathogen = this.simulation.pathogens[pathogenId];
    const view = this.pathogenViews.get(pathogenId);
    const impact = this.add
      .circle(pathogen.position.x, pathogen.position.y, 12, color, 0.55)
      .setDepth(58);

    if (view) {
      view.graphics.setAlpha(0.28);
      this.tweens.add({
        targets: view.graphics,
        alpha: 1,
        duration: 180,
      });
    }
    this.tweens.add({
      targets: impact,
      scale: 2.5,
      alpha: 0,
      duration: 260,
      onComplete: () => impact.destroy(),
    });
  }

  private updateToolbarStatus(): void {
    const unit = this.simulation.units[this.selectedUnitId];
    const target = pathogenDefinitions[this.selectedPathogenId];
    const stateLabels: Record<SpriteLabAnimationState, string> = {
      idle: "repos",
      move: "deplacement",
      attack: "attaque",
      collect: "collecte",
    };

    this.toolbarStatus?.setText(
      `${unitDefinitions[unit.id].displayName} | PV ∞ | ${
        stateLabels[unit.animationState]
      } | cible: ${target.displayName} (PV ∞)`,
    );
  }
}

function getUnitColor(id: UnitTypeId): number {
  const colors: Record<UnitTypeId, number> = {
    macrophage: 0x62d3c8,
    neutrophil: 0xffc76b,
    dendriticCell: 0xb69cff,
    plasmocyte: 0xf7f0d8,
    nkCell: 0x5fd3ff,
    cytotoxicT: 0xf06cd6,
  };

  return colors[id];
}
