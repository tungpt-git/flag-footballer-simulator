import { afterEach, describe, expect, it } from "vitest";
import { ServiceUnavailableError, UnauthorizedError } from "@/shared/kernel/errors";
import { activationCookieMatches, assertActivationKeyValue, createActivationSessionToken } from "../activationKey";

describe("assertActivationKeyValue", () => {
  afterEach(() => {
    delete process.env.ACTIVATION_KEY;
  });

  it("rejects every key when the server secret is missing", () => {
    expect(() => assertActivationKeyValue("anything")).toThrow(ServiceUnavailableError);
  });

  it("rejects a missing or wrong key", () => {
    process.env.ACTIVATION_KEY = "correct-key";
    expect(() => assertActivationKeyValue(null)).toThrow(UnauthorizedError);
    expect(() => assertActivationKeyValue("  ")).toThrow(UnauthorizedError);
    expect(() => assertActivationKeyValue("nope")).toThrow(UnauthorizedError);
  });

  it("accepts the configured key, ignoring surrounding spaces", () => {
    process.env.ACTIVATION_KEY = " correct-key ";
    expect(() => assertActivationKeyValue("correct-key")).not.toThrow();
  });

  it("accepts only a session token derived from the configured key", () => {
    process.env.ACTIVATION_KEY = "correct-key";
    expect(activationCookieMatches(createActivationSessionToken())).toBe(true);
    expect(activationCookieMatches("not-the-token")).toBe(false);
    expect(activationCookieMatches(undefined)).toBe(false);
  });
});
