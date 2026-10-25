import { NextResponse, connection } from "next/server";
import { handleApiError } from "@/shared/infrastructure/http/apiResponses";
import type { PlayerUseCases } from "../../application/playerUseCases";

type PlayerRouteContext = { params: Promise<{ id: string }> };

/** HTTP adapters for roster reads. Writes go through Server Actions that check the activation cookie. */
export const createPlayerHandlers = (useCases: PlayerUseCases) => ({
  list: async () => {
    await connection();
    try {
      return NextResponse.json(await useCases.listPlayers());
    } catch (error) {
      return handleApiError(error);
    }
  },

  get: async (_request: Request, context: PlayerRouteContext) => {
    await connection();
    try {
      const { id } = await context.params;
      return NextResponse.json(await useCases.getPlayer(id));
    } catch (error) {
      return handleApiError(error);
    }
  },
});
