import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { ServiceUnavailableError, UnauthorizedError } from "@/shared/kernel/errors";

/** httpOnly cookie set after the activation key is checked on the server. */
export const ACTIVATION_COOKIE_NAME = "ff-activation";

const digest = (value: string): Buffer => createHash("sha256").update(value, "utf8").digest();

/** Constant-time comparison so a wrong key does not leak the secret through response timing. */
const keysMatch = (provided: string, expected: string): boolean => timingSafeEqual(digest(provided), digest(expected));

const configuredKey = (): string => {
  const value = process.env.ACTIVATION_KEY?.trim() ?? "";
  if (!value) throw new ServiceUnavailableError("Activation key is not configured on the server.");
  return value;
};

/** Rejects roster changes unless `provided` matches `ACTIVATION_KEY`. */
export const assertActivationKeyValue = (provided: string | null | undefined): void => {
  const expected = configuredKey();
  const candidate = provided?.trim() ?? "";
  if (!candidate || !keysMatch(candidate, expected)) {
    throw new UnauthorizedError(candidate ? "Activation key is incorrect." : "Enter the activation key to change players.");
  }
};

/** Proof stored in the activation cookie. It is derived from the server secret and is not the key itself. */
export const createActivationSessionToken = (): string =>
  createHmac("sha256", configuredKey()).update("ff-activation-session").digest("base64url");

/** True when `value` is the token for the currently configured activation key. */
export const activationCookieMatches = (value: string | undefined): boolean => {
  if (!value) return false;
  const expected = Buffer.from(createActivationSessionToken());
  const provided = Buffer.from(value);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
};
