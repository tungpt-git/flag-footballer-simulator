import { cn } from "@/shared/ui/utils";
import type { PlayerProfile } from "../../domain/player";
import { PositionBadge } from "./PositionBadge";

type PlayerPositionsProps = {
  player: Pick<PlayerProfile, "position" | "altPositions">;
  /** Show the full name of the main position instead of the abbreviation. */
  showName?: boolean;
  className?: string;
};

/** Main position badge, followed by quieter badges for the other positions the player can play. */
export const PlayerPositions = ({ player, showName = false, className }: PlayerPositionsProps) => (
  <div className={cn("flex flex-wrap items-center gap-1", className)}>
    <PositionBadge position={player.position} showName={showName} />
    {player.altPositions.map((position) => (
      <PositionBadge key={position} position={position} className="opacity-70" />
    ))}
  </div>
);
