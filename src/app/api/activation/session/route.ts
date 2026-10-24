import { NextResponse } from "next/server";
import { assertActivationKeyValue } from "@/shared/infrastructure/auth/activationKey";
import { handleApiError } from "@/shared/infrastructure/http/apiResponses";

/** Checks the activation key without changing any player data. */
export const POST = async (request: Request) => {
  try {
    const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
    const key = typeof body?.key === "string" ? body.key : "";
    assertActivationKeyValue(key);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
};
