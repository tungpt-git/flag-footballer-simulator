import { PlayerNotFoundError } from "../domain/errors";
import type { PlayerInput, PlayerProfile } from "../domain/player";
import type { PlayerRepository } from "../domain/playerRepository";

export type PlayerUseCases = {
  listPlayers: () => Promise<PlayerProfile[]>;
  getPlayer: (id: string) => Promise<PlayerProfile>;
  registerPlayer: (input: PlayerInput) => Promise<PlayerProfile>;
  updatePlayer: (id: string, input: PlayerInput) => Promise<PlayerProfile>;
  removePlayer: (id: string) => Promise<void>;
};

export const createPlayerUseCases = (repository: PlayerRepository): PlayerUseCases => ({
  listPlayers: () => repository.findAll(),

  getPlayer: async (id) => {
    const player = await repository.findById(id);
    if (!player) throw new PlayerNotFoundError();
    return player;
  },

  registerPlayer: (input) => repository.create(input),

  updatePlayer: (id, input) => repository.update(id, input),

  removePlayer: (id) => repository.remove(id),
});
