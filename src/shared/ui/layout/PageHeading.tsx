import type { ReactNode } from "react";

type PageHeadingProps = {
  title: string;
  /** Small caps line above the title, e.g. "Team". */
  eyebrow?: string;
  /** Small pill next to the title, e.g. a count. */
  count?: number;
  description?: string;
  actions?: ReactNode;
};

export const PageHeading = ({
  title,
  eyebrow,
  count,
  description,
  actions,
}: PageHeadingProps) => (
  <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-6 pb-4 md:px-8">
    <div className="min-w-0">
      {eyebrow && <p className="caption-label mb-1 text-primary">{eyebrow}</p>}
      <div className="flex items-center gap-3">
        <h1 className="font-display text-title font-semibold uppercase tracking-wide text-foreground md:text-4xl">
          {title}
        </h1>
        {count !== undefined && (
          <span
            className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-xs font-semibold text-secondary-foreground tabular"
            aria-label={`${count} items`}
          >
            {count}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    )}
  </div>
);
