import { useEffect, useRef, useState } from "react";
import { critsForNote, type DimKey, type Note, type SectorGrid } from "@/lib/grid";
import type { ClientDoc, DimAnalysis } from "@/lib/gap/types";
import type { AgentPhase } from "./AppShell";
import { GEO_PRESETS } from "./ControlBar";
import { TargetsEditor, type NoteT, type Targets } from "./TargetsEditor";
import { DocsEditor } from "./DocsEditor";
import { GapResults } from "./GapResults";

export function AgentView({ grid, sub, geo, subtypes, onSub, onGeo, onPhase }: {
  grid: SectorGrid; sub: string; geo: string; subtypes: string[];
  onSub: (s: string) => void; onGeo: (g: string) => void;
  onPhase: (p: AgentPhase) => void;
}) {
  const [dealText, setDealText] = useState("");
  const [docs, setDocs] = useState<ClientDoc[]>([]);
  const [targets, setTargets] = useState<Targets>({});
  const [busy, setBusy] = useState(false);
  const [analyses, setAnalyses] = useState<DimAnalysis[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Une fois l'analyse rendue, le formulaire se replie : les résultats occupent l'écran.
  const [formOpen, setFormOpen] = useState(true);
  // Progression visuelle de l'écran d'analyse (l'API répond en une fois : le
  // dernier pas reste actif tant que la réponse n'est pas arrivée).
  const [anaStep, setAnaStep] = useState(0);
  const anaTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase: AgentPhase = busy ? "analyse" : analyses && !formOpen ? "resultats" : "description";
  useEffect(() => { onPhase(phase); }, [phase, onPhase]);
  useEffect(() => () => { if (anaTimer.current) clearInterval(anaTimer.current); }, []);

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

  const targetEntries = Object.entries(targets) as [DimKey, { note: NoteT; crit: string | null }][];
  const hasTargets = targetEntries.length > 0;
  const targetSummary = targetEntries.map(([dk, t]) => `${dk} ${t.note}${t.crit ? ` (${t.crit})` : ""}`).join(" · ");

  // Étapes réelles du moteur (lecture, grille, une vérification par dimension visée, rédaction).
  const anaSteps = [
    { label: "Lecture des documents du dossier", detail: docs.length ? docs.map((d) => d.name).join(" · ") : "aucun document fourni" },
    { label: `Chargement de la grille sectorielle ${sub}`, detail: "grille publiée depuis l'Excel maître (source de vérité)" },
    ...targetEntries.map(([dk, t]) => ({ label: `Vérification des exigences · ${dk}`, detail: `recherche des preuves pour la note visée ${t.note}` })),
    { label: "Rédaction des constats et des citations", detail: "chaque constat est relié à un document, page à l'appui" },
  ];

  async function analyze() {
    if (!hasTargets || busy) return;
    setBusy(true); setError(null); setAnalyses(null); setAnaStep(0);
    anaTimer.current = setInterval(() => {
      setAnaStep((s) => Math.min(s + 1, anaSteps.length - 1));
    }, 1400);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ sector: grid.sector, subtype: sub, geo, dealText, targets, docs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Échec de l'analyse (" + res.status + ").");
      setAnalyses(data.analyses as DimAnalysis[]);
      setFormOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (anaTimer.current) { clearInterval(anaTimer.current); anaTimer.current = null; }
      setBusy(false);
    }
  }

  if (busy) {
    const pct = Math.min(100, Math.round((100 * (anaStep + 0.6)) / anaSteps.length));
    return (
      <div className="ana-wrap">
        <div className="ana-card">
          <div>
            <div className="ana-title">Analyse en cours…</div>
            <div className="ana-sub">{sub} · {geo} · {targetEntries.length} dimension{targetEntries.length > 1 ? "s" : ""} visée{targetEntries.length > 1 ? "s" : ""} · {docs.length} document{docs.length > 1 ? "s" : ""}</div>
          </div>
          <div className="ana-bar"><i style={{ width: `${pct}%` }} /></div>
          <div className="ana-steps">
            {anaSteps.map((s, i) => {
              const st = i < anaStep ? "done" : i === anaStep ? "active" : "pending";
              return (
                <div key={i} className={`ana-step ${st}`}>
                  {st === "done" && <span className="ana-ic-done">✓</span>}
                  {st === "active" && <span className="ana-spin" />}
                  {st === "pending" && <span className="ana-ic-pending" />}
                  <div>
                    <div className="l">{s.label}</div>
                    {st === "active" && <div className="d">{s.detail}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="ana-foot">Chaque constat sera appuyé par une citation de vos documents (« document, p. X »). L&apos;outil ne propose jamais de note.</div>
        </div>
      </div>
    );
  }

  if (analyses && !formOpen) {
    return (
      <div className="content">
        <div className="deal-summary">
          <div className="ds-main">
            <b>{sub} · {geo}</b>
            <span>{targetSummary || "aucune note visée"}</span>
            <span>{docs.length} document{docs.length > 1 ? "s" : ""} client</span>
            {dealText.trim() && <span className="ds-desc">« {dealText.trim().slice(0, 90)}{dealText.trim().length > 90 ? "…" : ""} »</span>}
          </div>
          <div className="ds-actions">
            <button className="btn ghost small" onClick={() => setFormOpen(true)}>↺ Modifier le dossier et relancer</button>
          </div>
        </div>
        {error && <div className="gap-error" style={{ margin: "12px 0 0" }}><b>Erreur :</b> {error}</div>}
        {analyses.length ? <GapResults grid={grid} sub={sub} geo={geo} analyses={analyses} /> : <div className="placeholder">Aucune dimension analysée.</div>}
      </div>
    );
  }

  return (
    <div className="dossier">
      <div className="dcard">
        <div className="dcard-h"><span className="t">Votre dossier</span><span className="s">type d&apos;investissement, pays, contexte</span></div>
        <div className="frow">
          <div className="fgroup">
            <span className="flabel">Type d&apos;investissement</span>
            <div className="segjoin">
              {subtypes.map((s) => (
                <button key={s} className={s === sub ? "on" : ""} onClick={() => onSub(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="flabel">Géographie du projet</span>
            <div className="gchips">
              {GEO_PRESETS.map((g) => (
                <span key={g} className={"gchip" + (geo === g ? " on" : "")} onClick={() => onGeo(g)}>{g}</span>
              ))}
              <input value={GEO_PRESETS.includes(geo) ? "" : geo} placeholder="autre pays…"
                onChange={(e) => onGeo(e.target.value)} style={{ width: 130 }} type="text" />
            </div>
          </div>
        </div>
        <div className="fgroup">
          <span className="flabel">Description libre <span className="opt">(facultatif)</span></span>
          <textarea value={dealText} onChange={(e) => setDealText(e.target.value)}
            placeholder="Décrivez le dossier : client, projet, business model, éléments DD connus…" />
        </div>
      </div>

      <div className="dcard">
        <div className="dcard-h">
          <span className="t">Notes visées par dimension</span>
          <span className="s">l&apos;analyse vérifie la couverture pour la note que <b>vous</b> visez</span>
        </div>
        <TargetsEditor grid={grid} sub={sub} targets={targets} onSetNote={setNote} onSetCrit={setCrit} />
      </div>

      <div className="dcard">
        <div className="dcard-h"><span className="t">Documents du client</span><span className="s">rapports ESG, business plan, études, certifications…</span></div>
        <DocsEditor docs={docs} onAdd={(d) => setDocs((prev) => [...prev, d])} onRemove={(i) => setDocs((prev) => prev.filter((_, k) => k !== i))} />
      </div>

      {error && <div className="gap-error"><b>Erreur :</b> {error}</div>}

      <div className="ctabar">
        <div className="inner">
          <div className="cta-hint">
            {hasTargets
              ? `L'analyse vérifiera la couverture pour ${targetEntries.length} note${targetEntries.length > 1 ? "s" : ""} visée${targetEntries.length > 1 ? "s" : ""}, sur la base de ${docs.length} document${docs.length > 1 ? "s" : ""}. L'agent ne propose jamais de note : il vérifie la couverture pour la note que vous visez.`
              : "Sélectionnez au moins une note visée pour lancer l'analyse."}
          </div>
          <button className="btn" onClick={analyze} disabled={!hasTargets}>Analyser le dossier →</button>
        </div>
      </div>
    </div>
  );
}
