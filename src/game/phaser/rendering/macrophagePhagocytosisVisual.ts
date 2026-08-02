export type PhagocytosisVisualInput = Readonly<{
  bacteriumPosition: Readonly<{ x: number; y: number }>;
  macrophagePosition: Readonly<{ x: number; y: number }>;
  attachmentPoint: Readonly<{ x: number; y: number }>;
  facing: -1 | 1;
  remainingMs: number;
  durationMs: number;
}>;

export type PhagocytosisVisualTransform = Readonly<{
  x: number;
  y: number;
  scale: number;
  progress: number;
}>;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function linear(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

export function calculatePhagocytosisVisualTransform(
  input: PhagocytosisVisualInput,
): PhagocytosisVisualTransform {
  const progress = clamp01(1 - input.remainingMs / Math.max(1, input.durationMs));
  const easedProgress = 1 - (1 - progress) * (1 - progress);
  const targetX =
    input.macrophagePosition.x + input.attachmentPoint.x * input.facing;
  const targetY = input.macrophagePosition.y + input.attachmentPoint.y;

  return {
    x: linear(input.bacteriumPosition.x, targetX, easedProgress),
    y: linear(input.bacteriumPosition.y, targetY, easedProgress),
    scale: linear(1, 0.22, easedProgress),
    progress,
  };
}
