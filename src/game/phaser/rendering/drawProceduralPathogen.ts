import Phaser from "phaser";
import {
  pathogenDefinitions,
  type PathogenDefinition,
  type PathogenTypeId,
} from "../../data/pathogens";
import { stableHash } from "../../types/shared";
import {
  getPathogenFamilyAnimationProfile,
  getPathogenVisualVariant,
  resolvePathogenVisualFamily,
  resolvePathogenVisualPose,
  type PathogenFamilyAnimationProfile,
  type PathogenVisualFamily,
} from "./pathogenVisualModel";

export type PathogenExitMode = "death" | "infection";

export type ProceduralPathogenRenderInput = Readonly<{
  identity: string;
  pathogenTypeId: PathogenTypeId;
  x: number;
  y: number;
  radius: number;
  elapsedMs: number;
  alpha?: number;
  scale?: number;
  attackCooldownMs?: number;
  attackCooldownRemainingMs?: number;
  movementPhase?: number;
  movementIntensity?: number;
  facingAngle?: number;
  exitMode?: PathogenExitMode;
  exitProgress?: number;
  exitTarget?: Readonly<{ x: number; y: number }>;
}>;

type Point = { x: number; y: number };

type PathogenPalette = Readonly<{
  outline: number;
  shadow: number;
  body: number;
  highlight: number;
  detail: number;
}>;

type DrawContext = Readonly<{
  definition: PathogenDefinition;
  family: PathogenVisualFamily;
  animations: PathogenFamilyAnimationProfile;
  pathogenTypeId: PathogenTypeId;
  identity: string;
  originX: number;
  originY: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  alpha: number;
  phase: number;
  movementPhase: number;
  movementIntensity: number;
  facingAngle: number;
  attackPulse: number;
  exitProgress: number;
  exitTarget?: Readonly<{ x: number; y: number }>;
  variant: number;
  palette: PathogenPalette;
}>;

export function drawProceduralPathogen(
  graphics: Phaser.GameObjects.Graphics,
  input: ProceduralPathogenRenderInput,
): void {
  const definition = pathogenDefinitions[input.pathogenTypeId];
  const pose = resolvePathogenVisualPose(input);
  const family = resolvePathogenVisualFamily(input.pathogenTypeId, definition);
  const exitProgress = Phaser.Math.Clamp(input.exitProgress ?? 0, 0, 1);
  const exitScale = getExitScale(input.exitMode, exitProgress);
  const alpha =
    Phaser.Math.Clamp(input.alpha ?? 1, 0, 1) *
    getExitAlpha(input.exitMode, exitProgress);

  if (alpha <= 0.01 || exitScale <= 0.05) {
    return;
  }

  const scale = (input.scale ?? 1) * exitScale;
  const originX = pixel(input.x + pose.offsetX);
  const originY = pixel(input.y + pose.bobY);
  const entryProgress =
    input.exitMode === "infection" && input.exitTarget
      ? 1 - (1 - exitProgress) ** 2
      : 0;
  const renderX = input.exitTarget
    ? Phaser.Math.Linear(originX, input.exitTarget.x, entryProgress)
    : originX;
  const renderY = input.exitTarget
    ? Phaser.Math.Linear(originY, input.exitTarget.y, entryProgress)
    : originY;
  const context: DrawContext = {
    definition,
    family,
    animations: getPathogenFamilyAnimationProfile(input.pathogenTypeId),
    pathogenTypeId: input.pathogenTypeId,
    identity: input.identity,
    originX,
    originY,
    x: pixel(renderX),
    y: pixel(renderY + (input.exitMode === "death" ? exitProgress * 3 : 0)),
    radiusX: Math.max(3, pixel(input.radius * scale * pose.scaleX)),
    radiusY: Math.max(3, pixel(input.radius * scale * pose.scaleY)),
    alpha,
    phase: pose.phase,
    movementPhase: pose.movementPhase,
    movementIntensity: pose.movementIntensity,
    facingAngle: pose.facingAngle,
    attackPulse: pose.attackPulse,
    exitProgress,
    exitTarget: input.exitTarget,
    variant: getPathogenVisualVariant(input.identity, input.pathogenTypeId),
    palette: createPalette(definition),
  };

  drawFamily(graphics, family, context);

  if (input.exitMode === "death") {
    drawDeathAnimation(graphics, context, exitProgress);
  } else if (input.exitMode === "infection") {
    drawInfectionCollapse(graphics, context, exitProgress);
  } else if (pose.attackPulse > 0.08) {
    drawAttackAnimation(graphics, context);
  }
}

