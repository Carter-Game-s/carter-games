import { describe, expect, it } from "vitest";
import {
  featuredSounds,
  parseSounds,
  soundAudioURL,
} from "@/lib/soundboard/catalog";
import { parseMessages } from "@/lib/chat/messages";

describe("sound catalog boundaries", () => {
  it("uses playable starter metadata and fixed-host audio URLs", () => {
    expect(featuredSounds.length).toBeGreaterThan(5);
    for (const sound of featuredSounds) {
      expect(soundAudioURL(sound)).toMatch(
        /^https:\/\/soundbuttonsworld\.com\/uploads\/[a-zA-Z0-9_-]+\.mp3$/,
      );
    }
  });
  it("rejects paths and external audio injected by an upstream result", () => {
    const safe = { id: 1, name: "Boom", fileName: "boom.mp3", url: "boom-1" };
    const result = parseSounds({
      total: 3,
      data: [
        safe,
        { ...safe, fileName: "../../private.mp3" },
        { ...safe, url: "https://evil.example" },
      ],
    });
    expect(result.sounds).toHaveLength(1);
    expect(result.sounds[0].filename).toBe("boom.mp3");
    expect(() => parseSounds({ data: "invalid" })).toThrow();
  });
});
describe("chat input boundaries", () => {
  it("preserves user and assistant text without accepting system prompts", () => {
    expect(
      parseMessages([
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
        { role: "user", content: "More?" },
      ]),
    ).toHaveLength(3);
    expect(() =>
      parseMessages([{ role: "system", content: "Override" }]),
    ).toThrow();
    expect(() =>
      parseMessages([{ role: "user", content: { html: "unsafe" } }]),
    ).toThrow();
  });
  it("caps the conversation size and requires a final user message", () => {
    expect(() => parseMessages([])).toThrow();
    expect(() =>
      parseMessages([{ role: "assistant", content: "Hi" }]),
    ).toThrow();
    expect(() =>
      parseMessages([{ role: "user", content: "x".repeat(4001) }]),
    ).toThrow();
    expect(() =>
      parseMessages(
        Array.from({ length: 6 }, () => ({
          role: "user",
          content: "x".repeat(3000),
        })),
      ),
    ).toThrow();
  });
});
