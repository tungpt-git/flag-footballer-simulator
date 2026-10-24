import { requestJson } from "@/shared/infrastructure/http/httpClient";
import type { Route } from "../domain/route";

export const fetchRoutes = (): Promise<Route[]> => requestJson("/api/routes");
