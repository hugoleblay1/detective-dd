import { useState } from "react";
import { dimObj, type SectorGrid } from "@/lib/grid";
import type { DimAnalysis, TDimSynthesis, TVerdict } from "@/lib/gap/types";
import { scoreStyle } from "./ScoreTag";
import { highlight } from "./highlight";

const STATUT = {
  repondu: { row: "r-ok", badge: "v-ok", label: "Répondu" },
  partiel: { row: "r-mid", badge: "v-mid", label: "Partiel" },
  manquant: { row: "r-ko", badge: "v-ko", label: "Manquant" },
} as const;
type Statut = keyof typeof STATUT;
const STATUTS: Statut[] = ["manquant", "partiel", "repondu"];

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

const countBy = (verdicts: TVerdict[]) => {
  const c: Record<Statut, number> = { repondu: 0, partiel: 0, manquant: 0 };
  verdicts.forEach((v) => { if (v.statut in c) c[v.statut as Statut]++; });
  return c;
};

export function GapResults({ grid, sub, geo, analyses }: { grid: SectorGrid; sub: string; geo: string; analyses: DimAnalysis[] }) {
  // Une seule dimension → ouverte d'office ; plusieurs → le bandeau sert de sommaire.
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => (analyses.length === 1 ? { [analyses[0].dim]: true } : {}));
  const [detail, setDetail] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Statut | null>(null);

  const allIA = analyses.every((a) => a.engine === "ia");
  const noneIA = analyses.every((a) => a.engine === "erreur");
  const flag = allIA ? "Agent IA — lecture contextuelle"
    : noneIA ? "Moteur indisponible — voir erreurs par dimension"
    : "Moteur mixte — voir chaque dimension";
  const ask = analyses.flatMap((a) => a.result.a_redemander.map((txt) => ({ dim: a.dim, txt })));
  const seen = new Set<string>();
  const askDedup = ask.filter((a) => { const k = a.dim + "|" + a.txt; if (seen.has(k)) return false; seen.add(k); return true; });
  const totals = countBy(analyses.flatMap((a) => a.result.verdicts));

  function jumpTo(dim: string) {
    setOpen((p) => ({ ...p, [dim]: true }));
    // Après le rendu de la dimension dépliée, on l'amène à l'écran.
    requestAnimationFrame(() => document.getElementById(`gap-dim-${dim}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="results">
      <div className="res-section">
        <h4>Couverture <span className="src-flag">{flag}</span></h4>
      </div>

      {/* Sommaire : une ligne par dimension, cliquable, + filtre de statut global. */}
      <div className="covband">
        {analyses.map((a) => {
          const c = countBy(a.result.verdicts);
          const m = a.synthesis ? MATURITE[a.synthesis.maturite.niveau] : null;
          const fullName = dimObj(grid, sub, a.dim)?.dimension ?? a.dim;
          return (
            <div key={a.dim} className="covrow" onClick={() => (open[a.dim] ? setOpen((p) => ({ ...p, [a.dim]: false })) : jumpTo(a.dim))}>
              <span className={`covdot ${m ? m.cls : a.engine === "erreur" ? "m-ko" : "m-mid"}`} />
              <span className="covname">{fullName}</span>
              <span className="lvltag" style={{ ...scoreStyle(a.note), fontSize: 11, padding: "2px 7px" }}>{a.note}</span>
              {a.engine === "erreur" ? (
                <span className="covcounts" style={{ color: "var(--ko)" }}>analyse en erreur</span>
              ) : (
                <span className="covcounts">
                  {STATUTS.map((s) => c[s] > 0 && <span key={s} className={`vbadge ${STATUT[s].badge}`}>{c[s]} {STATUT[s].label.toLowerCase()}</span>)}
                </span>
              )}
              <span className="covtoggle">{open[a.dim] ? "replier ▲" : "voir ▼"}</span>
            </div>
          );
        })}
        <div className="covfilter">
          <span className="lbl">Filtrer les questions</span>
          <span className={"chip" + (filter === null ? " on" : "")} onClick={() => setFilter(null)}>Toutes</span>
          {STATUTS.map((s) => (
            <span key={s} className={"chip" + (filter === s ? " on" : "")} onClick={() => setFilter(filter === s ? null : s)}>
              {STATUT[s].label} ({totals[s]})
            </span>
          ))}
        </div>
      </div>

      {analyses.map((a) => {
        const fullName = dimObj(grid, sub, a.dim)?.dimension ?? a.dim;
        const isOpen = !!open[a.dim];
        const verdicts = filter ? a.result.verdicts.filter((v) => v.statut === filter) : a.result.verdicts;
        return (
          <div key={a.dim} id={`gap-dim-${a.dim}`} className="gap-dim">
            <div className="gap-head" style={{ cursor: "pointer" }} onClick={() => setOpen((p) => ({ ...p, [a.dim]: !isOpen }))}>
              <span className="gn">{fullName}{a.crit ? ` · critère « ${a.crit} »` : ""}</span>
              <span className="src-flag" style={a.engine === "erreur" ? { color: "var(--ko)" } : undefined}>
                {a.engine === "ia" ? "IA" : "erreur"}
              </span>
              <span className="lvltag" style={{ ...scoreStyle(a.note), fontSize: 12, padding: "3px 9px" }}>note visée {a.note}</span>
              <span className="covtoggle">{isOpen ? "▲" : "▼"}</span>
            </div>
            {isOpen && (
              <>
                {a.synthesis && <SynthBlock s={a.synthesis} />}
                {!a.synthesis && a.synthesisError && a.engine !== "erreur" && (
                  <div className="synth-err">Avis qualitatif indisponible — {a.synthesisError}</div>
                )}
                {(a.exigence || a.context.length > 0) && (
                  <div className="dtoggle" style={{ margin: "10px 15px 0" }} onClick={() => setDetail((p) => ({ ...p, [a.dim]: !p[a.dim] }))}>
                    <span className="pm">{detail[a.dim] ? "–" : "+"}</span> Exigence de la grille &amp; contexte pays
                  </div>
                )}
                {detail[a.dim] && (
                  <>
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
                  </>
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
                ) : verdicts.length === 0 ? (
                  <div className="hint" style={{ margin: "12px 15px 15px" }}>
                    Aucune question « {filter ? STATUT[filter].label.toLowerCase() : ""} » pour cette dimension.
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
                        {verdicts.map((v) => {
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
              </>
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
