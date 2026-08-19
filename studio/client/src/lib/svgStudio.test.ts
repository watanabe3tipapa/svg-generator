import { describe, expect, it } from "vitest";
import { createSvgMarkup, decodeSettings, defaultSettings, encodeSettings, sanitizeSvgCode } from "./svgStudio";

describe("SVG Studio helpers", () => {
  it("renders a transparent SVG without a background rectangle", () => {
    const svg = createSvgMarkup({ ...defaultSettings, transparent: true });
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<rect width=\"100%\"");
  });

  it("round-trips shareable settings containing Japanese text", () => {
    const encoded = encodeSettings({ ...defaultSettings, text: "風のロゴ" });
    expect(decodeSettings(encoded)?.text).toBe("風のロゴ");
  });

  it("removes script elements before raw SVG previews", () => {
    expect(sanitizeSvgCode('<svg><script>alert(1)</script><path d="M0 0" /></svg>')).not.toContain("script");
  });

  it("removes inline event handlers and foreign objects", () => {
    const unsafe = '<svg onclick=alert(1)><foreignObject>bad</foreignObject><path d="M0 0" /></svg>';
    expect(sanitizeSvgCode(unsafe)).not.toContain("onclick");
    expect(sanitizeSvgCode(unsafe)).not.toContain("foreignObject");
  });
});
