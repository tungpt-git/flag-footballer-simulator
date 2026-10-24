"use client";

import { useAsyncResource, type AsyncResource } from "@/shared/ui/hooks/useAsyncResource";
import type { PlayerProfile } from "../domain/player";
import { fetchPlayers } from "../infrastructure/playerApiClient";

const NO_PLAYERS: PlayerProfile[] = [];

/** Loads the roster from the API. */
export const usePlayers = (): AsyncResource<PlayerProfile[]> => useAsyncResource(fetchPlayers, NO_PLAYERS);
