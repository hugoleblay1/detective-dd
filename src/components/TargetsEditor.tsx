import { critsForNote, type DimKey, type Note, type SectorGrid } from "@/lib/grid";

export type NoteT = "+1" | "+2" | "+3";
export type Targets = Partial<Record<DimKey, { note: NoteT; crit: string | null }>>;
const ALL_DIMS: DimKey[] = ["Atténuation", "Adaptation", "Social", "Genre", "Biodiversité"];
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
    <div style={{ marginTop: 12 }}>
      {ALL_DIMS.map((dk) => {
        const t = targets[dk];
        const pool = t ? critsForNote(grid, sub, dk, t.note as Note) : [];
        return (
          <div key={dk}>
            <div className="target-row">
              <span className="dn">{dk}</span>
              <div className="seg mini">
                <button className={!t ? "on" : ""} onClick={() => onSetNote(dk, null)}>—</button>
                {NOTES.map((n) => (
                  <button key={n} className={t?.note === n ? "on" : ""} onClick={() => onSetNote(dk, n)}>{n}</button>
                ))}
              </div>
              <span className="hint">note visée</span>
            </div>
            {t && pool.length > 1 && (
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
        <div className="hint">
          Un seul critère au niveau visé suffit (+ prérequis). Les questions sont filtrées : générales + propres au critère visé.
        </div>
      )}
    </div>
  );
}
