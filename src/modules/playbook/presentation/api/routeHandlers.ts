import { NextResponse, connection } from "next/server";
import { handleApiError } from "@/shared/infrastructure/http/apiResponses";
import type { RouteUseCases } from "../../application/routeUseCases";

/** HTTP adapters for the playbook use cases. Wired to Next.js route files in `app/api/routes`. */
export const createRouteHandlers = (useCases: RouteUseCases) => ({
  list: async () => {
    await connection();
    try {
      return NextResponse.json(await useCases.listRoutes());
    } catch (error) {
      return handleApiError(error);
    }
  },
});
