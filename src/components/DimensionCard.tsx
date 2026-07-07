import React, { useState } from "react";
import { critExcluded, dimKeyOf, naList, singleNoteCrits, type Dimension, type SectorGrid } from "@/lib/grid";
import type { LibraryDoc } from "@/lib/library";
import { ScoreTag } from "./ScoreTag";
import { CriterionRow } from "./CriterionRow";
import { ContextLinks } from "./ContextLinks";
import { highlight } from "./highlight";

function pillClass(p: string) {
  const s = (p || "").toLowerCase();
  if (s.startsWith("plan") || s.startsWith("biodiv") || s.startsWith("climat")) return "pill-planete";
  if (s.startsWith("incl") || s.startsWith("social")) return "pill-social";
  if (s.startsWith("genre")) return "pill-genre";
  return "pill-planete";
}

export function DimensionCard({ grid, subtype, geo, dim, defaultOpen, libDocs }: {
  grid: SectorGrid; subtype: string; geo: string; dim: Dimension; defaultOpen: boolean; libDocs: LibraryDoc[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const dk = dimKeyOf(dim.dimension);
  const naL = dk ? naList(grid, subtype, dk) : [];
  const snc = dk ? singleNoteCrits(grid, subtype, dk) : [];
  const visibleCrits = dim.criteria.filter((c) => !critExcluded(c));
  const sncByNote = new Map<string, string[]>();
  for (const x of snc) sncByNote.set(x.note, [...(sncByNote.get(x.note) ?? []), x.crit]);
  return (
    <div className={`card dim${open ? " open" : ""}`}>
      <div className="dim-head" onClick={() => setOpen((o) => !o)}>
        <span className={`dim-pillar ${pillClass(dim.pillar)}`}>{dim.pillar}</span>
        <span className="dim-name">{dim.dimension}</span>
        <span className="dim-toggle">▶</span>
      </div>
      {open && (
        <div className="dim-body">
          {dim.prerequisite && (
            <div className="prereq">
              <span className="ptag">PRÉREQUIS +2/+3</span>
              <span className="ptxt">{highlight(dim.prerequisite)}</span>
            </div>
          )}
          {(naL.length > 0 || snc.length > 0) && (
            <div className="na-note">
              {naL.length > 0 && (
                <>
                  <span className="t">Critères non mobilisables — {subtype}</span>
                  {naL.map((x) => <span key={x.crit} className="item"><b>{x.crit}</b> — {highlight(x.expl)}</span>)}
                </>
              )}
              {snc.length > 0 && (
                <>
                  {naL.length === 0 && <span className="t">Périmètre des critères — {subtype}</span>}
                  {[...sncByNote.entries()].map(([note, crits], gi) => (
                    <span key={note} className="item" style={{ marginTop: naL.length || gi > 0 ? 6 : 0 }}>
                      Mobilisables uniquement en <b>{note}</b> : {crits.map((cr, i) => (
                        <React.Fragment key={cr}>{i > 0 ? ", " : ""}<b>{cr}</b></React.Fragment>
                      ))}.
                    </span>
                  ))}
                </>
              )}
            </div>
          )}
          {dim.objective && <div className="obj">{highlight(dim.objective)}</div>}
          {dim.criteria.length > 0 && (
            <div className="scale">
              {dim.scale.map((s) => (
                <ScoreTag key={s} note={s} className="sbox" style={{ minWidth: 34, fontSize: 13, padding: "5px 0" }} />
              ))}
            </div>
          )}
          {visibleCrits.map((cr) => <CriterionRow key={cr.criterion} cr={cr} />)}
          {dim.criteria.length === 0 && <div className="esg-note">Dimension renvoyée à l&apos;analyse ESG pour ce secteur.</div>}
          <ContextLinks dk={dk} geo={geo} libDocs={libDocs} />
        </div>
      )}
    </div>
  );
}
