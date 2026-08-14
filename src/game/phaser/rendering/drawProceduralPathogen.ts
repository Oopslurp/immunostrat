import Phaser from "phaser";
import {
  pathogenDefinitions,
  type PathogenDefinition,
  type PathogenTypeId,
} from "../../data/pathogens";
import { stableHash } from "../../types/shared";
import {
  getPathogenVisualVariant,
  resolvePathogenVisualFamily,
  resolvePathogenVisualPose,
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
  exitMode?: PathogenExitMode;
  exitProgress?: number;
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
  pathogenTypeId: PathogenTypeId;
  identity: string;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  alpha: number;
  phase: number;
  attackPulse: number;
  variant: number;
  palette: PathogenPalette;
}>;

export function drawProceduralPathogen(
  graphics: Phaser.GameObjects.Graphics,
  input: ProceduralPathogenRenderInput,
): void {
  const definition = pathogenDefinitions[input.pathogenTypeId];
  const pose = resolvePathogenVisualPose(input);
  const exitProgress = Phaser.Math.Clamp(input.exitProgress ?? 0, 0, 1);
  const exitScale = getExitScale(input.exitMode, exitProgress);
  const alpha =
    Phaser.Math.Clamp(input.alpha ?? 1, 0, 1) *
    getExitAlpha(input.exitMode, exitProgress);

  if (alpha <= 0.01 || exitScale <= 0.05) {
    return;
  }

  const scale = (input.scale ?? 1) * exitScale;
  const context: DrawContext = {
    definition,
    pathogenTypeId: input.pathogenTypeId,
    identity: input.identity,
    x: pixel(input.x),
    y: pixel(input.y + pose.bobY + (input.exitMode === "death" ? exitProgress * 3 : 0)),
    radiusX: Math.max(3, pixel(input.radius * scale * pose.scaleX)),
    radiusY: Math.max(3, pixel(input.radius * scale * pose.scaleY)),
    alpha,
    phase: pose.phase,
    attackPulse: pose.attackPulse,
    variant: getPathogenVisualVariant(input.identity, input.pathogenTypeId),
    palette: createPalette(definition),
  };

  drawFamily(
    graphics,
    resolvePathogenVisualFamily(input.pathogenTypeId, definition),
    context,
  );

  if (input.exitMode === "death") {
    drawDeathFragments(graphics, context, exitProgress);
  } else if (input.exitMode === "infection") {
    drawInfectionCollapse(graphics, context, exitProgress);
  } else if (pose.attackPulse > 0.08) {
    drawAttackAccent(graphics, context);
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
  const { definition, palette, alpha, variant, x, y, radiusX, radiusY } = context;

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
  if (variant % 2 === 1) {
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
    if (variant % 2 === 0) {
      graphics.lineBetween(x - radiusX * 0.2, y, x - radiusX, y + radiusY * 0.65);
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

function drawAttackAccent(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
): void {
  const radius = Math.max(context.radiusX, context.radiusY);

  graphics.lineStyle(2, context.palette.highlight, context.alpha * context.attackPulse * 0.55);
  graphics.strokeCircle(context.x, context.y, radius * (1.18 + context.attackPulse * 0.28));
  graphics.fillStyle(context.palette.highlight, context.alpha * context.attackPulse * 0.72);
  graphics.fillRect(context.x + radius + 2, context.y - 1, 3, 3);
}

function drawDeathFragments(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
  progress: number,
): void {
  const seed = stableHash(context.identity);
  const radius = Math.max(context.radiusX, context.radiusY);

  graphics.fillStyle(context.palette.highlight, context.alpha * (1 - progress));
  for (let index = 0; index < 4; index += 1) {
    const angle = (((seed + index * 83) % 360) * Math.PI) / 180;
    const distance = radius * (0.55 + progress * (0.8 + index * 0.12));
    const size = index % 2 === 0 ? 3 : 2;
    graphics.fillRect(
      pixel(context.x + Math.cos(angle) * distance),
      pixel(context.y + Math.sin(angle) * distance),
      size,
      size,
    );
  }
}

function drawInfectionCollapse(
  graphics: Phaser.GameObjects.Graphics,
  context: DrawContext,
  progress: number,
): void {
  const radius = Math.max(context.radiusX, context.radiusY);

  graphics.lineStyle(2, context.palette.highlight, context.alpha * (1 - progress) * 0.75);
  graphics.strokeCircle(context.x, context.y, radius * (1.2 + progress * 1.3));
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