function drawFamily(
  graphics: Phaser.GameObjects.Graphics,
  family: PathogenVisualFamily,
  context: DrawContext,
): void {
  switch (family) {
    case "bacterium":
      drawBacterium(graphics, context);
      return;
    case "virus":
      drawVirus(graphics, context);
      return;
    case "fungus":
      drawFungus(graphics, context);
      return;
    case "parasite":
      drawParasite(graphics, context);
      return;
    case "cancerCell":
      drawCancerCell(graphics, context);
      return;
    case "collective":
      drawCollective(graphics, context);
  }
}

function drawBacterium(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const {
    definition,
    palette,
    alpha,
    variant,
    x,
    y,
    radiusX,
    radiusY,
    facingAngle,
    movementPhase,
    movementIntensity,
  } = context;

  const tailStart = orientedPoint(x, y, radiusX * 0.72, facingAngle + Math.PI);
  const tailMid = orientedPoint(
    tailStart.x,
    tailStart.y,
    radiusX * (0.62 + movementIntensity * 0.22),
    facingAngle + Math.PI + Math.sin(movementPhase) * 0.26,
  );
  const tailEnd = orientedPoint(
    tailMid.x,
    tailMid.y,
    radiusX * 0.55,
    facingAngle + Math.PI - Math.sin(movementPhase * 1.4) * 0.32,
  );
  graphics.lineStyle(2, palette.highlight, alpha * (0.5 + movementIntensity * 0.32));
  graphics.lineBetween(tailStart.x, tailStart.y, tailMid.x, tailMid.y);
  graphics.lineBetween(tailMid.x, tailMid.y, tailEnd.x, tailEnd.y);

  graphics.lineStyle(1, palette.detail, alpha * 0.66);
  for (const side of [-1, 1]) {
    const piliRoot = orientedPoint(x, y, radiusY * 0.78, facingAngle + side * 1.35);
    const piliTip = orientedPoint(piliRoot.x, piliRoot.y, 4, facingAngle + side * 1.6);
    graphics.lineBetween(piliRoot.x, piliRoot.y, piliTip.x, piliTip.y);
  }

  if (definition.shape === "coccus") {
    const offsets: readonly Point[][] = [
      [{ x: -0.34, y: 0.08 }, { x: 0.32, y: -0.08 }, { x: 0.02, y: -0.4 }],
      [{ x: -0.3, y: -0.18 }, { x: 0.3, y: 0.16 }, { x: -0.02, y: 0.38 }],
      [{ x: -0.36, y: 0.12 }, { x: 0.1, y: -0.32 }, { x: 0.36, y: 0.22 }],
      [{ x: -0.25, y: -0.3 }, { x: 0.3, y: -0.18 }, { x: 0.02, y: 0.34 }],
    ];
    const lobeRadius = Math.max(3, pixel(Math.min(radiusX, radiusY) * 0.68));

    graphics.fillStyle(palette.outline, alpha);
    for (const offset of offsets[variant]) {
      graphics.fillCircle(
        pixel(x + offset.x * radiusX),
        pixel(y + offset.y * radiusY),
        lobeRadius + 2,
      );
    }
    graphics.fillStyle(palette.body, alpha);
    for (const offset of offsets[variant]) {
      graphics.fillCircle(
        pixel(x + offset.x * radiusX),
        pixel(y + offset.y * radiusY),
        lobeRadius,
      );
    }
  } else {
    const vertical = variant === 2;
    const resistant = definition.shape === "rod";
    const halfWidth = pixel(radiusX * (vertical ? 0.72 : resistant ? 1.22 : 1.08));
    const halfHeight = pixel(radiusY * (vertical ? 1.18 : resistant ? 0.7 : 0.78));
    const corner = Math.max(3, pixel(Math.min(halfWidth, halfHeight) * 0.72));

    graphics.fillStyle(palette.outline, alpha);
    graphics.fillRoundedRect(
      x - halfWidth - 2,
      y - halfHeight - 2,
      halfWidth * 2 + 4,
      halfHeight * 2 + 4,
      corner + 2,
    );
    graphics.fillStyle(palette.body, alpha);
    graphics.fillRoundedRect(
      x - halfWidth,
      y - halfHeight,
      halfWidth * 2,
      halfHeight * 2,
      corner,
    );

    graphics.fillStyle(palette.shadow, alpha * 0.72);
    if (vertical) {
      graphics.fillRect(x - 1, y - halfHeight + 3, 3, halfHeight * 2 - 6);
    } else {
      graphics.fillRect(x - halfWidth + 3, y, halfWidth * 2 - 6, 3);
    }

    graphics.fillStyle(palette.detail, alpha * 0.44);
    if (vertical) {
      graphics.fillRect(x - halfWidth + 2, y - 1, halfWidth * 2 - 4, 2);
    } else {
      graphics.fillRect(x - 1, y - halfHeight + 2, 2, halfHeight * 2 - 4);
    }
  }

  const detailSize = Math.max(2, pixel(Math.min(radiusX, radiusY) * 0.18));
  graphics.fillStyle(palette.highlight, alpha * 0.92);
  graphics.fillRect(
    pixel(x - radiusX * 0.28),
    pixel(y - radiusY * 0.36),
    detailSize + (variant === 3 ? 1 : 0),
    detailSize,
  );
  graphics.fillStyle(palette.detail, alpha * 0.84);
  graphics.fillRect(
    pixel(x + radiusX * 0.25),
    pixel(y + radiusY * 0.18),
    detailSize,
    detailSize,
  );
  graphics.fillStyle(palette.detail, alpha * 0.72);
  graphics.fillRect(pixel(x - radiusX * 0.12), pixel(y + radiusY * 0.24), 2, 2);
  graphics.fillRect(pixel(x + radiusX * 0.38), pixel(y - radiusY * 0.24), 2, 2);

  if (definition.specialBehavior === "toxic") {
    graphics.fillStyle(0xf2ef83, alpha * 0.9);
    graphics.fillCircle(x + radiusX, y - radiusY * 0.48, Math.max(2, detailSize - 1));
    graphics.fillCircle(x - radiusX * 0.82, y + radiusY * 0.55, Math.max(1, detailSize - 1));
  }
}

