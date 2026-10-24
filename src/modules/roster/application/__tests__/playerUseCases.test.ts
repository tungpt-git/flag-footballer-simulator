import { describe, expect, it } from "vitest";
import { JerseyNumberTakenError, PlayerNotFoundError } from "../../domain/errors";
import type { PlayerInput, PlayerProfile } from "../../domain/player";
import type { PlayerRepository } from "../../domain/playerRepository";
import { playerInputSchema } from "../../domain/playerSchema";
import { createPlayerUseCases } from "../playerUseCases";

const buildInput = (jerseyNumber: number): PlayerInput => ({
  name: `Player ${jerseyNumber}`,
  position: "WR",
  jerseyNumber,
  metrics: { fortyYardDash: 4.6, agility: 80, catchProbability: 0.8, flagPullEfficiency: 0.3 },
  stats: { targets: 0, receptions: 0, yards: 0, flagPulls: 0, interceptions: 0 },
});

/** In-memory adapter that enforces the same rules as the database adapter. */
const createInMemoryRepository = (): PlayerRepository => {
  const players = new Map<string, PlayerProfile>();
  let nextId = 1;

  const assertJerseyAvailable = (jerseyNumber: number, ignoredId?: string): void => {
    const isTaken = [...players.values()].some(
      (player) => player.jerseyNumber === jerseyNumber && player.id !== ignoredId,
    );
    if (isTaken) throw new JerseyNumberTakenError();
  };

  return {
    findAll: async () => [...players.values()],
    findById: async (id) => players.get(id) ?? null,
    create: async (input) => {
      assertJerseyAvailable(input.jerseyNumber);
      const player = { ...input, id: `p${nextId++}` };
      players.set(player.id, player);
      return player;
    },
    update: async (id, input) => {
      if (!players.has(id)) throw new PlayerNotFoundError();
      assertJerseyAvailable(input.jerseyNumber, id);
      const player = { ...input, id };
      players.set(id, player);
      return player;
    },
    remove: async (id) => {
      if (!players.delete(id)) throw new PlayerNotFoundError();
    },
  };
};

describe("roster use cases", () => {
  it("registers and lists players", async () => {
    const useCases = createPlayerUseCases(createInMemoryRepository());
    const created = await useCases.registerPlayer(buildInput(11));

    expect(await useCases.listPlayers()).toEqual([created]);
    expect(await useCases.getPlayer(created.id)).toEqual(created);
  });

  it("rejects a duplicate jersey number", async () => {
    const useCases = createPlayerUseCases(createInMemoryRepository());
    await useCases.registerPlayer(buildInput(11));

    await expect(useCases.registerPlayer(buildInput(11))).rejects.toBeInstanceOf(JerseyNumberTakenError);
  });

  it("lets a player keep their own jersey number when updated", async () => {
    const useCases = createPlayerUseCases(createInMemoryRepository());
    const created = await useCases.registerPlayer(buildInput(11));

    const updated = await useCases.updatePlayer(created.id, { ...buildInput(11), name: "Renamed" });
    expect(updated.name).toBe("Renamed");
  });

  it("reports a missing player", async () => {
    const useCases = createPlayerUseCases(createInMemoryRepository());

    await expect(useCases.getPlayer("missing")).rejects.toBeInstanceOf(PlayerNotFoundError);
    await expect(useCases.removePlayer("missing")).rejects.toBeInstanceOf(PlayerNotFoundError);
  });
});

describe("player input invariants", () => {
  it("accepts a valid player", () => {
    expect(playerInputSchema.safeParse(buildInput(11)).success).toBe(true);
  });

  it("rejects an unrealistic 40-yard dash and an out-of-range jersey number", () => {
    const input = buildInput(120);
    input.metrics.fortyYardDash = 3;

    const result = playerInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
