import { describe, expect, it } from "vitest";
import { PlayerNotFoundError } from "../../domain/errors";
import { canPlayPosition, getPlayablePositions, normalizeAltPositions, type PlayerInput, type PlayerProfile } from "../../domain/player";
import type { PlayerRepository } from "../../domain/playerRepository";
import { playerInputSchema } from "../../domain/playerSchema";
import { createPlayerUseCases } from "../playerUseCases";

const buildInput = (jerseyNumber: number, name = `Player ${jerseyNumber}`): PlayerInput => ({
  name,
  position: "WR",
  altPositions: [],
  jerseyNumber,
  metrics: { fortyYardDash: 4.6, agility: 80, catchProbability: 0.8, flagPullEfficiency: 0.3 },
  stats: { targets: 0, receptions: 0, yards: 0, flagPulls: 0, interceptions: 0 },
});

/** In-memory adapter that enforces the same rules as the database adapter. */
const createInMemoryRepository = (): PlayerRepository => {
  const players = new Map<string, PlayerProfile>();
  let nextId = 1;

  return {
    findAll: async () => [...players.values()],
    findById: async (id) => players.get(id) ?? null,
    create: async (input) => {
      const player = { ...input, id: `p${nextId++}` };
      players.set(player.id, player);
      return player;
    },
    update: async (id, input) => {
      if (!players.has(id)) throw new PlayerNotFoundError();
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

  it("allows several players to share a jersey number", async () => {
    const useCases = createPlayerUseCases(createInMemoryRepository());
    await useCases.registerPlayer(buildInput(22, "Phuong Anh"));
    await useCases.registerPlayer(buildInput(22, "Nhat Minh"));

    expect(await useCases.listPlayers()).toHaveLength(2);
  });

  it("updates a player", async () => {
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

describe("multi-position players", () => {
  const player: Pick<PlayerProfile, "position" | "altPositions"> = { position: "WR", altPositions: ["DB"] };

  it("lists the main position first and can play every listed position", () => {
    expect(getPlayablePositions(player)).toEqual(["WR", "DB"]);
    expect(canPlayPosition(player, "WR")).toBe(true);
    expect(canPlayPosition(player, "DB")).toBe(true);
    expect(canPlayPosition(player, "QB")).toBe(false);
  });

  it("normalizes alternatives: no main position, no repeats, canonical order", () => {
    expect(normalizeAltPositions("WR", ["RUSHER", "WR", "QB", "QB"])).toEqual(["QB", "RUSHER"]);
  });
});

describe("player input invariants", () => {
  it("accepts a valid player", () => {
    expect(playerInputSchema.safeParse(buildInput(11)).success).toBe(true);
  });

  it("accepts alternative positions that differ from the main position", () => {
    const input: PlayerInput = { ...buildInput(11), altPositions: ["DB", "QB"] };
    expect(playerInputSchema.safeParse(input).success).toBe(true);
  });

  it("rejects the main position or a repeat as an alternative position", () => {
    expect(playerInputSchema.safeParse({ ...buildInput(11), altPositions: ["WR"] }).success).toBe(false);
    expect(playerInputSchema.safeParse({ ...buildInput(11), altPositions: ["DB", "DB"] }).success).toBe(false);
  });

  it("rejects an unrealistic 40-yard dash and an out-of-range jersey number", () => {
    const input = buildInput(120);
    input.metrics.fortyYardDash = 3;

    const result = playerInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
