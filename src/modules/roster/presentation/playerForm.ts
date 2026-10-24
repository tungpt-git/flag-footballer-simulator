import { z } from "zod";
import type { PlayerInput, PlayerProfile, Position } from "../domain/player";
import { positionSchema } from "../domain/playerSchema";

const numberField = (message: string) => z.number({ error: message });

/** Form-level schema: probabilities are edited as 0-100 percentages. */
export const playerFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name is too long"),
  position: positionSchema,
  jerseyNumber: numberField("Enter a jersey number").int("Whole numbers only").min(0, "Min 0").max(99, "Max 99"),
  fortyYardDash: numberField("Enter a time in seconds").min(3.8, "Min 3.8 s").max(8, "Max 8 s"),
  agility: numberField("Enter 0-100").int("Whole numbers only").min(0, "Min 0").max(100, "Max 100"),
  catchPercent: numberField("Enter 0-100").min(0, "Min 0").max(100, "Max 100"),
  flagPullPercent: numberField("Enter 0-100").min(0, "Min 0").max(100, "Max 100"),
  targets: numberField("Enter a number").int("Whole numbers only").min(0, "Min 0"),
  receptions: numberField("Enter a number").int("Whole numbers only").min(0, "Min 0"),
  yards: numberField("Enter a number").int("Whole numbers only"),
  flagPulls: numberField("Enter a number").int("Whole numbers only").min(0, "Min 0"),
  interceptions: numberField("Enter a number").int("Whole numbers only").min(0, "Min 0"),
});

export type PlayerFormValues = z.infer<typeof playerFormSchema>;

const DEFAULT_POSITION: Position = "WR";

export const getEmptyPlayerForm = (): PlayerFormValues => ({
  name: "",
  position: DEFAULT_POSITION,
  jerseyNumber: 0,
  fortyYardDash: 4.8,
  agility: 70,
  catchPercent: 75,
  flagPullPercent: 40,
  targets: 0,
  receptions: 0,
  yards: 0,
  flagPulls: 0,
  interceptions: 0,
});

export const toFormValues = (player: PlayerProfile): PlayerFormValues => ({
  name: player.name,
  position: player.position,
  jerseyNumber: player.jerseyNumber,
  fortyYardDash: player.metrics.fortyYardDash,
  agility: player.metrics.agility,
  catchPercent: Math.round(player.metrics.catchProbability * 100),
  flagPullPercent: Math.round(player.metrics.flagPullEfficiency * 100),
  targets: player.stats.targets,
  receptions: player.stats.receptions,
  yards: player.stats.yards,
  flagPulls: player.stats.flagPulls,
  interceptions: player.stats.interceptions,
});

export const toPlayerInput = (values: PlayerFormValues): PlayerInput => ({
  name: values.name.trim(),
  position: values.position,
  jerseyNumber: values.jerseyNumber,
  metrics: {
    fortyYardDash: values.fortyYardDash,
    agility: values.agility,
    catchProbability: values.catchPercent / 100,
    flagPullEfficiency: values.flagPullPercent / 100,
  },
  stats: {
    targets: values.targets,
    receptions: values.receptions,
    yards: values.yards,
    flagPulls: values.flagPulls,
    interceptions: values.interceptions,
  },
});
