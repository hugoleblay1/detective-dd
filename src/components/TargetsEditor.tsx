import { critsForNote, type DimKey, type Note, type SectorGrid } from "@/lib/grid";
import { DIMS_EXCLUDED_FROM_ANALYSIS } from "@/lib/gap/types";

export type NoteT = "+1" | "+2" | "+3";
export type Targets = Partial<Record<DimKey, { note: NoteT; crit: string | null }>>;
export const ALL_DIMS: DimKey[] = ["Atténuation", "Adaptation", "Social", "Genre", "Biodiversité"];
const NOTES: NoteT[] = ["+1", "+2", "+3"];

export function TargetsEditor({ grid, sub, targets, onSetNote, onSetCrit }: {
  grid: SectorGrid; sub: string; targets: Targets;
  onSetNote: (dk: DimKey, note: NoteT | null) => void;
  onSetCrit: (dk: DimKey, crit: string) => void;
}) {
  const anyMulti = ALL_DIMS.some((dk) => {
    const t = targets[dk];
    return t && critsForNote(grid, sub, dk, t.note as Note).length > 1;
  });
  return (
    <div>
      {ALL_DIMS.map((dk) => {
        if (DIMS_EXCLUDED_FROM_ANALYSIS.includes(dk)) {
          return (
            <div key={dk} className="nrow">
              <span className="dn" style={{ color: "var(--color-muted)" }}>{dk}</span>
              <span className="excl">évalué via le questionnaire et l&apos;outil Genre dédiés — hors de cette analyse pour le moment</span>
            </div>
          );
        }
        const t = targets[dk];
        const pool = t ? critsForNote(grid, sub, dk, t.note as Note) : [];
        return (
          <div key={dk}>
            <div className="nrow">
              <span className="dn">{dk}</span>
              <div className="nopts">
                <button className={!t ? "on" : ""} onClick={() => onSetNote(dk, null)}>—</button>
                {NOTES.map((n) => (
                  <button key={n} className={(t?.note === n ? "on" : "") + (t?.note === n && n === "+2" ? " gold" : "")}
                    onClick={() => onSetNote(dk, n)}>{n}</button>
                ))}
              </div>
              <span className={"nhint " + (t ? "set" : "unset")}>{t ? `note visée : ${t.note}` : "pas de note visée"}</span>
            </div>
            {t && pool.length >= 1 && (
              <div className="crit-pick">
                <span className="lbl">Critère visé</span>
                {pool.map((cn) => (
                  <span key={cn} className={"chip" + (t.crit === cn ? " on" : "")} onClick={() => onSetCrit(dk, cn)}>{cn}</span>
                ))}
              </div>
            )}
            {t && pool.length === 0 && (
              <div className="crit-pick">
                <span className="hint">Aucun critère mobilisable à ce niveau pour ce type d&apos;investissement.</span>
              </div>
            )}
          </div>
        );
      })}
      {anyMulti && (
        <div className="hint" style={{ marginTop: 8 }}>
          Un seul critère au niveau visé suffit (+ prérequis). Les questions sont filtrées : générales + propres au critère visé.
        </div>
      )}
    </div>
  );
}
