export const FOCUS_SPOTLIGHT_BANDS = [
  { radius: 210, alpha: 0.034 },
  { radius: 295, alpha: 0.034 },
  { radius: 390, alpha: 0.032 },
] as const;

export const FOCUS_SPOTLIGHT_MAX_DARKNESS =
  1 -
  FOCUS_SPOTLIGHT_BANDS.reduce(
    (remainingLight, band) => remainingLight * (1 - band.alpha),
    1,
  );
