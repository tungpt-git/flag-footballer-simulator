import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/shared/ui/primitives/label";
import { cn } from "@/shared/ui/utils";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/** Form group: label above the control, helper text, inline error (icon + text, never colour alone). */
export const FormField = ({ id, label, error, hint, className, children }: FormFieldProps) => (
  <div className={cn("flex flex-col gap-1", className)}>
    <Label htmlFor={id} className="text-xs font-semibold text-foreground">
      {label}
    </Label>
    {children}
    {hint && !error && (
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {hint}
      </p>
    )}
    {error && (
      <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs font-medium text-danger">
        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    )}
  </div>
);
