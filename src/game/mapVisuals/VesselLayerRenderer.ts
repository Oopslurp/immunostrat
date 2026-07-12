import Phaser from "phaser";
import type {
  MapPoint,
  TacticalMapDefinition,
  VesselPathDefinition,
} from "../data/tacticalMaps";
import {
  createPixelVesselPath,
  createPixelVesselBranches,
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
  }).map((styledVessel) => ({
    ...styledVessel,
    branches: createPixelVesselBranches(
      styledVessel.pixelPath,
      styledVessel.vessel.id,
      toRasterWidth(styledVessel.style.body.width),
    ),
  }));

  drawBranchLayerPass(sourceGraphics, styledVessels, "shadow");
  drawLayerPass(sourceGraphics, styledVessels, "shadow");
  drawBranchLayerPass(sourceGraphics, styledVessels, "body");
  drawLayerPass(sourceGraphics, styledVessels, "body");

  for (const styledVessel of styledVessels) {
    drawOrganicEdgePixels(sourceGraphics, styledVessel);
    drawOrganicJunctionBodies(sourceGraphics, styledVessel);
  }

  drawBranchLayerPass(sourceGraphics, styledVessels, "inner");
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
    drawOrganicJunctionCores(sourceGraphics, styledVessel);
    drawBranchHighlights(sourceGraphics, styledVessel);
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
  branches: ReturnType<typeof createPixelVesselBranches>;
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

function drawBranchLayerPass(
  graphics: Phaser.GameObjects.Graphics,
  vessels: StyledVessel[],
  layer: "shadow" | "body" | "inner",
): void {
  for (const styledVessel of vessels) {
    const mainStyle = toRasterStyle(styledVessel.style[layer]);
    const branchStyle = {
      ...mainStyle,
      width:
        layer === "shadow"
          ? Math.max(2, Math.round(mainStyle.width * 0.58))
          : Math.max(1, Math.round(mainStyle.width * 0.46)),
      alpha: mainStyle.alpha * 0.58,
    };

    for (const branch of styledVessel.branches) {
      const proximalPoints = branch.points.slice(0, 3);
      const distalPoints = branch.points.slice(2);

      drawPixelPath(graphics, proximalPoints, branchStyle);
      drawPixelPath(graphics, distalPoints, {
        ...branchStyle,
        width: Math.max(1, branchStyle.width - 1),
        alpha: branchStyle.alpha * 0.88,
      });
    }
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

function drawOrganicJunctionBodies(
  graphics: Phaser.GameObjects.Graphics,
  styledVessel: StyledVessel,
): void {
  const { vessel, style } = styledVessel;
  const bodyStyle = toRasterStyle(style.body);
  const controlPoints = vessel.points.slice(1, -1);

  graphics.fillStyle(bodyStyle.color, bodyStyle.alpha * 0.72);

  for (let index = 0; index < controlPoints.length; index += 1) {
    const point = controlPoints[index];
    const pixelPoint = {
      x: Math.round(point.x / VESSEL_PIXEL_SCALE),
      y: Math.round(point.y / VESSEL_PIXEL_SCALE),
    };
    const radiusVariation =
      deterministicVesselValue(vessel.id, index, 307) > 0.62 ? 0.5 : 0;

    graphics.fillCircle(
      pixelPoint.x,
      pixelPoint.y,
      bodyStyle.width / 2 + radiusVariation,
    );
  }
}

function drawOrganicJunctionCores(
  graphics: Phaser.GameObjects.Graphics,
  styledVessel: StyledVessel,
): void {
  const { vessel, style } = styledVessel;
  const innerStyle = toRasterStyle(style.inner);

  graphics.fillStyle(innerStyle.color, innerStyle.alpha * 0.62);

  for (const point of vessel.points.slice(1, -1)) {
    graphics.fillCircle(
      Math.round(point.x / VESSEL_PIXEL_SCALE),
      Math.round(point.y / VESSEL_PIXEL_SCALE),
      Math.max(1, innerStyle.width / 2),
    );
  }
}

function drawBranchHighlights(
  graphics: Phaser.GameObjects.Graphics,
  styledVessel: StyledVessel,
): void {
  const highlightStyle = toRasterStyle(styledVessel.style.highlight);
  const branchHighlight = {
    ...highlightStyle,
    width: 1,
    alpha: highlightStyle.alpha * 0.38,
  };

  for (const branch of styledVessel.branches) {
    const highlightPath = createVesselHighlightPath(branch.points.slice(0, 3), 1);
    drawPixelPath(graphics, highlightPath, branchHighlight, false);
  }
}

function drawInternalDetails(
  graphics: Phaser.GameObjects.Graphics,
  styledVessel: StyledVessel,
): void {
  const { pixelPath, style, vessel } = styledVessel;
  const bodyWidth = toRasterWidth(style.body.width);
  const detailRadius = Math.max(1, toRasterWidth(style.detailDark.width) / 2);

  for (let index = 3; index < pixelPath.length - 3; index += 5) {
    if (deterministicVesselValue(vessel.id, index, 17) < 0.34) {
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

    if (deterministicVesselValue(vessel.id, index, 53) > 0.82) {
      graphics.fillStyle(style.detailDark.color, style.detailDark.alpha * 0.5);
      graphics.fillRect(
        Math.round(x + tangentX / length),
        Math.round(y + tangentY / length),
        1,
        1,
      );
    }
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
