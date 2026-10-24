import { cn } from "@/shared/ui/utils";

export type OffenseLibrary = "PLAYS" | "ROUTES";

type OffenseLibrarySwitchProps = {
  value: OffenseLibrary;
  onChange: (value: OffenseLibrary) => void;
};

const OPTIONS: { value: OffenseLibrary; label: string }[] = [
  { value: "PLAYS", label: "5-on-5 plays" },
  { value: "ROUTES", label: "Routes" },
];

/** Switches the offense tab between team calls and the single-receiver route library. */
export const OffenseLibrarySwitch = ({ value, onChange }: OffenseLibrarySwitchProps) => {
  const handleSelect = (next: OffenseLibrary) => (): void => onChange(next);

  return (
    <div role="group" aria-label="Offense library" className="flex gap-1.5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={handleSelect(option.value)}
          className={cn(
            "h-9 rounded-full border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground pointer-coarse:h-11",
            value === option.value && "border-primary bg-primary/15 text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
