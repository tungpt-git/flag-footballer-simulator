import type { PlayerProfile } from "@/modules/roster";
import { DEFAULT_OUTLET, DEFAULT_SAFETY } from "../domain/constants";
import { ENTITY_IDS } from "../domain/simulation";
import type { SimulationConfig } from "../domain/types";

/** Order in which dots appear in pickers and legends. */
export const ENTITY_ORDER: string[] = [
  ENTITY_IDS.receiver,
  ENTITY_IDS.outlet,
  ENTITY_IDS.quarterback,
  ENTITY_IDS.cornerback,
  ENTITY_IDS.safety,
  ENTITY_IDS.rusher,
];

/** Player profile behind a simulation dot (default profiles for the check-down and safety). */
export const getEntityProfile = (config: SimulationConfig, entityId: string): PlayerProfile | null => {
  const profiles: Record<string, PlayerProfile> = {
    [ENTITY_IDS.receiver]: config.receiver,
    [ENTITY_IDS.outlet]: DEFAULT_OUTLET,
    [ENTITY_IDS.quarterback]: config.quarterback,
    [ENTITY_IDS.cornerback]: config.cornerback,
    [ENTITY_IDS.safety]: DEFAULT_SAFETY,
    [ENTITY_IDS.rusher]: config.rusher,
  };
  return profiles[entityId] ?? null;
};
