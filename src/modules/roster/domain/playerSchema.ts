import { z } from "zod";

/** Invariants of the Player aggregate, shared by the API boundary and the form. */
export const positionSchema = z.enum(["QB", "WR", "DB", "RUSHER"]);

export const playerMetricsSchema = z.object({
  fortyYardDash: z.number().min(3.8, "Fastest realistic dash is ~3.8s").max(8, "Dash must be 8s or less"),
  agility: z.number().int().min(0).max(100),
  catchProbability: z.number().min(0).max(1),
  flagPullEfficiency: z.number().min(0).max(1),
});

export const playerStatsSchema = z.object({
  targets: z.number().int().min(0),
  receptions: z.number().int().min(0),
  yards: z.number().int(),
  flagPulls: z.number().int().min(0),
  interceptions: z.number().int().min(0),
});

const playerFieldsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  position: positionSchema,
  altPositions: z.array(positionSchema),
  jerseyNumber: z.number().int().min(0).max(99),
  metrics: playerMetricsSchema,
  stats: playerStatsSchema,
});

type PlayerFields = z.infer<typeof playerFieldsSchema>;

/** The main position is not an alternative, and an alternative is listed once. */
const refineAltPositions = (player: PlayerFields, context: z.RefinementCtx): void => {
  const hasMainPosition = player.altPositions.includes(player.position);
  const hasDuplicate = new Set(player.altPositions).size !== player.altPositions.length;
  if (!hasMainPosition && !hasDuplicate) return;
  context.addIssue({
    code: "custom",
    path: ["altPositions"],
    message: "Alternative positions must be unique and different from the main position",
  });
};

export const playerInputSchema = playerFieldsSchema.superRefine(refineAltPositions);

export const playerProfileSchema = playerFieldsSchema.extend({ id: z.string().min(1) }).superRefine(refineAltPositions);

export type PlayerInputValues = z.infer<typeof playerInputSchema>;
