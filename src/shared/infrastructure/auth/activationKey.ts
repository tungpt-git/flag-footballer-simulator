import { createHash, timingSafeEqual } from "node:crypto";
import { ACTIVATION_KEY_HEADER } from "@/shared/kernel/activationAccess";
import { ServiceUnavailableError, UnauthorizedError } from "@/shared/kernel/errors";

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

/** Reads the activation key from the request header and checks it against the server secret. */
export const assertActivationKeyHeader = (request: Request): void => {
  assertActivationKeyValue(request.headers.get(ACTIVATION_KEY_HEADER));
};