function drawVirus(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const { palette, alpha, variant, x, y, radiusX, radiusY, phase } = context;
  const spikeCount = 6 + variant;
  const rotation = phase * 0.045 + variant * 0.24;
  const coreRadius = Math.max(3, pixel(Math.min(radiusX, radiusY) * 0.78));

  for (let index = 0; index < spikeCount; index += 1) {
    const angle = rotation + (index / spikeCount) * Math.PI * 2;
    const spread = 0.28;
    const outer = polarPoint(x, y, radiusX * 1.62, radiusY * 1.62, angle);
    const left = polarPoint(x, y, radiusX * 0.68, radiusY * 0.68, angle - spread);
    const right = polarPoint(x, y, radiusX * 0.68, radiusY * 0.68, angle + spread);
    const inner = polarPoint(x, y, radiusX * 1.38, radiusY * 1.38, angle);

    graphics.fillStyle(palette.outline, alpha);
    graphics.fillTriangle(outer.x, outer.y, left.x, left.y, right.x, right.y);
    graphics.fillStyle(index % 2 === 0 ? palette.body : palette.shadow, alpha);
    graphics.fillTriangle(inner.x, inner.y, left.x, left.y, right.x, right.y);
    graphics.fillStyle(palette.highlight, alpha * 0.84);
    graphics.fillRect(outer.x - 1, outer.y - 1, 3, 3);
  }

  graphics.fillStyle(palette.outline, alpha);
  graphics.fillCircle(x, y, coreRadius + 2);
  graphics.fillStyle(palette.body, alpha);
  graphics.fillCircle(x, y, coreRadius);

  const capsid = createPolarPolygon(x, y, 6, coreRadius * 0.68, coreRadius * 0.62, rotation);
  graphics.fillStyle(palette.shadow, alpha * 0.9);
  graphics.fillPoints(capsid, true);
  graphics.fillStyle(palette.highlight, alpha * 0.95);
  graphics.fillRect(x - 2, y - 2, 4, 4);
  graphics.fillStyle(palette.detail, alpha * 0.86);
  graphics.fillRect(x - pixel(coreRadius * 0.34), y + 1, 2, 2);
  graphics.fillRect(x + 1, y - pixel(coreRadius * 0.38), 2, 2);
  if (variant % 2 === 1) {
    graphics.fillStyle(palette.highlight, alpha * 0.92);
    graphics.fillRect(x + pixel(coreRadius * 0.35), y, 2, 2);
  }
}

