import { describe, expect, it } from "vitest";

describe("benchmark UI local test runner", () => {
  it("runs with jsdom", () => {
    expect(window.document).toBeDefined();
  });
});
