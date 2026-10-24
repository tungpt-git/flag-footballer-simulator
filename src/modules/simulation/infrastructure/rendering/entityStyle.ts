import { POSITION_THEME, type PositionKey } from "@/shared/ui/positionTheme";
import type { EntityRole } from "../../domain/types";

/** Which position (and therefore colour + shape) each simulation entity is drawn as. */
export const ENTITY_POSITION: Record<EntityRole, PositionKey> = {
  RECEIVER: "WR",
  OUTLET: "WR",
  QB: "QB",
  DEFENDER: "DB",
  RUSHER: "RUSHER",
};

export const ENTITY_ROLE_LABELS: Record<EntityRole, string> = {
  RECEIVER: "Primary receiver",
  OUTLET: "Check-down receiver",
  QB: "Quarterback",
  DEFENDER: "Defender",
  RUSHER: "Rusher",
};

export const getEntityColor = (role: EntityRole): string => POSITION_THEME[ENTITY_POSITION[role]].hex;
