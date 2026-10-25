import { Loader2 } from "lucide-react";

type PageLoadingProps = { label: string };

/** Suspense fallback shown while a page's server data streams in. */
export const PageLoading = ({ label }: PageLoadingProps) => (
  <div role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
    {label}
  </div>
);
