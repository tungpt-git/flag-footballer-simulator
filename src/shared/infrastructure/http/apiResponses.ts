import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ConflictError, NotFoundError } from "@/shared/kernel/errors";

export const jsonError = (message: string, status: number, details?: unknown): NextResponse =>
  NextResponse.json({ error: message, details }, { status });

/** Maps validation and domain errors to HTTP responses. */
export const handleApiError = (error: unknown): NextResponse => {
  if (error instanceof ZodError) return jsonError("Validation failed", 400, error.issues);
  if (error instanceof NotFoundError) return jsonError(error.message, 404);
  if (error instanceof ConflictError) return jsonError(error.message, 409);
  console.error(error);
  return jsonError("Unexpected server error", 500);
};
