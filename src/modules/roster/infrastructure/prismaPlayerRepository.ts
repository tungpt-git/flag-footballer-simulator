import { Prisma, type Player } from "@/generated/prisma/client";
import { prisma } from "@/shared/infrastructure/prisma";
import { PlayerNotFoundError } from "../domain/errors";
import type { PlayerInput, PlayerProfile } from "../domain/player";
import type { PlayerRepository } from "../domain/playerRepository";

/** Maps a flat Prisma Player row to the nested PlayerProfile contract. */
const toPlayerProfile = (player: Player): PlayerProfile => ({
  id: player.id,
  name: player.name,
  position: player.position,
  altPositions: player.altPositions,
  jerseyNumber: player.jerseyNumber,
  metrics: {
    fortyYardDash: player.fortyYardDash,
    agility: player.agility,
    catchProbability: player.catchProbability,
    flagPullEfficiency: player.flagPullEfficiency,
  },
  stats: {
    targets: player.targets,
    receptions: player.receptions,
    yards: player.yards,
    flagPulls: player.flagPulls,
    interceptions: player.interceptions,
  },
});

/** Maps the nested PlayerInput contract to flat Prisma columns. */
const toPlayerData = (input: PlayerInput) => ({
  name: input.name,
  position: input.position,
  altPositions: input.altPositions,
  jerseyNumber: input.jerseyNumber,
  fortyYardDash: input.metrics.fortyYardDash,
  agility: input.metrics.agility,
  catchProbability: input.metrics.catchProbability,
  flagPullEfficiency: input.metrics.flagPullEfficiency,
  targets: input.stats.targets,
  receptions: input.stats.receptions,
  yards: input.stats.yards,
  flagPulls: input.stats.flagPulls,
  interceptions: input.stats.interceptions,
});

/** Translates Prisma error codes into the roster's domain errors. */
const translateError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
    throw new PlayerNotFoundError();
  throw error;
};

export const prismaPlayerRepository: PlayerRepository = {
  findAll: async () => {
    const players = await prisma.player.findMany({
      orderBy: [{ position: "asc" }, { jerseyNumber: "asc" }],
    });
    return players.map(toPlayerProfile);
  },

  findById: async (id) => {
    const player = await prisma.player.findUnique({ where: { id } });
    return player ? toPlayerProfile(player) : null;
  },

  create: async (input) => {
    try {
      return toPlayerProfile(
        await prisma.player.create({ data: toPlayerData(input) }),
      );
    } catch (error) {
      return translateError(error);
    }
  },

  update: async (id, input) => {
    try {
      return toPlayerProfile(
        await prisma.player.update({
          where: { id },
          data: toPlayerData(input),
        }),
      );
    } catch (error) {
      return translateError(error);
    }
  },

  remove: async (id) => {
    try {
      await prisma.player.delete({ where: { id } });
    } catch (error) {
      translateError(error);
    }
  },
};
