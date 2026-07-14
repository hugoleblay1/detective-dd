import { useState } from "react";
import { usableLevels, type Criterion, type KeyQuestion, type MethodDefinition, type Note } from "@/lib/grid";
import { ScoreTag } from "./ScoreTag";
import { highlight, highlightDefs } from "./highlight";

function LevelRows({ levels, defs, onDef }: { levels: Record<string, string>; defs: MethodDefinition[]; onDef: (d: MethodDefinition) => void }) {
  return (
    <>
      {Object.keys(levels).map((lv) => (
        <div key={lv} className="lvl">
          <ScoreTag note={lv} className="lvltag tag" />
          <span className="txt">{highlightDefs(levels[lv], defs, onDef)}</span>
        </div>
      ))}
    </>
  );
}

/** Un critère. Si une note est visée (`note`), le corps se concentre sur elle :
 *  prérequis (+2/+3), exigence du niveau, questions de due diligence critère × note.
 *  Les termes du référentiel méthodologique sont cliquables (définition via onDef). */
export function CriterionRow({ cr, note, questions, prerequisite, defs, onDef }: {
  cr: Criterion; note: Note | null; questions: KeyQuestion[];
  prerequisite?: string | null; defs: MethodDefinition[]; onDef: (d: MethodDefinition) => void;
}) {
  const [open, setOpen] = useState(false);
  const [allLevels, setAllLevels] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const uls = usableLevels(cr.summary.levels);
  const detailLevels = cr.detail ? usableLevels(cr.detail.levels) : {};
  const hasDetail = Object.keys(detailLevels).length > 0;
  const focusTxt = note ? uls[note] ?? detailLevels[note] : undefined;
  const focused = note !== null && !allLevels;
  const showPrereq = focused && (note === "+2" || note === "+3") && !!prerequisite;
  return (
    <div className={`crit${open ? " open" : ""}`}>
      <div className="crit-head" onClick={() => setOpen((o) => !o)}>
        <span className="crit-name">{cr.criterion}</span>
        <div className="lvlrow">
          {Object.keys(uls).map((lv) => (
            <ScoreTag key={lv} note={lv} className="lvltag" style={note && lv !== note ? { opacity: 0.3 } : undefined} />
          ))}
        </div>
      </div>
      {open && (
        <div className="crit-body">
          {showPrereq && (
            <div className="prereq" style={{ margin: "8px 0 2px" }}>
              <span className="ptag">PRÉREQUIS +2/+3</span>
              <span className="ptxt">{highlightDefs(prerequisite, defs, onDef)}</span>
            </div>
          )}
          {focused ? (
            focusTxt ? (
              <div className="lvl">
                <ScoreTag note={note} className="lvltag tag" />
                <span className="txt">{highlightDefs(focusTxt, defs, onDef)}</span>
              </div>
            ) : (
              <div className="esg-note">Critère non mobilisable en {note} pour ce type d&apos;investissement.</div>
            )
          ) : (
            <LevelRows levels={uls} defs={defs} onDef={onDef} />
          )}
          {cr.summary.example && !focused && <div className="ex"><b>Exemple de projet :</b> {highlight(cr.summary.example)}</div>}
          {focused && questions.length > 0 && (
            <div className="qpanel">
              <div className="t">Questions de due diligence — {cr.criterion} · {note}</div>
              {questions.map((q, i) => (
                <div key={i} className="qp-it">
                  <span className="b">›</span>
                  <span>
                    {highlightDefs(q.question, defs, onDef)}
                    {q.ressources && <span className="qp-ress">Docs attendus : {q.ressources}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
          {focused && questions.length === 0 && focusTxt && (
            <div className="hint" style={{ marginTop: 8 }}>Aucune question de due diligence référencée pour ce critère à ce niveau.</div>
          )}
          {note !== null && (
            <div className="dtoggle" onClick={() => setAllLevels((v) => !v)}>
              <span className="pm">{allLevels ? "–" : "+"}</span> {allLevels ? "Revenir à la note visée" : "Voir tous les niveaux"}
            </div>
          )}
          {hasDetail && !focused && (
            <>
              <div className="dtoggle" onClick={() => setDetailOpen((d) => !d)}>
                <span className="pm">{detailOpen ? "–" : "+"}</span> Critères détaillés
              </div>
              {detailOpen && (
                <div className="crit-detail">
                  <LevelRows levels={detailLevels} defs={defs} onDef={onDef} />
                  {cr.detail?.example && <div className="ex"><b>Exemple de projet :</b> {highlight(cr.detail.example)}</div>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