function drawFungus(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const { definition, palette, alpha, variant, x, y, radiusX, radiusY, phase } = context;
  const sporeLike = definition.shape === "spore";

  if (sporeLike) {
    const width = pixel(radiusX * (variant % 2 === 0 ? 1.05 : 0.88));
    const height = pixel(radiusY * (variant % 2 === 0 ? 1.28 : 1.42));

    graphics.fillStyle(palette.outline, alpha);
    graphics.fillEllipse(x, y, width * 2 + 4, height * 2 + 4);
    graphics.fillStyle(palette.body, alpha);
    graphics.fillEllipse(x, y, width * 2, height * 2);
    graphics.fillStyle(palette.shadow, alpha * 0.82);
    graphics.fillEllipse(x + width * 0.18, y + height * 0.12, width * 0.72, height * 0.82);
    graphics.fillStyle(palette.highlight, alpha * 0.95);
    graphics.fillRect(x - width * 0.35, y - height * 0.48, 3, 4);
    graphics.lineStyle(2, palette.highlight, alpha * 0.5);
    graphics.strokeEllipse(x, y, width * 1.62, height * 1.68);
    graphics.fillStyle(palette.detail, alpha * 0.72);
    graphics.fillRect(x + width * 0.22, y - height * 0.3, 2, 3);
    graphics.fillRect(x - width * 0.2, y + height * 0.32, 3, 2);
  } else {
    const lobeOffsets: readonly Point[] = [
      { x: -0.5, y: 0.05 },
      { x: 0.38, y: 0.18 },
      { x: -0.05, y: -0.43 },
      ...(variant > 1 ? [{ x: 0.5, y: -0.32 }] : []),
    ];
    const lobeRadius = Math.max(3, pixel(Math.min(radiusX, radiusY) * 0.65));

    graphics.lineStyle(Math.max(2, pixel(radiusX * 0.14)), palette.outline, alpha * 0.65);
    graphics.lineBetween(x, y + radiusY * 0.2, x + radiusX * 0.9, y + radiusY * 0.9);
    graphics.lineBetween(x + radiusX * 0.32, y + radiusY * 0.46, x + radiusX * 1.22, y + radiusY * 0.48);
    if (variant % 2 === 0) {
      graphics.lineBetween(x - radiusX * 0.2, y, x - radiusX, y + radiusY * 0.65);
      graphics.lineBetween(x - radiusX * 0.62, y + radiusY * 0.42, x - radiusX * 1.2, y + radiusY * 0.18);
    }
    graphics.fillStyle(palette.outline, alpha);
    for (const offset of lobeOffsets) {
      graphics.fillCircle(x + offset.x * radiusX, y + offset.y * radiusY, lobeRadius + 2);
    }
    graphics.fillStyle(palette.body, alpha);
    for (const offset of lobeOffsets) {
      graphics.fillCircle(x + offset.x * radiusX, y + offset.y * radiusY, lobeRadius);
    }
    graphics.fillStyle(palette.shadow, alpha * 0.8);
    graphics.fillCircle(x + radiusX * 0.08, y + radiusY * 0.05, lobeRadius * 0.42);
    graphics.fillStyle(palette.highlight, alpha * 0.7);
    graphics.fillRect(x - 2, y - pixel(radiusY * 0.48), 3, 3);
  }

  const sporeOrbit = phase + variant * 0.8;
  graphics.fillStyle(palette.highlight, alpha * 0.8);
  for (let index = 0; index < 2 + (variant % 2); index += 1) {
    const angle = sporeOrbit + index * 2.4;
    graphics.fillRect(
      pixel(x + Math.cos(angle) * radiusX * 1.28),
      pixel(y + Math.sin(angle) * radiusY * 1.12),
      2,
      2,
    );
  }
}

function drawParasite(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const { definition, palette, alpha, variant, x, y, radiusX, radiusY, phase } = context;
  const protozoan = definition.shape === "spore";

  if (protozoan) {
    const outer = createOrganicPolygon(x, y, radiusX * 1.05, radiusY, 9, variant);
    const inner = scalePolygon(outer, x, y, 0.82);

    graphics.fillStyle(palette.outline, alpha);
    graphics.fillPoints(outer, true);
    graphics.fillStyle(palette.body, alpha);
    graphics.fillPoints(inner, true);
    graphics.fillStyle(palette.shadow, alpha * 0.88);
    graphics.fillCircle(x + radiusX * 0.12, y + radiusY * 0.08, Math.max(3, radiusX * 0.28));
    graphics.lineStyle(2, palette.highlight, alpha * 0.72);
    graphics.lineBetween(x - radiusX * 0.75, y, x - radiusX * 1.42, y + Math.sin(phase) * 3);
    graphics.lineStyle(1, palette.detail, alpha * 0.64);
    graphics.lineBetween(
      x - radiusX * 0.5,
      y + radiusY * 0.32,
      x - radiusX * 1.18,
      y + radiusY * 0.72 + Math.cos(phase) * 2,
    );
    graphics.fillStyle(palette.highlight, alpha * 0.76);
    graphics.fillRect(x - radiusX * 0.18, y - radiusY * 0.42, 3, 3);
    graphics.fillRect(x + radiusX * 0.44, y + radiusY * 0.25, 2, 2);
  } else {
    const segmentCount = 5 + variant;
    const points: Point[] = [];
    for (let index = 0; index < segmentCount; index += 1) {
      const progress = index / (segmentCount - 1);
      points.push({
        x: pixel(x - radiusX * 1.18 + progress * radiusX * 2.36),
        y: pixel(y + Math.sin(phase * 0.45 + progress * Math.PI * 1.6) * radiusY * 0.42),
      });
    }

    graphics.lineStyle(Math.max(6, pixel(radiusY * 0.92)), palette.outline, alpha);
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineBetween(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
    }
    graphics.lineStyle(Math.max(3, pixel(radiusY * 0.62)), palette.body, alpha);
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineBetween(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
    }
    graphics.fillStyle(palette.shadow, alpha * 0.86);
    for (let index = 1; index < points.length - 1; index += 1) {
      graphics.fillRect(points[index].x - 1, points[index].y - 2, 2, 4);
    }
    graphics.fillStyle(palette.outline, alpha);
    graphics.fillCircle(points.at(-1)?.x ?? x, points.at(-1)?.y ?? y, Math.max(4, radiusY * 0.58));
    graphics.fillStyle(palette.highlight, alpha);
    graphics.fillRect((points.at(-1)?.x ?? x) + 1, (points.at(-1)?.y ?? y) - 2, 2, 2);
  }
}

