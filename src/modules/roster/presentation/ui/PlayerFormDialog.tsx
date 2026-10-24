"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { FormField } from "@/shared/ui/primitives/form-field";
import { Input } from "@/shared/ui/primitives/input";
import { LabeledSelect } from "@/shared/ui/primitives/labeled-select";
import { Slider } from "@/shared/ui/primitives/slider";
import { PositionGlyph } from "@/shared/ui/PositionGlyph";
import { StatMeter } from "@/shared/ui/StatMeter";
import { createPlayer, updatePlayer } from "../../infrastructure/playerApiClient";
import { dashToMetersPerSecond } from "../../domain/athletics";
import { POSITIONS, normalizeAltPositions, type PlayerProfile, type Position } from "../../domain/player";
import { POSITION_LABELS, getMetricLabels } from "../labels";
import { AltPositionPicker } from "./AltPositionPicker";
import { dashToScore, type MetricScores } from "../metricScores";
import {
  PlayerFormValues,
  getEmptyPlayerForm,
  playerFormSchema,
  toFormValues,
  toPlayerInput,
} from "../playerForm";

type PlayerFormDialogProps = {
  /** Player being edited, or null to create a new one. */
  player: PlayerProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  /** Roster averages, used to show how the edited values compare with the team. */
  teamAverage?: MetricScores | null;
};

type PlayerFormProps = Pick<PlayerFormDialogProps, "player" | "onSaved" | "teamAverage"> & { onClose: () => void };

type SliderMetric = {
  fieldName: "agility" | "catchPercent" | "flagPullPercent";
  id: string;
  metricKey: "agility" | "catchProbability" | "flagPullEfficiency";
  scoreKey: keyof MetricScores;
};

const SLIDER_METRICS: SliderMetric[] = [
  { fieldName: "agility", id: "player-agility", metricKey: "agility", scoreKey: "agility" },
  { fieldName: "catchPercent", id: "player-catch", metricKey: "catchProbability", scoreKey: "catching" },
  { fieldName: "flagPullPercent", id: "player-flag", metricKey: "flagPullEfficiency", scoreKey: "flagPull" },
];

const SectionLegend = ({ children }: { children: string }) => <legend className="caption-label mb-3">{children}</legend>;

const POSITION_OPTIONS = POSITIONS.map((position) => ({ value: position, label: `${position} - ${POSITION_LABELS[position]}` }));

const isPosition = (value: string): value is Position => POSITIONS.includes(value as Position);

