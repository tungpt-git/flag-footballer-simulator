import { describe, expect, it } from "vitest";
import { isSuccessfulResult } from "../sessionHistoryStore";

describe("isSuccessfulResult", () => {
  it("treats a gain as success for the offense", () => {
    expect(isSuccessfulResult("COMPLETED_PASS", "OFFENSE")).toBe(true);
    expect(isSuccessfulResult("INTERCEPTED", "OFFENSE")).toBe(false);
  });

  it("defaults to the offense", () => {
    expect(isSuccessfulResult("INCOMPLETE")).toBe(false);
  });

  it("treats anything but a gain as success for the defense", () => {
    expect(isSuccessfulResult("INCOMPLETE", "DEFENSE")).toBe(true);
    expect(isSuccessfulResult("INTERCEPTED", "DEFENSE")).toBe(true);
    expect(isSuccessfulResult("FLAG_PULLED", "DEFENSE")).toBe(true);
    expect(isSuccessfulResult("COMPLETED_PASS", "DEFENSE")).toBe(false);
  });
});
