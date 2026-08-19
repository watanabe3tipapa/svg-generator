import { describe, expect, it } from "vitest";
import { createShareId } from "./svgProjects";

describe("createShareId", () => {
  it("creates opaque, URL-safe IDs with a stable length", () => {
    const id = createShareId();
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("creates a new ID for each saved design", () => {
    expect(createShareId()).not.toEqual(createShareId());
  });
});
