import Phaser from "phaser";
import type { MapPoint, TacticalMapDefinition } from "../data/tacticalMaps";
import {
  createLymphVisualRoutes,
  createPixelLymphPath,
  deterministicLymphValue,
  getProceduralLymphStyle,
  LYMPH_PIXEL_SCALE,
  type ProceduralLymphLayerStyle,
} from "./proceduralLymphStyle";

export const LYMPH_LAYER_DEPTH = -78;

export function createLymphLayer(
  scene: Phaser.Scene,
  tacticalMap: TacticalMapDefinition,
): Phaser.GameObjects.RenderTexture | undefined {
  const routes = createLymphVisualRoutes(tacticalMap);

  if (routes.length === 0) {
    return undefined;
  }

  const rasterWidth = Math.ceil(tacticalMap.worldWidth / LYMPH_PIXEL_SCALE);
  const rasterHeight = Math.ceil(tacticalMap.worldHeight / LYMPH_PIXEL_SCALE);
  const graphics = scene.make.graphics({}, false);
  const style = getProceduralLymphStyle();
  const styledRoutes = routes.map((route) => ({
    route,
    path: createPixelLymphPath(route.path, route.id),
    bridge: createPixelLymphPath(
      route.offMapBridge,
      `${route.id}-off-map`,
    ),
  }));

  for (const route of styledRoutes) {
    drawPath(graphics, route.path, toRasterStyle(style.glow));
  }

  for (const route of styledRoutes) {
    drawPath(graphics, route.path, toRasterStyle(style.shadow));
  }

  for (const route of styledRoutes) {
    drawPath(graphics, route.path, toRasterStyle(style.body));
    drawPath(graphics, route.path, toRasterStyle(style.inner));
    drawOffsetHighlight(graphics, route.path, style.highlight);
    drawCellularDetails(graphics, route.path, route.route.id, style);
    drawFadingBridge(graphics, route.bridge, style);
  }

  const renderTexture = scene.add
    .renderTexture(0, 0, rasterWidth, rasterHeight)
    .setOrigin(0)
    .setScale(LYMPH_PIXEL_SCALE)
    .setDepth(LYMPH_LAYER_DEPTH);

  renderTexture.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  renderTexture.draw(graphics);
  graphics.destroy();

  return renderTexture;
}

function drawPath(
  graphics: Phaser.GameObjects.Graphics,
  points: MapPoint[],
  style: ProceduralLymphLayerStyle,
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
  graphics.fillStyle(style.color, style.alpha);

  for (const point of points) {
    graphics.fillCircle(point.x, point.y, style.width / 2);
  }
}

function drawOffsetHighlight(
  graphics: Phaser.GameObjects.Graphics,
  points: MapPoint[],
  style: ProceduralLymphLayerStyle,
): void {
  const rasterStyle = toRasterStyle(style);
  const highlighted = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)] ?? point;
    const next = points[Math.min(points.length - 1, index + 1)] ?? point;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;

    return {
      x: Math.round(point.x - dy / length),
      y: Math.round(point.y + dx / length),
    };
  });

  drawPath(graphics, highlighted, rasterStyle);
}

function drawCellularDetails(
  graphics: Phaser.GameObjects.Graphics,
  points: MapPoint[],
  routeId: string,
  style: ReturnType<typeof getProceduralLymphStyle>,
): void {
  const noduleStyle = toRasterStyle(style.nodule);
  const cellStyle = toRasterStyle(style.cellDetail);

  for (let index = 3; index < points.length - 2; index += 5) {
    const previous = points[index - 1];
    const point = points[index];
    const next = points[index + 1];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const side = deterministicLymphValue(routeId, index, 101) > 0.5 ? 1 : -1;
    const offset = 1.5 + deterministicLymphValue(routeId, index, 103);
    const x = Math.round(point.x - (dy / length) * offset * side);
    const y = Math.round(point.y + (dx / length) * offset * side);

    graphics.fillStyle(noduleStyle.color, noduleStyle.alpha);
    graphics.fillCircle(x, y, Math.max(1, noduleStyle.width / 2));

    if (deterministicLymphValue(routeId, index, 107) > 0.46) {
      graphics.fillStyle(cellStyle.color, cellStyle.alpha);
      graphics.fillRect(point.x, point.y, 1, 1);
    }
  }
}

function drawFadingBridge(
  graphics: Phaser.GameObjects.Graphics,
  points: MapPoint[],
  style: ReturnType<typeof getProceduralLymphStyle>,
): void {
  if (points.length < 2) {
    return;
  }

  const body = toRasterStyle(style.body);
  const inner = toRasterStyle(style.inner);
  const glow = toRasterStyle(style.glow);

  for (let index = 1; index < points.length; index += 1) {
    const progress = index / (points.length - 1);
    const bodyWidth = Math.max(1, Math.round(body.width * (1 - progress * 0.68)));
    const innerWidth = Math.max(1, Math.round(inner.width * (1 - progress * 0.8)));
    const fade = Math.max(0.08, 1 - progress * 0.9);

    graphics.lineStyle(glow.width, glow.color, glow.alpha * fade * 0.8);
    graphics.lineBetween(
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
    );
    graphics.lineStyle(bodyWidth, body.color, body.alpha * fade);
    graphics.lineBetween(
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
    );
    graphics.lineStyle(innerWidth, inner.color, inner.alpha * fade * 0.8);
    graphics.lineBetween(
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
    );
  }
}

function toRasterStyle(
  style: ProceduralLymphLayerStyle,
): ProceduralLymphLayerStyle {
  return {
    ...style,
    width: Math.max(1, Math.round(style.width / LYMPH_PIXEL_SCALE)),
  };
}