function drawCancerCell(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const { palette, alpha, variant, x, y, radiusX, radiusY, phase } = context;
  const outer = createOrganicPolygon(
    x,
    y,
    radiusX * (1 + Math.sin(phase) * 0.018),
    radiusY,
    9 + (variant % 2),
    variant + 7,
  );
  const inner = scalePolygon(outer, x, y, 0.84);

  graphics.fillStyle(palette.outline, alpha);
  graphics.fillPoints(outer, true);
  graphics.fillStyle(palette.body, alpha);
  graphics.fillPoints(inner, true);

  const nucleusX = pixel(x + radiusX * (-0.16 + variant * 0.1));
  const nucleusY = pixel(y + radiusY * (variant % 2 === 0 ? 0.12 : -0.16));
  graphics.fillStyle(palette.shadow, alpha * 0.94);
  graphics.fillEllipse(nucleusX, nucleusY, radiusX * 0.92, radiusY * 0.72);
  graphics.fillStyle(palette.detail, alpha * 0.9);
  graphics.fillCircle(nucleusX + 2, nucleusY - 1, Math.max(2, radiusX * 0.13));
  graphics.fillStyle(palette.highlight, alpha * 0.8);
  graphics.fillRect(x - radiusX * 0.62, y - radiusY * 0.42, 3, 3);
  if (variant > 1) {
    graphics.fillRect(x + radiusX * 0.48, y + radiusY * 0.34, 2, 2);
  }
  graphics.fillStyle(palette.detail, alpha * 0.72);
  graphics.fillRect(nucleusX - 3, nucleusY + 2, 2, 2);
  graphics.fillRect(nucleusX + 3, nucleusY - 3, 2, 2);

  for (let index = 0; index < 3; index += 1) {
    const angle = phase * 0.12 + variant + (index / 3) * Math.PI * 2;
    const receptor = polarPoint(x, y, radiusX * 1.04, radiusY * 1.04, angle);
    graphics.fillStyle(palette.highlight, alpha * 0.68);
    graphics.fillRect(receptor.x - 1, receptor.y - 1, 3, 3);
  }
}

function drawCollective(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const { palette, alpha, variant, x, y, radiusX, radiusY, phase } = context;
  const matrixPulse = 1 + Math.sin(phase * 0.55) * 0.025;

  graphics.fillStyle(palette.shadow, alpha * 0.24);
  graphics.fillEllipse(x, y + 2, radiusX * 2.72 * matrixPulse, radiusY * 2.12 * matrixPulse);
  graphics.lineStyle(2, palette.outline, alpha * 0.5);
  graphics.strokeEllipse(x, y + 2, radiusX * 2.66, radiusY * 2.06);
  graphics.fillStyle(palette.detail, alpha * 0.36);
  for (let index = 0; index < 4; index += 1) {
    const angle = phase * 0.08 + index * 1.7 + variant;
    graphics.fillRect(
      pixel(x + Math.cos(angle) * radiusX * 0.94),
      pixel(y + Math.sin(angle) * radiusY * 0.72),
      2,
      2,
    );
  }

  const cells: readonly Point[] = [
    { x: -0.54, y: 0.05 },
    { x: 0.38, y: 0.22 },
    { x: -0.12, y: -0.46 },
    { x: 0.55, y: -0.38 },
    ...(variant > 0 ? [{ x: -0.42, y: 0.48 }] : []),
  ];
  const cellRadius = Math.max(3, pixel(Math.min(radiusX, radiusY) * 0.52));

  graphics.lineStyle(2, palette.highlight, alpha * 0.4);
  for (let index = 1; index < cells.length; index += 1) {
    graphics.lineBetween(
      x + cells[index - 1].x * radiusX,
      y + cells[index - 1].y * radiusY,
      x + cells[index].x * radiusX,
      y + cells[index].y * radiusY,
    );
  }
  for (const [index, cell] of cells.entries()) {
    const cellX = pixel(x + cell.x * radiusX);
    const cellY = pixel(y + cell.y * radiusY);
    graphics.fillStyle(palette.outline, alpha);
    graphics.fillCircle(cellX, cellY, cellRadius + 2);
    graphics.fillStyle(index % 2 === variant % 2 ? palette.body : palette.highlight, alpha * 0.92);
    graphics.fillCircle(cellX, cellY, cellRadius);
    graphics.fillStyle(palette.detail, alpha * 0.66);
    graphics.fillRect(cellX - 1, cellY - 1, 2, 2);
  }
}

