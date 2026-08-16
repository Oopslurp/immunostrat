import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AUDIO_SETTINGS,
  normalizeAudioSettings,
} from "../audio/audioSettings";
import { CombatAudioTracker } from "../audio/CombatAudioTracker";
import { GameBridge } from "../game/phaser/GameBridge";
import { cloneState } from "../game/simulation/core/cloneState";
import { createInitialState } from "../game/simulation/core/createInitialState";
import {
  canRetryBattleResult,
  getResultProcessingKey,
} from "../game/presentation/resultLifecycle";

describe("V11.5 final production polish", () => {
  it("normalizes old or invalid audio settings without unsafe values", () => {
    expect(normalizeAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(
      normalizeAudioSettings({
        muted: true,
        master: 4,
        music: -2,
        ambience: Number.NaN,
        sfx: 0.35,
        ui: "loud",
      }),
    ).toEqual({
      ...DEFAULT_AUDIO_SETTINGS,
      muted: true,
      master: 1,
      music: 0,
      sfx: 0.35,
    });
  });

  it("publishes session gates and semantic audio events exactly once", () => {
    const bridge = new GameBridge();
    const sessions = vi.fn();
    const audio = vi.fn();
    const stopSession = bridge.subscribeSessionPresentation(sessions);
    const stopAudio = bridge.subscribeAudioEvent(audio);

    bridge.setSessionPresentation({ paused: true, inputBlocked: true });
    bridge.setSessionPresentation({ paused: true, inputBlocked: true });
    bridge.publishAudioEvent({ name: "phagocytosis", priority: 1 });

    expect(sessions).toHaveBeenCalledTimes(2);
    expect(bridge.isGameplayInputEnabled()).toBe(false);
    expect(audio).toHaveBeenCalledOnce();
    stopSession();
    stopAudio();
  });

  it("baselines combat audio and resets cleanly when simulation time rolls back", () => {
    const tracker = new CombatAudioTracker();
    const initial = createInitialState("woundBacteriaV1");
    expect(tracker.update(initial)).toEqual([]);

    const next = cloneState(initial);
    next.elapsedMs = 100;
    next.effects.push({
      id: "effect-audio-test",
      kind: "phagocytosis",
      position: { x: 240, y: 180 },
      radius: 40,
      ttlMs: 200,
    });
    next.missionStats.pathogenKills.test = 1;
    expect(tracker.update(next).map((event) => event.name)).toEqual([
      "phagocytosis",
      "clearance",
    ]);

    const restarted = createInitialState("woundBacteriaV1");
    expect(tracker.update(restarted)).toEqual([]);
  });

  it("rejects stale mission results and prevents body-map result replay", () => {
    expect(
      getResultProcessingKey(
        "woundBacteriaV1",
        "inflammatoryReactionV2",
        3,
        "victory",
      ),
    ).toBeNull();
    expect(
      getResultProcessingKey("woundBacteriaV1", "woundBacteriaV1", 3, "victory"),
    ).toBe("woundBacteriaV1-3-victory");
    expect(canRetryBattleResult("bodyMap", true)).toBe(false);
    expect(canRetryBattleResult("campaign", true)).toBe(true);
    expect(canRetryBattleResult("infinite", true)).toBe(true);
  });
});
