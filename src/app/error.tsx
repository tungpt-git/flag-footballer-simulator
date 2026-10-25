"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";

type ErrorPageProps = { error: unknown; retry: () => void };

const ErrorPage = ({ error, retry }: ErrorPageProps) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleRetry = (): void => retry();

  return (
    <div role="alert" className="m-6 flex gap-3 rounded-xl border border-danger/50 border-l-4 border-l-danger bg-danger-soft p-4 text-sm">
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
      <div className="flex flex-col items-start gap-3">
        <div>
          <p className="font-semibold text-foreground">Could not load data</p>
          <p className="text-muted-foreground">Is the database running (docker compose up -d) and seeded (pnpm db:seed)?</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;