function drawAttackAnimation(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const radius = Math.max(context.radiusX, context.radiusY);
  const pulse = context.attackPulse;
  const accentAlpha = context.alpha * pulse;

  switch (context.animations.attack) {
    case "contactBurst": {
      graphics.lineStyle(2, context.palette.highlight, accentAlpha * 0.78);
      for (const spread of [-0.28, 0, 0.28]) {
        const root = orientedPoint(
          context.x,
          context.y,
          radius * 0.58,
          context.facingAngle + spread * 0.35,
        );
        const tip = orientedPoint(
          context.x,
          context.y,
          radius * (1.08 + pulse * 0.72),
          context.facingAngle + spread,
        );
        graphics.lineBetween(root.x, root.y, tip.x, tip.y);
        graphics.fillStyle(context.palette.highlight, accentAlpha * 0.9);
        graphics.fillRect(tip.x - 1, tip.y - 1, 3, 3);
      }
      if (context.definition.specialBehavior === "toxic") {
        const toxin = orientedPoint(
          context.x,
          context.y,
          radius * (1.5 + pulse * 0.42),
          context.facingAngle,
        );
        graphics.fillStyle(0xf2ef83, accentAlpha * 0.92);
        graphics.fillRect(toxin.x - 2, toxin.y - 2, 4, 4);
      }
      return;
    }
    case "viralEntry": {
      const entryTip = orientedPoint(
        context.x,
        context.y,
        radius * (1.35 + pulse * 0.52),
        context.facingAngle,
      );
      graphics.lineStyle(2, context.palette.highlight, accentAlpha * 0.8);
      graphics.lineBetween(context.x, context.y, entryTip.x, entryTip.y);
      graphics.fillStyle(context.palette.highlight, accentAlpha);
      graphics.fillRect(entryTip.x - 2, entryTip.y - 2, 4, 4);
      return;
    }
    case "sporeVolley": {
      graphics.fillStyle(context.palette.highlight, accentAlpha * 0.92);
      for (const [index, spread] of [-0.42, -0.14, 0.14, 0.42].entries()) {
        const spore = orientedPoint(
          context.x,
          context.y,
          radius * (1.05 + pulse * (0.72 + index * 0.13)),
          context.facingAngle + spread,
        );
        const size = index % 2 === 0 ? 3 : 2;
        graphics.fillRect(spore.x - 1, spore.y - 1, size, size);
      }
      graphics.lineStyle(2, context.palette.shadow, accentAlpha * 0.48);
      graphics.strokeEllipse(
        context.x,
        context.y,
        radius * (2.1 + pulse * 0.34),
        radius * (1.25 + pulse * 0.2),
      );
      return;
    }
    case "tendrilStrike": {
      const root = orientedPoint(context.x, context.y, radius * 0.58, context.facingAngle);
      const bend = orientedPoint(
        context.x,
        context.y,
        radius * (1 + pulse * 0.62),
        context.facingAngle - 0.32 * (1 - pulse),
      );
      const tip = orientedPoint(
        context.x,
        context.y,
        radius * (1.42 + pulse * 0.82),
        context.facingAngle + 0.12,
      );
      graphics.lineStyle(3, context.palette.outline, accentAlpha * 0.84);
      graphics.lineBetween(root.x, root.y, bend.x, bend.y);
      graphics.lineBetween(bend.x, bend.y, tip.x, tip.y);
      graphics.fillStyle(context.palette.highlight, accentAlpha);
      graphics.fillTriangle(
        tip.x,
        tip.y,
        tip.x - Math.cos(context.facingAngle - 0.6) * 5,
        tip.y - Math.sin(context.facingAngle - 0.6) * 5,
        tip.x - Math.cos(context.facingAngle + 0.6) * 5,
        tip.y - Math.sin(context.facingAngle + 0.6) * 5,
      );
      return;
    }
    case "mutantPulse": {
      graphics.lineStyle(2, context.palette.highlight, accentAlpha * 0.68);
      graphics.strokeEllipse(
        context.x,
        context.y,
        radius * (2.25 + pulse * 0.82),
        radius * (1.65 + pulse * 0.36),
      );
      for (const spread of [-0.48, 0.08, 0.6]) {
        const bud = orientedPoint(
          context.x,
          context.y,
          radius * (1.02 + pulse * 0.46),
          context.facingAngle + spread,
        );
        graphics.fillStyle(context.palette.body, accentAlpha * 0.9);
        graphics.fillRect(bud.x - 2, bud.y - 2, 4, 4);
      }
      return;
    }
    case "colonyWave": {
      graphics.lineStyle(3, context.palette.highlight, accentAlpha * 0.48);
      graphics.strokeEllipse(
        context.x,
        context.y + 2,
        radius * (2.55 + pulse * 1.25),
        radius * (1.72 + pulse * 0.72),
      );
      graphics.fillStyle(context.palette.highlight, accentAlpha * 0.78);
      for (let index = 0; index < 4; index += 1) {
        const bud = orientedPoint(
          context.x,
          context.y,
          radius * (1.08 + pulse * (0.25 + index * 0.1)),
          context.facingAngle - 0.55 + index * 0.34,
        );
        graphics.fillRect(bud.x - 1, bud.y - 1, 3, 3);
      }
    }
  }
}

