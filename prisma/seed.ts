import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Position } from "../src/generated/prisma/client";
import { ROUTE_TYPES, buildRouteFromTemplate } from "../src/modules/playbook";

type RosterEntry = { jerseyNumber: number; name: string };

type SeedPlayer = RosterEntry & {
  position: Position;
  altPositions: Position[];
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

type Range = readonly [min: number, max: number];

type PositionProfile = {
  fortyYardDash: Range;
  agility: Range;
  catchProbability: Range;
  flagPullEfficiency: Range;
};

/** The real team. Jersey numbers may repeat, so players are identified by name + number. */
const ROSTER: RosterEntry[] = [
  { jerseyNumber: 1, name: "Tu" },
  { jerseyNumber: 3, name: "Kieu Anh" },
  { jerseyNumber: 4, name: "Minh Duc" },
  { jerseyNumber: 5, name: "Trung" },
  { jerseyNumber: 7, name: "Quang Anh" },
  { jerseyNumber: 8, name: "Bach" },
  { jerseyNumber: 9, name: "Duc Anh" },
  { jerseyNumber: 10, name: "Corb" },
  { jerseyNumber: 14, name: "Quang" },
  { jerseyNumber: 17, name: "Big Mac aka Minh Duc" },
  { jerseyNumber: 19, name: "Thuy Do" },
  { jerseyNumber: 20, name: "Logan England" },
  { jerseyNumber: 21, name: "Leo (Doan's son)" },
  { jerseyNumber: 22, name: "Phuong Anh" },
  { jerseyNumber: 22, name: "Nhat Minh" },
  { jerseyNumber: 26, name: "Thinh" },
  { jerseyNumber: 29, name: "Phuong" },
  { jerseyNumber: 30, name: "Tien Anh" },
  { jerseyNumber: 33, name: "Jason/Hoang Anh (Philip)" },
  { jerseyNumber: 36, name: "Do Minh Duc" },
  { jerseyNumber: 37, name: "Quang" },
  { jerseyNumber: 41, name: "Doan" },
  { jerseyNumber: 54, name: "Kid Minh" },
  { jerseyNumber: 56, name: "Khoa" },
  { jerseyNumber: 58, name: "Quyet" },
  { jerseyNumber: 68, name: "Khoi" },
  { jerseyNumber: 69, name: "Duy Pham" },
  { jerseyNumber: 85, name: "Thanh An" },
  { jerseyNumber: 86, name: "Chieu Long aka Nghia" },
  { jerseyNumber: 88, name: "Tung Pham" },
  { jerseyNumber: 91, name: "Tan" },
  { jerseyNumber: 93, name: "Hania" },
  { jerseyNumber: 97, name: "Pham Trung Kien" },
  { jerseyNumber: 98, name: "Luan" },
];

/** Main positions are handed out round-robin so every position is covered. */
const POSITION_CYCLE: Position[] = ["QB", "WR", "DB", "WR", "RUSHER", "DB"];

const POSITION_PROFILES: Record<Position, PositionProfile> = {
  QB: { fortyYardDash: [4.8, 5.2], agility: [60, 82], catchProbability: [0.7, 0.88], flagPullEfficiency: [0.2, 0.35] },
  WR: { fortyYardDash: [4.4, 4.95], agility: [66, 92], catchProbability: [0.68, 0.9], flagPullEfficiency: [0.25, 0.4] },
  DB: { fortyYardDash: [4.55, 4.95], agility: [58, 84], catchProbability: [0.45, 0.6], flagPullEfficiency: [0.48, 0.66] },
  RUSHER: { fortyYardDash: [4.8, 5.1], agility: [52, 70], catchProbability: [0.3, 0.42], flagPullEfficiency: [0.62, 0.75] },
};

/** Small deterministic PRNG (mulberry32) so re-seeding always yields the same fake profiles. */
const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const ALL_POSITIONS: Position[] = ["QB", "WR", "DB", "RUSHER"];

/** Roughly half the team can also play one other position, a few can play two. */
const pickAltPositions = (position: Position, random: () => number): Position[] => {
  const others = ALL_POSITIONS.filter((candidate) => candidate !== position);
  const first = others.splice(Math.floor(random() * others.length), 1);
  const second = others.splice(Math.floor(random() * others.length), 1);
  const roll = random();
  if (roll < 0.5) return [];
  return roll < 0.85 ? first : [...first, ...second];
};

const buildFakePlayer = (entry: RosterEntry, index: number): SeedPlayer => {
  const random = createRandom(index + 1);
  const position = POSITION_CYCLE[index % POSITION_CYCLE.length];
  const profile = POSITION_PROFILES[position];

  const between = ([min, max]: Range, decimals: number): number =>
    Number((min + random() * (max - min)).toFixed(decimals));
  const wholeBetween = (min: number, max: number): number => Math.round(min + random() * (max - min));

  const catchProbability = between(profile.catchProbability, 2);
  const targets = position === "WR" ? wholeBetween(28, 55) : 0;
  const receptions = Math.round(targets * catchProbability);

  const athleticsAndStats = {
    fortyYardDash: between(profile.fortyYardDash, 2),
    agility: wholeBetween(...profile.agility),
    catchProbability,
    flagPullEfficiency: between(profile.flagPullEfficiency, 2),
    targets,
    receptions,
    yards: position === "WR" ? receptions * wholeBetween(10, 19) : position === "QB" ? wholeBetween(600, 1400) : 0,
    flagPulls: position === "DB" || position === "RUSHER" ? wholeBetween(8, 24) : wholeBetween(0, 3),
    interceptions: position === "DB" ? wholeBetween(0, 4) : 0,
  };

  const chosenAlts = pickAltPositions(position, random);
  return { ...entry, position, altPositions: ALL_POSITIONS.filter((candidate) => chosenAlts.includes(candidate)), ...athleticsAndStats };
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const seedPlayers = async (): Promise<void> => {
  const players = ROSTER.map(buildFakePlayer);
  await prisma.$transaction([prisma.player.deleteMany(), prisma.player.createMany({ data: players })]);
  console.log(`Seeded ${players.length} players`);
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
