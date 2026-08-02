import {
  entitySpriteManifest,
  getEntitySpriteDefinition,
  type EntitySpriteDefinition,
  type EntityVisualState,
  type SpriteAnimationDefinition,
} from "../assets/entitySpriteManifest";

export type SpriteAvailability = Readonly<{
  hasTexture: (textureKey: string) => boolean;
  hasAnimation: (animationKey: string) => boolean;
}>;

export type ResolvedEntityVisual =
  | Readonly<{
      kind: "sprite";
      definition: EntitySpriteDefinition;
      requestedState: EntityVisualState;
      resolvedState: EntityVisualState;
      animationKey: string | null;
    }>
  | Readonly<{
      kind: "procedural";
      definition?: EntitySpriteDefinition;
      requestedState: EntityVisualState;
      reason:
        | "not-declared"
        | "disabled"
        | "texture-missing"
        | "animation-missing"
        | "fallback-forbidden";
    }>;

function getUsableAnimation(
  definition: EntitySpriteDefinition,
  state: EntityVisualState,
  availability: SpriteAvailability,
): { state: EntityVisualState; animation: SpriteAnimationDefinition } | undefined {
  const requested = definition.animations[state];
  if (requested && availability.hasAnimation(requested.key)) {
    return { state, animation: requested };
  }

  const idle = definition.animations.idle;
  if (idle && availability.hasAnimation(idle.key)) {
    return { state: "idle", animation: idle };
  }

  return undefined;
}

export function resolveEntityVisual(
  entityType: string,
  visualState: EntityVisualState,
  availability: SpriteAvailability,
  manifest: readonly EntitySpriteDefinition[] = entitySpriteManifest,
): ResolvedEntityVisual {
  const definition = getEntitySpriteDefinition(entityType, manifest);
  if (!definition) {
    return { kind: "procedural", requestedState: visualState, reason: "not-declared" };
  }
  if (!definition.enabled) {
    return {
      kind: "procedural",
      definition,
      requestedState: visualState,
      reason: "disabled",
    };
  }
  if (!availability.hasTexture(definition.textureKey)) {
    return {
      kind: "procedural",
      definition,
      requestedState: visualState,
      reason: definition.allowProceduralFallback
        ? "texture-missing"
        : "fallback-forbidden",
    };
  }

  if (definition.assetType === "image") {
    return {
      kind: "sprite",
      definition,
      requestedState: visualState,
      resolvedState: visualState,
      animationKey: null,
    };
  }

  const resolvedAnimation = getUsableAnimation(
    definition,
    visualState,
    availability,
  );
  if (!resolvedAnimation) {
    return {
      kind: "procedural",
      definition,
      requestedState: visualState,
      reason: definition.allowProceduralFallback
        ? "animation-missing"
        : "fallback-forbidden",
    };
  }

  return {
    kind: "sprite",
    definition,
    requestedState: visualState,
    resolvedState: resolvedAnimation.state,
    animationKey: resolvedAnimation.animation.key,
  };
}