function drawDeathAnimation(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
  progress: number,
): void {
  const seed = stableHash(context.identity);
  const radius = Math.max(context.radiusX, context.radiusY);
  const deathAlpha = context.alpha * (1 - progress * 0.38);

  switch (context.animations.death) {
    case "membraneRupture":
      drawRadialFragments(graphics, context, seed, radius, progress, 6, deathAlpha);
      graphics.lineStyle(2, context.palette.shadow, deathAlpha * 0.6);
      graphics.strokeEllipse(
        context.x,
        context.y,
        radius * (1.55 + progress * 0.6),
        radius * (0.88 + progress * 0.24),
      );
      return;
    case "capsidFracture":
      graphics.lineStyle(2, context.palette.highlight, deathAlpha * 0.78);
      for (let index = 0; index < 7; index += 1) {
        const angle = (((seed + index * 53) % 360) * Math.PI) / 180;
        const inner = polarPoint(
          context.x,
          context.y,
          radius * (0.5 + progress * 0.35),
          radius * (0.5 + progress * 0.35),
          angle,
        );
        const outer = polarPoint(
          context.x,
          context.y,
          radius * (0.88 + progress * 1.25),
          radius * (0.88 + progress * 1.25),
          angle + (index % 2 === 0 ? 0.12 : -0.12),
        );
        graphics.lineBetween(inner.x, inner.y, outer.x, outer.y);
        graphics.fillStyle(context.palette.body, deathAlpha);
        graphics.fillRect(outer.x - 1, outer.y - 1, 3, 3);
      }
      return;
    case "sporeDissolve":
      graphics.fillStyle(context.palette.highlight, deathAlpha * 0.88);
      for (let index = 0; index < 7; index += 1) {
        const side = ((seed + index * 41) % 11) / 10 - 0.5;
        const drift = Math.sin(progress * 4 + index) * radius * 0.2;
        graphics.fillRect(
          pixel(context.x + side * radius * 2.1 + drift),
          pixel(context.y - progress * radius * (0.8 + index * 0.16)),
          index % 3 === 0 ? 3 : 2,
          index % 3 === 0 ? 3 : 2,
        );
      }
      return;
    case "segmentBreak":
      graphics.fillStyle(context.palette.body, deathAlpha);
      for (let index = 0; index < 6; index += 1) {
        const horizontal = (index - 2.5) * radius * 0.36;
        const vertical = Math.sin(index * 1.8) * progress * radius * 0.76;
        graphics.fillRect(
          pixel(context.x + horizontal * (1 + progress)),
          pixel(context.y + vertical),
          4,
          3,
        );
      }
      return;
    case "nuclearCollapse":
      graphics.fillStyle(context.palette.detail, deathAlpha * 0.88);
      graphics.fillCircle(
        context.x,
        context.y,
        Math.max(2, radius * (0.52 - progress * 0.32)),
      );
      drawRadialFragments(graphics, context, seed, radius, progress, 5, deathAlpha * 0.8);
      return;
    case "colonyDisperse":
      graphics.fillStyle(context.palette.body, deathAlpha * 0.84);
      for (let index = 0; index < 6; index += 1) {
        const angle = (((seed + index * 67) % 360) * Math.PI) / 180;
        const distance = radius * (0.35 + progress * (0.74 + index * 0.11));
        graphics.fillCircle(
          pixel(context.x + Math.cos(angle) * distance),
          pixel(context.y + Math.sin(angle) * distance * 0.72),
          Math.max(2, 4 - progress * 2),
        );
      }
  }
}

