import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Position } from "../src/generated/prisma/client";
import { ROUTE_TYPES, buildRouteFromTemplate } from "../src/modules/playbook";

type SeedPlayer = {
  name: string;
  position: Position;
  jerseyNumber: number;
  fortyYardDash: number;
  agility: number;
  catchProbability: number;
  flagPullEfficiency: number;
  targets: number;
  receptions: number;
  yards: number;
  flagPulls: number;
  interceptions: number;
};

const SEED_PLAYERS: SeedPlayer[] = [
  { name: "Marcus Hale", position: "QB", jerseyNumber: 1, fortyYardDash: 4.9, agility: 72, catchProbability: 0.85, flagPullEfficiency: 0.3, targets: 0, receptions: 0, yards: 1240, flagPulls: 0, interceptions: 0 },
  { name: "Devon Brooks", position: "QB", jerseyNumber: 7, fortyYardDash: 5.1, agility: 80, catchProbability: 0.78, flagPullEfficiency: 0.25, targets: 0, receptions: 0, yards: 860, flagPulls: 0, interceptions: 0 },
  { name: "Jordan Reyes", position: "WR", jerseyNumber: 11, fortyYardDash: 4.55, agility: 84, catchProbability: 0.8, flagPullEfficiency: 0.35, targets: 48, receptions: 36, yards: 512, flagPulls: 2, interceptions: 0 },
  { name: "Tyler Okafor", position: "WR", jerseyNumber: 84, fortyYardDash: 4.45, agility: 76, catchProbability: 0.72, flagPullEfficiency: 0.3, targets: 52, receptions: 33, yards: 640, flagPulls: 1, interceptions: 0 },
  { name: "Sam Whitfield", position: "WR", jerseyNumber: 15, fortyYardDash: 4.75, agility: 91, catchProbability: 0.86, flagPullEfficiency: 0.4, targets: 40, receptions: 33, yards: 388, flagPulls: 4, interceptions: 0 },
  { name: "Leo Nakamura", position: "WR", jerseyNumber: 19, fortyYardDash: 4.95, agility: 68, catchProbability: 0.9, flagPullEfficiency: 0.3, targets: 36, receptions: 31, yards: 294, flagPulls: 0, interceptions: 0 },
  { name: "Chris Dalton", position: "DB", jerseyNumber: 21, fortyYardDash: 4.6, agility: 82, catchProbability: 0.58, flagPullEfficiency: 0.62, targets: 0, receptions: 0, yards: 0, flagPulls: 21, interceptions: 4 },
  { name: "Andre Pierce", position: "DB", jerseyNumber: 24, fortyYardDash: 4.8, agility: 70, catchProbability: 0.48, flagPullEfficiency: 0.5, targets: 0, receptions: 0, yards: 0, flagPulls: 15, interceptions: 2 },
  { name: "Nate Fischer", position: "DB", jerseyNumber: 29, fortyYardDash: 4.9, agility: 60, catchProbability: 0.5, flagPullEfficiency: 0.55, targets: 0, receptions: 0, yards: 0, flagPulls: 18, interceptions: 1 },
  { name: "Booker Ellis", position: "RUSHER", jerseyNumber: 55, fortyYardDash: 4.85, agility: 65, catchProbability: 0.4, flagPullEfficiency: 0.65, targets: 0, receptions: 0, yards: 0, flagPulls: 14, interceptions: 0 },
  { name: "Ray Delgado", position: "RUSHER", jerseyNumber: 92, fortyYardDash: 5.05, agility: 55, catchProbability: 0.35, flagPullEfficiency: 0.7, targets: 0, receptions: 0, yards: 0, flagPulls: 19, interceptions: 0 },
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const seedPlayers = async (): Promise<void> => {
  for (const player of SEED_PLAYERS) {
    await prisma.player.upsert({
      where: { jerseyNumber: player.jerseyNumber },
      update: player,
      create: player,
    });
  }
  console.log(`Seeded ${SEED_PLAYERS.length} players`);
};

const seedRoutes = async (): Promise<void> => {
  for (const type of ROUTE_TYPES) {
    const { name, waypoints, decisionPoints } = buildRouteFromTemplate(type);
    await prisma.route.upsert({
      where: { type },
      update: { name, waypoints, decisionPoints },
      create: { name, type, waypoints, decisionPoints },
    });
  }
  console.log(`Seeded ${ROUTE_TYPES.length} routes`);
};

const main = async (): Promise<void> => {
  await seedPlayers();
  await seedRoutes();
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
