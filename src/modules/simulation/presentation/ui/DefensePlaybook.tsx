"use client";

import { useState, type ReactNode } from "react";
import { Eye, Hand } from "lucide-react";
import type { PlayerProfile } from "@/modules/roster";
import { PageHeading } from "@/shared/ui/layout/PageHeading";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { LabeledSelect } from "@/shared/ui/primitives/labeled-select";
import { DEFENSIVE_PLAYS, type CoverageAssignment, type DefensivePlay } from "../../domain/defensivePlays";
import type { SimulationMode } from "../../domain/types";
import { useRunDefensivePlay } from "../useRunDefensivePlay";
import { DefensePlayDiagram } from "./DefensePlayDiagram";

type DefensePlaybookProps = {
  /** Players who can line up at defensive back; the chosen one covers the receiver. */
  defenders: PlayerProfile[];
  /** Category switcher shown under the page heading. */
  tabs?: ReactNode;
};

type DefensePlayCardProps = Pick<DefensePlaybookProps, "defenders"> & { play: DefensivePlay };

const describeCoverage = (coverage: CoverageAssignment): string => (coverage.kind === "MAN" ? "Man" : "Zone");

const DefensePlayCard = ({ play, defenders }: DefensePlayCardProps) => {
  const runDefensivePlay = useRunDefensivePlay();
  const [selectedDefenderId, setSelectedDefenderId] = useState<string | null>(null);
  const defenderId = selectedDefenderId ?? defenders[0]?.id ?? null;

  const handleRun = (mode: SimulationMode) => (): void => runDefensivePlay(play.id, defenderId, mode);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-raised transition-[transform,box-shadow] duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-overlay">
      <div className="bg-stage p-3">
        <DefensePlayDiagram play={play} className="mx-auto h-48 rounded-md" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-title font-semibold uppercase tracking-wide text-foreground">{play.name}</h3>
          <div className="flex flex-wrap justify-end gap-1">
            <Badge variant="info">CB {describeCoverage(play.cornerback.coverage)}</Badge>
            <Badge variant="neutral">S {describeCoverage(play.safety.coverage)}</Badge>
            <Badge variant={play.rusher.delaySec <= 0.8 ? "danger" : "outline"}>Rush {play.rusher.delaySec.toFixed(1)}s</Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{play.blurb}</p>

        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
          <LabeledSelect
            id={`defender-${play.id}`}
            label="Cornerback"
            value={defenderId}
            options={defenders.map((candidate) => ({ value: candidate.id, label: `#${candidate.jerseyNumber} ${candidate.name}` }))}
            onChange={setSelectedDefenderId}
            placeholder={defenders.length === 0 ? "No defenders on the roster" : "Choose a cornerback"}
            disabled={defenders.length === 0}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleRun("VIEW")} disabled={!defenderId}>
              <Eye aria-hidden="true" />
              Watch
            </Button>
            <Button onClick={handleRun("TACTICAL")} disabled={!defenderId}>
              <Hand aria-hidden="true" />
              Run live
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

/** Defensive half of the playbook. "Run live" lets the user make defensive calls while the offense plays itself. */
export const DefensePlaybook = ({ defenders, tabs }: DefensePlaybookProps) => (
  <>
    <PageHeading
      eyebrow="Team"
      title="Playbook"
      count={DEFENSIVE_PLAYS.length}
      description="Defensive plays. Dashed lines are man coverage, rings are zones, the arrow is the rush. Run one live to call it yourself."
    />
    <div className="flex flex-col gap-4 px-4 pb-8 md:px-8">
      {tabs}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" aria-label="Defensive plays">
        {DEFENSIVE_PLAYS.map((play) => (
          <li key={play.id} className="flex animate-fade-in flex-col [&>article]:flex-1">
            <DefensePlayCard play={play} defenders={defenders} />
          </li>
        ))}
      </ul>
    </div>
  </>
);
