import React, { useState } from "react";
import { critExcluded, defsForDim, dimKeyOf, naList, questionsFor, singleNoteCrits, type Dimension, type MethodDefinition, type Note, type SectorGrid } from "@/lib/grid";
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

export function DimensionCard({ grid, subtype, geo, dim, defaultOpen, libDocs, defs }: {
  grid: SectorGrid; subtype: string; geo: string; dim: Dimension; defaultOpen: boolean; libDocs: LibraryDoc[]; defs: MethodDefinition[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Note visée : filtre les critères et leurs questions sur ce niveau (+2 = la
  // note qui qualifie, par défaut). null = tous les niveaux, comme avant.
  const [note, setNote] = useState<Note | null>(dim.scale.includes("+2") ? "+2" : null);
  const dk = dimKeyOf(dim.dimension);
  const dimDefs = dk ? defsForDim(defs, dk) : [];
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
          {dimDefs.length > 0 && (
            <div className="na-note" style={{ background: "#f4f6fb", borderColor: "#c9d4ea" }}>
              <span className="t">Définitions méthodologiques — référentiel appliqué à l&apos;analyse</span>
              {dimDefs.map((d) => (
                <span key={d.terme} className="item" style={{ whiteSpace: "pre-line" }}>
                  <b>{d.terme}</b> — {d.definition}
                </span>
              ))}
            </div>
          )}
          {dim.criteria.length > 0 && (
            <div className="scale-pick">
              <div className="scale" style={{ margin: 0 }}>
                {dim.scale.map((s) => (
                  <ScoreTag key={s} note={s} className={"sbox pickable" + (note === s ? " picked" : "")}
                    style={{ minWidth: 34, fontSize: 13, padding: "5px 0", ...(note && note !== s ? { opacity: 0.35 } : {}) }}
                    onClick={() => setNote(note === (s as Note) ? null : (s as Note))} />
                ))}
              </div>
              <span className="hint">
                {note ? <>note visée <b>{note}</b> — critères et questions filtrés sur ce niveau (cliquer à nouveau pour tout voir)</>
                  : "cliquez une note pour filtrer les critères et leurs questions"}
              </span>
            </div>
          )}
          {visibleCrits.map((cr) => (
            <CriterionRow key={cr.criterion} cr={cr} note={note}
              questions={dk && note ? questionsFor(grid, subtype, dk, cr.criterion, note) : []} />
          ))}
          {dim.criteria.length === 0 && <div className="esg-note">Dimension renvoyée à l&apos;analyse ESG pour ce secteur.</div>}
          <ContextLinks dk={dk} geo={geo} libDocs={libDocs} />
        </div>
      )}
    </div>
  );
}
