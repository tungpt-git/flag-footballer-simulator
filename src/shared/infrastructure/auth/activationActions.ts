"use server";

import { refresh } from "next/cache";
import { ServiceUnavailableError, UnauthorizedError } from "@/shared/kernel/errors";
import { clearActivationCookie, writeActivationCookie } from "./activationCookie";
import { assertActivationKeyValue } from "./activationKey";

export type ActivationResult = { ok: true } | { ok: false; message: string };

/** Checks the activation key on the server and stores an httpOnly session cookie. */
export const unlockActivation = async (key: string): Promise<ActivationResult> => {
  try {
    assertActivationKeyValue(key);
    await writeActivationCookie();
    refresh();
    return { ok: true };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ServiceUnavailableError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
};

/** Drops the activation cookie so later roster writes are rejected. */
export const lockActivation = async (): Promise<void> => {
  await clearActivationCookie();
  refresh();
};
