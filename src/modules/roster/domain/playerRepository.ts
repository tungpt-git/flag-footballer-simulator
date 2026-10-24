import type { PlayerInput, PlayerProfile } from "./player";

/**
 * Persistence port for the Player aggregate.
 * Implementations throw `JerseyNumberTakenError` and `PlayerNotFoundError` for rule violations.
 */
export type PlayerRepository = {
  findAll: () => Promise<PlayerProfile[]>;
  findById: (id: string) => Promise<PlayerProfile | null>;
  create: (input: PlayerInput) => Promise<PlayerProfile>;
  update: (id: string, input: PlayerInput) => Promise<PlayerProfile>;
  remove: (id: string) => Promise<void>;
};
