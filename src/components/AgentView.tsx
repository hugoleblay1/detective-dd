import { useState } from "react";
import { critsForNote, type DimKey, type Note, type SectorGrid } from "@/lib/grid";
import type { ClientDoc, DimAnalysis } from "@/lib/gap/types";
import { TargetsEditor, type NoteT, type Targets } from "./TargetsEditor";
import { DocsEditor } from "./DocsEditor";
import { GapResults } from "./GapResults";

export function AgentView({ grid, sub, geo }: { grid: SectorGrid; sub: string; geo: string }) {
  const [dealText, setDealText] = useState("");
  const [docs, setDocs] = useState<ClientDoc[]>([]);
  const [targets, setTargets] = useState<Targets>({});
  const [busy, setBusy] = useState(false);
  const [analyses, setAnalyses] = useState<DimAnalysis[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setNote(dk: DimKey, note: NoteT | null) {
    setTargets((prev) => {
      const next = { ...prev };
      if (!note) { delete next[dk]; return next; }
      const pool = critsForNote(grid, sub, dk, note as Note);
      next[dk] = { note, crit: pool.length >= 1 ? pool[0] : null };
      return next;
    });
  }
  function setCrit(dk: DimKey, crit: string) {
    setTargets((prev) => (prev[dk] ? { ...prev, [dk]: { ...prev[dk]!, crit } } : prev));
  }

  const hasTargets = Object.keys(targets).length > 0;

  async function analyze() {
    if (!hasTargets || busy) return;
    setBusy(true); setError(null); setAnalyses(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ sector: grid.sector, subtype: sub, geo, dealText, targets, docs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Échec de l'analyse (" + res.status + ").");
      setAnalyses(data.analyses as DimAnalysis[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content">
      <div className="card agent">
        <div className="step">
          <div className="sh"><span className="num">1</span><span className="t">Dossier &amp; notes visées</span><span className="s">{sub} · {geo}</span></div>
          <textarea value={dealText} onChange={(e) => setDealText(e.target.value)}
            placeholder="Décrivez le dossier : client, projet, business model, éléments DD connus…" />
          <TargetsEditor grid={grid} sub={sub} targets={targets} onSetNote={setNote} onSetCrit={setCrit} />
        </div>
        <div className="step">
          <div className="sh"><span className="num">2</span><span className="t">Documents du client</span><span className="s">rapports ESG, business plan, certifications…</span></div>
          <DocsEditor docs={docs} onAdd={(d) => setDocs((prev) => [...prev, d])} onRemove={(i) => setDocs((prev) => prev.filter((_, k) => k !== i))} />
        </div>
        <div className="step">
          <div className="sh"><span className="num">3</span><span className="t">Analyse d&apos;écart</span><span className="s">critères exigés · questions couvertes · informations à redemander</span></div>
          <div className="arow">
            <span className="hint">L&apos;agent ne propose jamais de note : il vérifie la couverture pour la note que <b>vous</b> visez.</span>
            <button className="btn" onClick={analyze} disabled={!hasTargets || busy}>{busy ? "Analyse en cours…" : "Analyser le dossier"}</button>
          </div>
          {error && <div className="gap-error" style={{ margin: "12px 0 0" }}><b>Erreur :</b> {error}</div>}
          {busy && <div className="placeholder">Analyse de la couverture, dimension par dimension…</div>}
          {!busy && !error && !analyses && <div className="placeholder">Sélectionnez au moins une note visée, ajoutez vos éléments, puis lancez l&apos;analyse.</div>}
          {!busy && analyses && (analyses.length ? <GapResults grid={grid} sub={sub} geo={geo} analyses={analyses} /> : <div className="placeholder">Aucune dimension analysée.</div>)}
        </div>
      </div>
    </div>
  );
}