/** Mounted only while the dialog is open, so every open starts from fresh form state. */
const PlayerForm = ({ player, onClose, onSaved, teamAverage }: PlayerFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    mode: "onTouched",
    defaultValues: player ? toFormValues(player) : getEmptyPlayerForm(),
  });

  const position = useWatch({ control, name: "position" });
  const dash = useWatch({ control, name: "fortyYardDash" });
  const previewName = useWatch({ control, name: "name" });
  const previewJersey = useWatch({ control, name: "jerseyNumber" });
  const metricLabels = getMetricLabels(position);
  const speedMps = Number.isFinite(dash) && dash > 0 ? dashToMetersPerSecond(dash) : null;

  const handleSave = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const input = toPlayerInput(values);
      if (player) await updatePlayer(player.id, input);
      else await createPlayer(input);
      toast.success(player ? `Updated ${input.name}` : `Added ${input.name} to the roster`);
      onSaved();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save player");
    }
  });

  const handleCancel = (): void => onClose();

  /** Switching the main position removes it from the alternatives, so it is never listed twice. */
  const handleMainPositionChange = (onFieldChange: (value: Position) => void) => (value: string): void => {
    if (!isPosition(value)) return;
    onFieldChange(value);
    setValue("altPositions", normalizeAltPositions(value, getValues("altPositions")));
  };

  const errorFor = (name: keyof PlayerFormValues): string | undefined => errors[name]?.message;

  const hasDash = Number.isFinite(dash) && dash > 0;
  const hasJersey = Number.isFinite(previewJersey);

  return (
    <form onSubmit={handleSave} noValidate className="flex min-h-full flex-col">
      <DialogHeader className="gap-3 border-b border-border bg-muted/40 px-5 py-4 md:rounded-tl-2xl">
        <div className="flex items-center gap-4">
          <span className="min-w-[3.5rem] font-display text-[3.5rem] leading-[0.85] font-semibold text-foreground tabular" aria-hidden="true">
            {hasJersey ? previewJersey : "--"}
          </span>
          <div className="min-w-0 pr-8">
            <DialogTitle className="truncate text-heading">{player ? `Edit ${player.name}` : "New player"}</DialogTitle>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
              <PositionGlyph position={position} />
              <span className="truncate">{previewName?.trim() ? previewName : "Unnamed player"}</span>
            </p>
          </div>
        </div>
        <DialogDescription>Speed and agility drive the route simulator; hands and flag pulling decide contested plays.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-1 flex-col gap-6 px-5 py-5">
        {submitError && (
          <div role="alert" className="flex gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
            {submitError}
          </div>
        )}

        <fieldset className="grid gap-3 sm:grid-cols-6">
          <SectionLegend>Bio</SectionLegend>
          <FormField id="player-name" label="Name" error={errorFor("name")} className="sm:col-span-4">
            <Input id="player-name" autoComplete="off" aria-invalid={!!errors.name} aria-describedby={errors.name ? "player-name-error" : undefined} {...register("name")} />
          </FormField>
          <FormField id="player-jersey" label="Jersey #" error={errorFor("jerseyNumber")} className="sm:col-span-2">
            <Input id="player-jersey" type="number" inputMode="numeric" aria-invalid={!!errors.jerseyNumber} aria-describedby={errors.jerseyNumber ? "player-jersey-error" : undefined} {...register("jerseyNumber", { valueAsNumber: true })} />
          </FormField>
          <div className="sm:col-span-6">
            <Controller
              control={control}
              name="position"
              render={({ field }) => (
                <LabeledSelect
                  id="player-position"
                  label="Main position"
                  value={field.value}
                  options={POSITION_OPTIONS}
                  onChange={handleMainPositionChange(field.onChange)}
                />
              )}
            />
          </div>
          <div className="sm:col-span-6">
            <Controller
              control={control}
              name="altPositions"
              render={({ field }) => <AltPositionPicker mainPosition={position} value={field.value} onChange={field.onChange} />}
            />
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <SectionLegend>Athletic metrics</SectionLegend>
          <FormField
            id="player-dash"
            label={metricLabels.fortyYardDash.label}
            error={errorFor("fortyYardDash")}
            hint={speedMps ? `${speedMps.toFixed(2)} m/s average. ${metricLabels.fortyYardDash.hint}` : metricLabels.fortyYardDash.hint}
          >
            <Input id="player-dash" type="number" step="0.01" inputMode="decimal" aria-invalid={!!errors.fortyYardDash} aria-describedby={errors.fortyYardDash ? "player-dash-error" : "player-dash-hint"} {...register("fortyYardDash", { valueAsNumber: true })} />
          </FormField>
          {hasDash && (
            <StatMeter label="Speed rating" score={dashToScore(dash)} averageScore={teamAverage?.speed} display={`${Math.round(dashToScore(dash))}/100`} />
          )}

          {SLIDER_METRICS.map(({ fieldName, id, metricKey, scoreKey }) => (
            <Controller
              key={fieldName}
              control={control}
              name={fieldName}
              render={({ field }) => {
                const value = Number.isFinite(field.value) ? field.value : 0;
                const unit = fieldName === "agility" ? "" : "%";
                const average = teamAverage ? Math.round(teamAverage[scoreKey]) : null;
                return (
                  <FormField
                    id={id}
                    label={`${metricLabels[metricKey].label}: ${value}${unit}`}
                    error={errorFor(fieldName)}
                    hint={average === null ? metricLabels[metricKey].hint : `${metricLabels[metricKey].hint} Team average: ${average}${unit}.`}
                  >
                    <Slider
                      id={id}
                      min={0}
                      max={100}
                      step={1}
                      value={[value]}
                      onValueChange={(next) => field.onChange(Array.isArray(next) ? next[0] : next)}
                      aria-label={metricLabels[metricKey].label}
                      className="py-2"
                    />
                  </FormField>
                );
              }}
            />
          ))}
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-3">
          <SectionLegend>Season performance</SectionLegend>
          {(
            [
              ["targets", "Targets"],
              ["receptions", "Receptions"],
              ["yards", "Yards"],
              ["flagPulls", "Flag pulls"],
              ["interceptions", "Interceptions"],
            ] as const
          ).map(([fieldName, label]) => (
            <FormField key={fieldName} id={`player-${fieldName}`} label={label} error={errorFor(fieldName)}>
              <Input id={`player-${fieldName}`} type="number" inputMode="numeric" aria-invalid={!!errors[fieldName]} aria-describedby={errors[fieldName] ? `player-${fieldName}-error` : undefined} {...register(fieldName, { valueAsNumber: true })} />
            </FormField>
          ))}
        </fieldset>
      </div>

      <DialogFooter className="sticky bottom-0 mx-0 mb-0 flex-row justify-end border-t border-border bg-popover px-5 py-3">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          {player ? "Save changes" : "Create player"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const PlayerFormDialog = ({ player, open, onOpenChange, onSaved, teamAverage }: PlayerFormDialogProps) => {
  const handleClose = (): void => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="sheet">
        <PlayerForm player={player} onClose={handleClose} onSaved={onSaved} teamAverage={teamAverage} />
      </DialogContent>
    </Dialog>
  );
};
