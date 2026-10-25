import { cookies } from "next/headers";
import { ServiceUnavailableError, UnauthorizedError } from "@/shared/kernel/errors";
import { ACTIVATION_COOKIE_NAME, activationCookieMatches, createActivationSessionToken } from "./activationKey";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Whether this request holds a valid activation cookie. A missing server secret counts as locked. */
export const isActivationUnlocked = async (): Promise<boolean> => {
  try {
    const store = await cookies();
    return activationCookieMatches(store.get(ACTIVATION_COOKIE_NAME)?.value);
  } catch (error) {
    if (error instanceof ServiceUnavailableError) return false;
    throw error;
  }
};

/** Rejects a roster change unless the activation cookie was issued for the current server secret. */
export const assertActivationSession = async (): Promise<void> => {
  createActivationSessionToken();
  const store = await cookies();
  if (!activationCookieMatches(store.get(ACTIVATION_COOKIE_NAME)?.value)) {
    throw new UnauthorizedError("Enter the activation key to change players.");
  }
};

/** Stores the activation proof. Call only after `assertActivationKeyValue` succeeds. */
export const writeActivationCookie = async (): Promise<void> => {
  const store = await cookies();
  store.set(ACTIVATION_COOKIE_NAME, createActivationSessionToken(), COOKIE_OPTIONS);
};

export const clearActivationCookie = async (): Promise<void> => {
  const store = await cookies();
  store.delete(ACTIVATION_COOKIE_NAME);
};
