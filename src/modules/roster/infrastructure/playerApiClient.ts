import { requestJson } from "@/shared/infrastructure/http/httpClient";
import type { PlayerInput, PlayerProfile } from "../domain/player";

export const fetchPlayers = (): Promise<PlayerProfile[]> => requestJson("/api/players");

export const createPlayer = (input: PlayerInput): Promise<PlayerProfile> =>
  requestJson("/api/players", { method: "POST", body: JSON.stringify(input) });

export const updatePlayer = (id: string, input: PlayerInput): Promise<PlayerProfile> =>
  requestJson(`/api/players/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deletePlayer = (id: string): Promise<void> =>
  requestJson(`/api/players/${id}`, { method: "DELETE" });