function drawInfectionCollapse(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
  progress: number,
): void {
  const radius = Math.max(context.radiusX, context.radiusY);
  const target = context.exitTarget;

  graphics.lineStyle(2, context.palette.highlight, context.alpha * (1 - progress) * 0.72);
  graphics.strokeCircle(context.x, context.y, radius * (1.08 + progress * 0.64));

  if (!target) {
    return;
  }

  const targetX = pixel(target.x);
  const targetY = pixel(target.y);
  graphics.lineStyle(2, context.palette.highlight, context.alpha * (1 - progress) * 0.38);
  graphics.lineBetween(context.originX, context.originY, targetX, targetY);
  graphics.lineStyle(2, context.palette.outline, context.alpha * (0.3 + progress * 0.42));
  graphics.strokeEllipse(
    targetX,
    targetY,
    radius * (1.4 - progress * 0.42),
    radius * (1.02 - progress * 0.2),
  );

  graphics.fillStyle(context.palette.highlight, context.alpha * (1 - progress) * 0.75);
  for (let index = 1; index < 4; index += 1) {
    const trailProgress = Math.min(1, progress + index * 0.13);
    graphics.fillRect(
      pixel(Phaser.Math.Linear(context.originX, targetX, trailProgress)) - 1,
      pixel(Phaser.Math.Linear(context.originY, targetY, trailProgress)) - 1,
      2,
      2,
    );
  }
}

function drawRadialFragments(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
  seed: number,
  radius: number,
  progress: number,
  count: number,
  alpha: number,
): void {
  for (let index = 0; index < count; index += 1) {
    const angle = (((seed + index * 83) % 360) * Math.PI) / 180;
    const distance = radius * (0.55 + progress * (0.8 + index * 0.1));
    const size = index % 2 === 0 ? 3 : 2;
    graphics.fillStyle(
      index % 2 === 0 ? context.palette.highlight : context.palette.body,
      alpha,
    );
    graphics.fillRect(
      pixel(context.x + Math.cos(angle) * distance),
      pixel(context.y + Math.sin(angle) * distance),
      size,
      size,
    );
  }
}

function createPalette(definition: PathogenDefinition): PathogenPalette {
  return {
    outline: definition.outlineColor,
    shadow: mixColor(definition.color, definition.outlineColor, 0.42),
    body: definition.color,
    highlight: mixColor(definition.color, 0xffffff, 0.36),
    detail: mixColor(definition.outlineColor, 0x071217, 0.34),
  };
}

function createOrganicPolygon(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  pointCount: number,
  variant: number,
): Point[] {
  const points: Point[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const angle = (index / pointCount) * Math.PI * 2 - Math.PI / 2;
    const irregularity = 0.82 + (((index * 37 + variant * 29) % 31) / 100);
    points.push(polarPoint(x, y, radiusX * irregularity, radiusY * irregularity, angle));
  }
  return points;
}

function createPolarPolygon(
  x: number,
  y: number,
  pointCount: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
): Point[] {
  return Array.from({ length: pointCount }, (_, index) =>
    polarPoint(
      x,
      y,
      radiusX,
      radiusY,
      rotation + (index / pointCount) * Math.PI * 2,
    ),
  );
}

function scalePolygon(points: readonly Point[], x: number, y: number, scale: number): Point[] {
  return points.map((point) => ({
    x: pixel(x + (point.x - x) * scale),
    y: pixel(y + (point.y - y) * scale),
  }));
}

function polarPoint(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  angle: number,
): Point {
  return {
    x: pixel(x + Math.cos(angle) * radiusX),
    y: pixel(y + Math.sin(angle) * radiusY),
  };
}

function orientedPoint(
  x: number,
  y: number,
  distance: number,
  angle: number,
): Point {
  return {
    x: pixel(x + Math.cos(angle) * distance),
    y: pixel(y + Math.sin(angle) * distance),
  };
}

function getExitScale(mode: PathogenExitMode | undefined, progress: number): number {
  if (mode === "infection") {
    return 1 - progress * 0.78;
  }
  if (mode === "death") {
    return 1 - progress * 0.38;
  }
  return 1;
}

function getExitAlpha(mode: PathogenExitMode | undefined, progress: number): number {
  if (!mode) {
    return 1;
  }
  return (1 - progress) * (1 - progress * 0.35);
}

function mixColor(first: number, second: number, ratio: number): number {
  const clamped = Phaser.Math.Clamp(ratio, 0, 1);
  const firstRed = (first >> 16) & 0xff;
  const firstGreen = (first >> 8) & 0xff;
  const firstBlue = first & 0xff;
  const secondRed = (second >> 16) & 0xff;
  const secondGreen = (second >> 8) & 0xff;
  const secondBlue = second & 0xff;

  return (
    (pixel(firstRed + (secondRed - firstRed) * clamped) << 16) |
    (pixel(firstGreen + (secondGreen - firstGreen) * clamped) << 8) |
    pixel(firstBlue + (secondBlue - firstBlue) * clamped)
  );
}

function pixel(value: number): number {
  return Math.round(value);
}
