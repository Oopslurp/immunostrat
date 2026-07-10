import Phaser from "phaser";
import type {
  MapPoint,
  TacticalMapDefinition,
  VesselPathDefinition,
} from "../data/tacticalMaps";
import {
  createPixelVesselPath,
  createVesselHighlightPath,
  deterministicVesselValue,
  getProceduralVesselStyle,
  VESSEL_PIXEL_SCALE,
  type ProceduralVesselLayerStyle,
} from "./proceduralVesselStyle";

export const VESSEL_LAYER_DEPTH = -85;

export function createVesselLayer(
  scene: Phaser.Scene,
  tacticalMap: TacticalMapDefinition,
): Phaser.GameObjects.RenderTexture | undefined {
  const vessels = tacticalMap.vesselPaths.filter((vessel) => vessel.points.length >= 2);

  if (vessels.length === 0) {
    return undefined;
  }

  const rasterWidth = Math.ceil(tacticalMap.worldWidth / VESSEL_PIXEL_SCALE);
  const rasterHeight = Math.ceil(tacticalMap.worldHeight / VESSEL_PIXEL_SCALE);
  const sourceGraphics = scene.make.graphics({}, false);
  const styledVessels = vessels.map((vessel, index) => {
    const style = getProceduralVesselStyle(vessel.width, index);

    return {
      vessel,
      style,
      pixelPath: createPixelVesselPath(
        vessel.points,
        vessel.id,
        VESSEL_PIXEL_SCALE,
        style.jitterAmount,
      ),
    };
  });

  drawLayerPass(sourceGraphics, styledVessels, "shadow");
  drawLayerPass(sourceGraphics, styledVessels, "body");

  for (const styledVessel of styledVessels) {
    drawOrganicEdgePixels(sourceGraphics, styledVessel);
  }

  drawLayerPass(sourceGraphics, styledVessels, "inner");

  for (const styledVessel of styledVessels) {
    const highlightPath = createVesselHighlightPath(
      styledVessel.pixelPath,
      Math.max(1, Math.round(styledVessel.style.highlightOffset / VESSEL_PIXEL_SCALE)),
    );

    drawPixelPath(
      sourceGraphics,
      highlightPath,
      toRasterStyle(styledVessel.style.highlight),
      false,
    );
    drawInternalDetails(sourceGraphics, styledVessel);
  }

  const renderTexture = scene.add
    .renderTexture(0, 0, rasterWidth, rasterHeight)
    .setOrigin(0)
    .setScale(VESSEL_PIXEL_SCALE)
    .setDepth(VESSEL_LAYER_DEPTH);

  renderTexture.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  renderTexture.draw(sourceGraphics);
  sourceGraphics.destroy();

  return renderTexture;
}

type StyledVessel = {
  vessel: VesselPathDefinition;
  style: ReturnType<typeof getProceduralVesselStyle>;
  pixelPath: MapPoint[];
};

function drawLayerPass(
  graphics: Phaser.GameObjects.Graphics,
  vessels: StyledVessel[],
  layer: "shadow" | "body" | "inner",
): void {
  for (const styledVessel of vessels) {
    drawPixelPath(
      graphics,
      styledVessel.pixelPath,
      toRasterStyle(styledVessel.style[layer]),
    );
  }
}

function drawPixelPath(
  graphics: Phaser.GameObjects.Graphics,
  points: MapPoint[],
  style: ProceduralVesselLayerStyle,
  drawJointBlobs = true,
): void {
  if (points.length < 2 || style.width <= 0) {
    return;
  }

  graphics.lineStyle(style.width, style.color, style.alpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);

  for (const point of points.slice(1)) {
    graphics.lineTo(point.x, point.y);
  }

  graphics.strokePath();

  if (!drawJointBlobs) {
    return;
  }

  graphics.fillStyle(style.color, style.alpha);
  const jointRadius = style.width / 2;

  for (const point of points) {
    graphics.fillCircle(point.x, point.y, jointRadius);
  }
}

function drawOrganicEdgePixels(
  graphics: Phaser.GameObjects.Graphics,
  styledVessel: StyledVessel,
): void {
  const { pixelPath, style, vessel } = styledVessel;
  const bodyWidth = toRasterWidth(style.body.width);
  const edgeDistance = Math.max(1, Math.floor(bodyWidth * 0.42));

  graphics.fillStyle(style.detailDark.color, style.detailDark.alpha * 0.62);

  for (let index = 2; index < pixelPath.length - 2; index += 3) {
    const previous = pixelPath[index - 1];
    const point = pixelPath[index];
    const next = pixelPath[index + 1];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.hypot(tangentX, tangentY) || 1;
    const side = deterministicVesselValue(vessel.id, index, 91) > 0.5 ? 1 : -1;
    const x = Math.round(point.x - (tangentY / length) * edgeDistance * side);
    const y = Math.round(point.y + (tangentX / length) * edgeDistance * side);

    graphics.fillRect(x, y, 1, 1);
  }
}

function drawInternalDetails(
  graphics: Phaser.GameObjects.Graphics,
  styledVessel: StyledVessel,
): void {
  const { pixelPath, style, vessel } = styledVessel;
  const bodyWidth = toRasterWidth(style.body.width);
  const detailRadius = Math.max(1, toRasterWidth(style.detailDark.width) / 2);

  for (let index = 3; index < pixelPath.length - 3; index += 4) {
    if (deterministicVesselValue(vessel.id, index, 17) < 0.28) {
      continue;
    }

    const previous = pixelPath[index - 1];
    const point = pixelPath[index];
    const next = pixelPath[index + 1];
    const tangentX = next.x - previous.x;
    const tangentY = next.y - previous.y;
    const length = Math.hypot(tangentX, tangentY) || 1;
    const offsetNoise = deterministicVesselValue(vessel.id, index, 43) * 2 - 1;
    const offset = offsetNoise * Math.max(0.5, bodyWidth * 0.2);
    const x = Math.round(point.x - (tangentY / length) * offset);
    const y = Math.round(point.y + (tangentX / length) * offset);

    graphics.fillStyle(style.detailDark.color, style.detailDark.alpha);
    graphics.fillCircle(x, y, detailRadius);
    graphics.fillStyle(style.detailLight.color, style.detailLight.alpha);
    graphics.fillRect(x, y, 1, 1);
  }
}

function toRasterStyle(
  style: ProceduralVesselLayerStyle,
): ProceduralVesselLayerStyle {
  return {
    ...style,
    width: toRasterWidth(style.width),
  };
}

function toRasterWidth(width: number): number {
  return Math.max(1, Math.round(width / VESSEL_PIXEL_SCALE));
}
