import { useState } from "react";
import { usableLevels, type Criterion } from "@/lib/grid";
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

export function CriterionRow({ cr }: { cr: Criterion }) {
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const uls = usableLevels(cr.summary.levels);
  const detailLevels = cr.detail ? usableLevels(cr.detail.levels) : {};
  const hasDetail = Object.keys(detailLevels).length > 0;
  return (
    <div className={`crit${open ? " open" : ""}`}>
      <div className="crit-head" onClick={() => setOpen((o) => !o)}>
        <span className="crit-name">{cr.criterion}</span>
        <div className="lvlrow">
          {Object.keys(uls).map((lv) => <ScoreTag key={lv} note={lv} className="lvltag" />)}
        </div>
      </div>
      {open && (
        <div className="crit-body">
          <LevelRows levels={uls} />
          {cr.summary.example && <div className="ex"><b>Exemple de projet :</b> {highlight(cr.summary.example)}</div>}
          {hasDetail && (
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
