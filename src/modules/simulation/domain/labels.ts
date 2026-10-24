import type { DecisionTrigger } from "@/modules/playbook";
import type { Tone } from "@/shared/kernel/tone";
import type { DecisionAction, OutcomeResult } from "./types";

/** Display names of the Simulation context's ubiquitous language. */

export const DECISION_LABELS: Record<DecisionAction, string> = {
  PASS_TO_WR: "Pass to WR",
  PUMP_FAKE_SCRAMBLE: "Pump Fake & Scramble",
  CHECKDOWN: "Checkdown",
};

export const DECISION_DESCRIPTIONS: Record<DecisionAction, string> = {
  PASS_TO_WR: "Throw to the primary receiver, leading him to where he will be.",
  PUMP_FAKE_SCRAMBLE: "Freeze the defense, then escape the rush and run.",
  CHECKDOWN: "Dump a safe, short pass to the outlet receiver.",
};

export const TRIGGER_LABELS: Record<DecisionTrigger, string> = {
  AT_CUT: "At the route cut",
  AT_TIME: "At 2.5 seconds",
};

export const OUTCOME_LABELS: Record<OutcomeResult, string> = {
  COMPLETED_PASS: "Completed pass",
  INTERCEPTED: "Intercepted",
  FLAG_PULLED: "Flag pulled",
  TURNOVER: "Turnover",
  INCOMPLETE: "Incomplete",
  SCRAMBLE_GAIN: "Scramble gain",
};

export const OUTCOME_TONES: Record<OutcomeResult, Tone> = {
  COMPLETED_PASS: "success",
  SCRAMBLE_GAIN: "success",
  FLAG_PULLED: "warning",
  INCOMPLETE: "info",
  INTERCEPTED: "danger",
  TURNOVER: "danger",
};
