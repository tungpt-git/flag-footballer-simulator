import { CircleCheckBig, CircleSlash, Flag, Footprints, OctagonX, ShieldAlert, type LucideIcon } from "lucide-react";
import type { Tone } from "@/shared/kernel/tone";
import type { OutcomeResult } from "../domain/types";

type OutcomeStyle = {
  icon: LucideIcon;
  /** Tailwind classes for the card border, tinted background and icon chip. */
  card: string;
  chip: string;
  text: string;
  animation: string;
};

const TONE_CLASSES: Record<Tone, Pick<OutcomeStyle, "card" | "chip" | "text">> = {
  success: { card: "border-success/60", chip: "bg-success text-background", text: "text-success" },
  warning: { card: "border-warning/60", chip: "bg-warning text-background", text: "text-warning" },
  danger: { card: "border-danger/60", chip: "bg-danger text-background", text: "text-danger" },
  info: { card: "border-info/60", chip: "bg-info text-background", text: "text-info" },
  neutral: { card: "border-border", chip: "bg-muted text-foreground", text: "text-muted-foreground" },
};

/** Each result gets its own icon and tone, and the bad ones shake instead of pop. */
export const OUTCOME_STYLES: Record<OutcomeResult, OutcomeStyle> = {
  COMPLETED_PASS: { icon: CircleCheckBig, ...TONE_CLASSES.success, animation: "animate-pop-in" },
  SCRAMBLE_GAIN: { icon: Footprints, ...TONE_CLASSES.success, animation: "animate-pop-in" },
  FLAG_PULLED: { icon: Flag, ...TONE_CLASSES.warning, animation: "animate-pop-in" },
  INCOMPLETE: { icon: CircleSlash, ...TONE_CLASSES.info, animation: "animate-pop-in" },
  INTERCEPTED: { icon: ShieldAlert, ...TONE_CLASSES.danger, animation: "animate-shake" },
  TURNOVER: { icon: OctagonX, ...TONE_CLASSES.danger, animation: "animate-shake" },
};

export const TONE_DOT_CLASSES: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};
