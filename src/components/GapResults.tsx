import { dimObj, type SectorGrid } from "@/lib/grid";
import type { DimAnalysis, TDimSynthesis } from "@/lib/gap/types";
import { scoreStyle } from "./ScoreTag";
import { highlight } from "./highlight";

const STATUT = {
  repondu: { row: "r-ok", badge: "v-ok", label: "Répondu" },
  partiel: { row: "r-mid", badge: "v-mid", label: "Partiel" },
  manquant: { row: "r-ko", badge: "v-ko", label: "Manquant" },
} as const;

// Complétude DOCUMENTAIRE du dossier au regard de la note visée — jamais une note (règle 1).
const MATURITE = {
  complet: { cls: "m-ok", label: "Dossier complet au regard de la note visée" },
  partiel: { cls: "m-mid", label: "Dossier partiel au regard de la note visée" },
  insuffisant: { cls: "m-ko", label: "Dossier insuffisant au regard de la note visée" },
} as const;

function Cite({ txt }: { txt?: string }) {
  if (!txt) return null;
  return <div className="src synth-cite">{txt}</div>;
}

function SynthBlock({ s }: { s: TDimSynthesis }) {
  const m = MATURITE[s.maturite.niveau];
  return (
    <div className="gap-synth">
      <div className={`synth-head ${m.cls}`}>
        <span className="dot" /><b>{m.label}</b>
      </div>
      {s.maturite.justification && <div className="synth-just">{s.maturite.justification}</div>}
      {(s.forces.length > 0 || s.faiblesses.length > 0) && (
        <div className="synth-cols">
          <div className="synth-col">
            <div className="h">Forces du dossier</div>
            {s.forces.length ? s.forces.map((f, i) => (
              <div key={i} className="synth-it ok"><span className="mk">✓</span><span>{f.point}<Cite txt={f.citation} /></span></div>
            )) : <div className="src">—</div>}
          </div>
          <div className="synth-col">
            <div className="h">Faiblesses</div>
            {s.faiblesses.length ? s.faiblesses.map((f, i) => (
              <div key={i} className="synth-it ko"><span className="mk">⚠</span><span>{f.point}<Cite txt={f.citation} /></span></div>
            )) : <div className="src">—</div>}
          </div>
        </div>
      )}
      {s.a_obtenir.length > 0 && (
        <div className="synth-obtenir">
          <div className="h">À obtenir du client</div>
          {s.a_obtenir.map((x, i) => (
            <div key={i} className="it"><span className="b">›</span><span>{x}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ items }: { items: string[] }) {
  if (!items.length) return <span className="src">—</span>;
  return <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}

export function GapResults({ grid, sub, geo, analyses }: { grid: SectorGrid; sub: string; geo: string; analyses: DimAnalysis[] }) {
  const allIA = analyses.every((a) => a.engine === "ia");
  const noneIA = analyses.every((a) => a.engine === "erreur");
  const flag = allIA ? "Agent IA — lecture contextuelle"
    : noneIA ? "Moteur indisponible — voir erreurs par dimension"
    : "Moteur mixte — voir chaque dimension";
  const ask = analyses.flatMap((a) => a.result.a_redemander.map((txt) => ({ dim: a.dim, txt })));
  const seen = new Set<string>();
  const askDedup = ask.filter((a) => { const k = a.dim + "|" + a.txt; if (seen.has(k)) return false; seen.add(k); return true; });

  return (
    <div className="results">
      <div className="res-section">
        <h4>Couverture <span className="src-flag">{flag}</span></h4>
      </div>
      {analyses.map((a) => {
        const fullName = dimObj(grid, sub, a.dim)?.dimension ?? a.dim;
        return (
          <div key={a.dim} className="gap-dim">
            <div className="gap-head">
              <span className="gn">{fullName}{a.crit ? ` · critère « ${a.crit} »` : ""}</span>
              <span className="src-flag" style={a.engine === "erreur" ? { color: "var(--ko)" } : undefined}>
                {a.engine === "ia" ? "IA" : "erreur"}
              </span>
              <span className="lvltag" style={{ ...scoreStyle(a.note), fontSize: 12, padding: "3px 9px" }}>note visée {a.note}</span>
            </div>
            {a.synthesis && <SynthBlock s={a.synthesis} />}
            {!a.synthesis && a.synthesisError && a.engine !== "erreur" && (
              <div className="synth-err">Avis qualitatif indisponible — {a.synthesisError}</div>
            )}
            {a.exigence && (
              <div className="gap-exig"><b>Exigence :</b>{"\n"}{highlight(a.exigence.slice(0, 800))}{a.exigence.length > 800 ? "…" : ""}</div>
            )}
            {a.context.length > 0 && (
              <div className="ctx-summary">
                <div className="h">Résumé contextuel{geo.trim() ? ` — ${geo.trim()}` : ""} · sources officielles</div>
                <div className="ctx-grid">
                  {a.context.map((c) => (
                    <a key={c.label} className="ctx-src" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <div className="nm">{c.value}{c.unit}</div>
                      <div className="ds">{c.label} · {c.source}{c.year ? ` ${c.year}` : ""} ↗</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {a.library.length > 0 && (
              <div className="hint" style={{ margin: "8px 15px 0" }}>
                📚 Bibliothèque IMP mobilisée : {a.library.map((l) =>
                  `${l.title}${l.pages.length ? ` (p.${l.pages.join(", ")})` : ""}`).join(" · ")}
              </div>
            )}
            {a.libraryNotIndexed && a.libraryNotIndexed.length > 0 && (
              <div className="hint" style={{ margin: "8px 15px 0", color: "#8a5a00" }}>
                ⏳ {a.libraryNotIndexed.length} document(s) de la bibliothèque pas encore lisible(s) par l&apos;IA (indexation requise) : {a.libraryNotIndexed.join(" · ")}
              </div>
            )}
            {a.libraryError && (
              <div className="hint" style={{ margin: "8px 15px 0", color: "var(--ko)" }}>
                Recherche bibliothèque IMP en échec — extraits non injectés ({a.libraryError.slice(0, 120)})
              </div>
            )}
            {a.engine === "erreur" ? (
              <div className="gap-error">
                <b>Analyse indisponible pour cette dimension.</b> {a.error ?? "Échec du moteur."}
                {a.questions.length > 0 && (
                  <div className="hint" style={{ marginTop: 8 }}>
                    Questions non évaluées :
                    <ul>{a.questions.map((q) => <li key={q.id}>{q.q.split("\n")[0]}</li>)}</ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="tscroll" style={{ margin: "12px 15px 15px" }}>
                <table className="gaptable">
                  <thead><tr>
                    <th style={{ width: 86 }}>Statut</th>
                    <th style={{ width: "32%" }}>Question</th>
                    <th>Éléments disponibles</th>
                    <th>Éléments manquants / à demander</th>
                  </tr></thead>
                  <tbody>
                    {a.result.verdicts.map((v) => {
                      const q = a.questions.find((x) => x.id === v.id);
                      if (!q) return null;
                      const s = STATUT[v.statut];
                      return (
                        <tr key={v.id} className={s.row}>
                          <td><span className={`vbadge ${s.badge}`}>{s.label}</span></td>
                          <td className="qcell">{highlight(q.q.split("\n")[0])}</td>
                          <td><Cell items={v.disponibles} /></td>
                          <td><Cell items={v.manquants} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
      {askDedup.length > 0 && (
        <div className="ask">
          <h5>À redemander au client</h5>
          {askDedup.map((a, i) => (
            <div key={i} className="it"><span className="b">›</span><span><b>{a.dim}</b> — {a.txt}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
