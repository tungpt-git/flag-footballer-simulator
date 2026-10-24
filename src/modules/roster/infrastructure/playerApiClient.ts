import { ACTIVATION_KEY_HEADER } from "@/shared/kernel/activationAccess";
import { HttpRequestError, requestJson } from "@/shared/infrastructure/http/httpClient";
import { clearActivationKey, getActivationKey, openActivationDialog } from "@/shared/ui/activation/activationSession";
import type { PlayerInput, PlayerProfile } from "../domain/player";

const withActivationKey = (init: RequestInit): RequestInit => {
  const key = getActivationKey();
  return {
    ...init,
    headers: {
      ...(key ? { [ACTIVATION_KEY_HEADER]: key } : {}),
    },
  };
};

const requestPlayerChange = async <T>(url: string, init: RequestInit): Promise<T> => {
  try {
    return await requestJson<T>(url, withActivationKey(init));
  } catch (error) {
    if (error instanceof HttpRequestError && error.status === 401) {
      clearActivationKey();
      openActivationDialog();
    }
    throw error;
  }
};

export const fetchPlayers = (): Promise<PlayerProfile[]> => requestJson("/api/players");

export const createPlayer = (input: PlayerInput): Promise<PlayerProfile> =>
  requestPlayerChange("/api/players", { method: "POST", body: JSON.stringify(input) });

export const updatePlayer = (id: string, input: PlayerInput): Promise<PlayerProfile> =>
  requestPlayerChange(`/api/players/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deletePlayer = (id: string): Promise<void> =>
  requestPlayerChange(`/api/players/${id}`, { method: "DELETE" });
