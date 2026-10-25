"use server";

import { refresh } from "next/cache";
import { ZodError } from "zod";
import { assertActivationSession } from "@/shared/infrastructure/auth/activationCookie";
import { DomainError, UnauthorizedError } from "@/shared/kernel/errors";
import { playerUseCases } from "../composition";
import type { PlayerInput } from "../domain/player";
import { playerInputSchema } from "../domain/playerSchema";

export type PlayerMutationResult =
  | { ok: true }
  | { ok: false; message: string; unauthorized: boolean };

const failure = (error: unknown): PlayerMutationResult => {
  if (error instanceof ZodError) {
    return {
      ok: false,
      message: error.issues[0]?.message ?? "Validation failed",
      unauthorized: false,
    };
  }
  if (error instanceof UnauthorizedError)
    return { ok: false, message: error.message, unauthorized: true };
  if (error instanceof DomainError)
    return { ok: false, message: error.message, unauthorized: false };
  throw error;
};

const changePlayer = async (
  change: () => Promise<void>,
): Promise<PlayerMutationResult> => {
  try {
    await assertActivationSession();
    await change();
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
};

export const createPlayerAction = async (input: PlayerInput): Promise<PlayerMutationResult> =>
  changePlayer(async () => {
    await playerUseCases.registerPlayer(playerInputSchema.parse(input));
  });

export const updatePlayerAction = async (id: string, input: PlayerInput): Promise<PlayerMutationResult> =>
  changePlayer(async () => {
    await playerUseCases.updatePlayer(id, playerInputSchema.parse(input));
  });

export const deletePlayerAction = async (id: string): Promise<PlayerMutationResult> =>
  changePlayer(async () => {
    await playerUseCases.removePlayer(id);
  });
