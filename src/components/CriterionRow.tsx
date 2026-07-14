import { useState } from "react";
import { usableLevels, type Criterion, type KeyQuestion, type Note } from "@/lib/grid";
import { ScoreTag } from "./ScoreTag";
import { highlight } from "./highlight";

function LevelRows({ levels }: { levels: Record<string, string> }) {
  return (
    <>
      {Object.keys(levels).map((lv) => (
        <div key={lv} className="lvl">
          <ScoreTag note={lv} className="lvltag tag" />
          <span className="txt">{highlight(levels[lv])}</span>
        </div>
      ))}
    </>
  );
}

/** Un critère. Si une note est visée (`note`), le corps se concentre sur elle :
 *  exigence du niveau + questions de due diligence filtrées critère × note. */
export function CriterionRow({ cr, note, questions }: { cr: Criterion; note: Note | null; questions: KeyQuestion[] }) {
  const [open, setOpen] = useState(false);
  const [allLevels, setAllLevels] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const uls = usableLevels(cr.summary.levels);
  const detailLevels = cr.detail ? usableLevels(cr.detail.levels) : {};
  const hasDetail = Object.keys(detailLevels).length > 0;
  const focusTxt = note ? uls[note] ?? detailLevels[note] : undefined;
  const focused = note !== null && !allLevels;
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
          {focused ? (
            focusTxt ? (
              <div className="lvl">
                <ScoreTag note={note} className="lvltag tag" />
                <span className="txt">{highlight(focusTxt)}</span>
              </div>
            ) : (
              <div className="esg-note">Critère non mobilisable en {note} pour ce type d&apos;investissement.</div>
            )
          ) : (
            <LevelRows levels={uls} />
          )}
          {cr.summary.example && !focused && <div className="ex"><b>Exemple de projet :</b> {highlight(cr.summary.example)}</div>}
          {focused && questions.length > 0 && (
            <div className="qpanel">
              <div className="t">Questions de due diligence — {cr.criterion} · {note}</div>
              {questions.map((q, i) => (
                <div key={i} className="qp-it">
                  <span className="b">›</span>
                  <span>
                    {highlight(q.question)}
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
                  <LevelRows levels={detailLevels} />
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
