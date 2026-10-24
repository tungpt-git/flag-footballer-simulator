"use client";

import { useAsyncResource, type AsyncResource } from "@/shared/ui/hooks/useAsyncResource";
import type { Route } from "../domain/route";
import { fetchRoutes } from "../infrastructure/routeApiClient";

const NO_ROUTES: Route[] = [];

/** Loads the route catalog from the API. */
export const useRoutes = (): AsyncResource<Route[]> => useAsyncResource(fetchRoutes, NO_ROUTES);
