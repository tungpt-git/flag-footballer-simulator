import { NextResponse, connection } from "next/server";
import { handleApiError } from "@/shared/infrastructure/http/apiResponses";
import type { PlayerUseCases } from "../../application/playerUseCases";
import { playerInputSchema } from "../../domain/playerSchema";

type PlayerRouteContext = { params: Promise<{ id: string }> };

/** HTTP adapters for the roster use cases. Wired to Next.js route files in `app/api/players`. */
export const createPlayerHandlers = (useCases: PlayerUseCases) => ({
  list: async () => {
    await connection();
    try {
      return NextResponse.json(await useCases.listPlayers());
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async (request: Request) => {
    try {
      const input = playerInputSchema.parse(await request.json());
      return NextResponse.json(await useCases.registerPlayer(input), { status: 201 });
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

  update: async (request: Request, context: PlayerRouteContext) => {
    try {
      const { id } = await context.params;
      const input = playerInputSchema.parse(await request.json());
      return NextResponse.json(await useCases.updatePlayer(id, input));
    } catch (error) {
      return handleApiError(error);
    }
  },

  remove: async (_request: Request, context: PlayerRouteContext) => {
    try {
      const { id } = await context.params;
      await useCases.removePlayer(id);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return handleApiError(error);
    }
  },
});
