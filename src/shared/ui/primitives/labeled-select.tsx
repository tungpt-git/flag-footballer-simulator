"use client";

import { Label } from "@/shared/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { cn } from "@/shared/ui/utils";

export type SelectOption = { value: string; label: string };

type LabeledSelectProps = {
  id: string;
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hint?: string;
};

/** Label + shadcn Select wrapper so every dropdown in the app shares the same wiring. */
export const LabeledSelect = ({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
  hint,
}: LabeledSelectProps) => {
  const handleValueChange = (nextValue: string | null): void => {
    if (nextValue === null) return;
    onChange(nextValue);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-xs font-semibold text-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={handleValueChange} items={options} disabled={disabled}>
        <SelectTrigger id={id} className="w-full bg-surface" aria-describedby={hint ? `${id}-hint` : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
};
