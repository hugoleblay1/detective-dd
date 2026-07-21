import { useState } from "react";
import { dimObj, type SectorGrid } from "@/lib/grid";
import { DIMS_EXCLUDED_FROM_ANALYSIS } from "@/lib/gap/types";
import type { DimAnalysis, TDimSynthesis, TVerdict } from "@/lib/gap/types";
import { ALL_DIMS } from "./TargetsEditor";
import { highlight } from "./highlight";

const STATUT = {
  repondu: { cls: "ok", label: "Répondu" },
  partiel: { cls: "mid", label: "Partiel" },
  manquant: { cls: "ko", label: "Manquant" },
} as const;
type Statut = keyof typeof STATUT;
const STATUTS: Statut[] = ["manquant", "partiel", "repondu"];

// Complétude DOCUMENTAIRE du dossier au regard de la note visée — jamais une note (règle 1).
const MATURITE = {
  complet: { cls: "ok", short: "Complet", label: "Dossier complet au regard de la note visée" },
  partiel: { cls: "mid", short: "Partiel", label: "Dossier partiel au regard de la note visée" },
  insuffisant: { cls: "ko", short: "Insuffisant", label: "Dossier insuffisant au regard de la note visée" },
} as const;

const countBy = (verdicts: TVerdict[]) => {
  const c: Record<Statut, number> = { repondu: 0, partiel: 0, manquant: 0 };
  verdicts.forEach((v) => { if (v.statut in c) c[v.statut as Statut]++; });
  return c;
};

/** Niveau ok/mid/ko d'une dimension : maturité de l'avis si disponible, sinon comptage des verdicts. */
function dimLevel(a: DimAnalysis): "ok" | "mid" | "ko" {
  if (a.engine === "erreur") return "ko";
  if (a.synthesis) return MATURITE[a.synthesis.maturite.niveau].cls;
  const c = countBy(a.result.verdicts);
  return c.manquant > 0 ? "ko" : c.partiel > 0 ? "mid" : "ok";
}

function Cite({ txt }: { txt?: string }) {
  if (!txt) return null;
  return <div className="quoteblock"><span className="q">{txt}</span></div>;
}

function SynthBlock({ s }: { s: TDimSynthesis }) {
  return (
    <>
      {s.maturite.justification && <div className="avis">{s.maturite.justification}</div>}
      {(s.forces.length > 0 || s.faiblesses.length > 0) && (
        <div className="synth-cols">
          <div className="synth-col">
            <div className="h">Forces du dossier</div>
            {s.forces.length ? s.forces.map((f, i) => (
              <div key={i} className="synth-it ok"><span className="mk">✓</span><span>{f.point}<Cite txt={f.citation} /></span></div>
            )) : <div className="hint">—</div>}
          </div>
          <div className="synth-col">
            <div className="h">Faiblesses</div>
            {s.faiblesses.length ? s.faiblesses.map((f, i) => (
              <div key={i} className="synth-it ko"><span className="mk">⚠</span><span>{f.point}<Cite txt={f.citation} /></span></div>
            )) : <div className="hint">—</div>}
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
    </>
  );
}

export function GapResults({ grid, sub, geo, analyses }: { grid: SectorGrid; sub: string; geo: string; analyses: DimAnalysis[] }) {
  // Une seule dimension → ouverte d'office ; plusieurs → le bandeau sert de sommaire.
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => (analyses.length === 1 ? { [analyses[0].dim]: true } : {}));
  const [detail, setDetail] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<Statut | null>(null);
  const [copied, setCopied] = useState(false);

  const allIA = analyses.every((a) => a.engine === "ia");
  const noneIA = analyses.every((a) => a.engine === "erreur");
  const flag = allIA ? "Agent IA — lecture contextuelle"
    : noneIA ? "Moteur indisponible — voir erreurs par dimension"
    : "Moteur mixte — voir chaque dimension";
  const ask = analyses.flatMap((a) => a.result.a_redemander.map((txt) => ({ dim: a.dim, txt })));
  const seen = new Set<string>();
  const askDedup = ask.filter((a) => { const k = a.dim + "|" + a.txt; if (seen.has(k)) return false; seen.add(k); return true; });
  const totals = countBy(analyses.flatMap((a) => a.result.verdicts));

  const nOk = analyses.filter((a) => dimLevel(a) === "ok").length;
  const bannerTitle = analyses.length === 0 ? "Aucune dimension analysée."
    : nOk === analyses.length
      ? (analyses.length > 1 ? `Dossier complet pour les ${analyses.length} dimensions visées.` : "Dossier complet pour la dimension visée.")
      : nOk === 0
        ? (analyses.length > 1 ? `Dossier à compléter pour les ${analyses.length} dimensions visées.` : "Dossier à compléter pour la dimension visée.")
        : `Dossier complet pour ${nOk} dimension${nOk > 1 ? "s" : ""} sur ${analyses.length}.`;
  const bannerSub = askDedup.length === 0
    ? "Rien à redemander au client sur ce périmètre."
    : `${askDedup.length} élément${askDedup.length > 1 ? "s" : ""} à consolider ou à obtenir du client. La liste complète est en bas de page.`;

  const notAnalyzed = ALL_DIMS.filter((dk) =>
    !DIMS_EXCLUDED_FROM_ANALYSIS.includes(dk) && !analyses.some((a) => a.dim === dk));

  function jumpTo(dim: string) {
    setOpen((p) => ({ ...p, [dim]: true }));
    // Après le rendu de la dimension dépliée, on l'amène à l'écran.
    requestAnimationFrame(() => document.getElementById(`gap-dim-${dim}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function copyAsk() {
    const txt = askDedup.map((a) => `• [${a.dim}] ${a.txt}`).join("\n");
    void navigator.clipboard?.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="results">
      <div className="rbanner">
        <div className="rb-main">
          <div className="rb-title">{bannerTitle}</div>
          <div className="rb-sub">{bannerSub}</div>
          <div className="rb-flag">{flag}</div>
        </div>
        <div className="rb-chips">
          {analyses.map((a) => {
            const lvl = dimLevel(a);
            const st = a.engine === "erreur" ? "erreur"
              : a.synthesis ? MATURITE[a.synthesis.maturite.niveau].short
              : lvl === "ok" ? "Couvert" : lvl === "mid" ? "Partiel" : "À compléter";
            return (
              <div key={a.dim} className="rb-chip" onClick={() => jumpTo(a.dim)}>
                <span className="d">{a.dim} <b>{a.note}</b></span>
                <span className={`s s-${lvl}`}>{lvl === "ok" ? "✓ " : ""}{st}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="qfilter">
        <span className="lbl">Filtrer les questions</span>
        <span className={"chip" + (filter === null ? " on" : "")} onClick={() => setFilter(null)}>Toutes</span>
        {STATUTS.map((s) => (
          <span key={s} className={"chip" + (filter === s ? " on" : "")} onClick={() => setFilter(filter === s ? null : s)}>
            {STATUT[s].label} ({totals[s]})
          </span>
        ))}
      </div>

      {analyses.map((a) => {
        const fullName = dimObj(grid, sub, a.dim)?.dimension ?? a.dim;
        const isOpen = !!open[a.dim];
        const lvl = dimLevel(a);
        const c = countBy(a.result.verdicts);
        const tot = a.result.verdicts.length || 1;
        const countLine = [
          c.repondu ? `${c.repondu} répondu${c.repondu > 1 ? "s" : ""}` : "",
          c.partiel ? `${c.partiel} partiel${c.partiel > 1 ? "s" : ""}` : "",
          c.manquant ? `${c.manquant} manquant${c.manquant > 1 ? "s" : ""}` : "",
        ].filter(Boolean).join(" · ");
        const pill = a.engine === "erreur" ? { cls: "ko", label: "analyse en erreur" }
          : a.synthesis ? { cls: MATURITE[a.synthesis.maturite.niveau].cls, label: MATURITE[a.synthesis.maturite.niveau].short }
          : { cls: lvl, label: lvl === "ok" ? "Couvert" : lvl === "mid" ? "Partiel" : "À compléter" };
        const verdicts = filter ? a.result.verdicts.filter((v) => v.statut === filter) : a.result.verdicts;
        return (
          <div key={a.dim} id={`gap-dim-${a.dim}`} className={"acc" + (isOpen ? " open" : "")}>
            <div className="acc-head" onClick={() => setOpen((p) => ({ ...p, [a.dim]: !isOpen }))}>
              <span className="acc-name">
                {fullName}{a.crit ? <span className="acc-crit"> · critère « {a.crit} »</span> : null}
              </span>
              <span className="notevisee">note visée {a.note}</span>
              {a.engine === "erreur" ? (
                <span className="acc-count" style={{ color: "var(--status-ko)" }}>moteur en erreur</span>
              ) : (
                <>
                  <span className="covbar">
                    <i style={{ width: `${(100 * c.repondu) / tot}%`, background: "var(--cov-ok)" }} />
                    <i style={{ width: `${(100 * c.partiel) / tot}%`, background: "var(--cov-mid)" }} />
                    <i style={{ width: `${(100 * c.manquant) / tot}%`, background: "var(--cov-ko)" }} />
                  </span>
                  <span className="acc-count">{countLine}</span>
                </>
              )}
              <span className="eng">{a.engine === "ia" ? "IA" : "erreur"}</span>
              <span className={`acc-pill p-${pill.cls}`}>{pill.label}</span>
              <span className="acc-chev">▾</span>
            </div>
            {isOpen && (
              <div className="acc-body">
                {a.synthesis && <SynthBlock s={a.synthesis} />}
                {!a.synthesis && a.synthesisError && a.engine !== "erreur" && (
                  <div className="synth-err">Avis qualitatif indisponible — {a.synthesisError}</div>
                )}
                {(a.exigence || a.context.length > 0) && (
                  <div className="exig">
                    <div className="exig-head" onClick={() => setDetail((p) => ({ ...p, [a.dim]: !p[a.dim] }))}>
                      <span className="k">Exigence de la grille</span>
                      <span className="x">{a.exigence ? `${a.exigence.slice(0, 110)}${a.exigence.length > 110 ? "…" : ""}` : "contexte pays"}</span>
                      <span className="tg">{detail[a.dim] ? "Masquer" : "Voir l'exigence complète et le contexte pays"} <i className={detail[a.dim] ? "up" : ""}>▾</i></span>
                    </div>
                    {detail[a.dim] && (
                      <div className="exig-body">
                        {a.exigence && <div className="exig-full">{highlight(a.exigence.slice(0, 800))}{a.exigence.length > 800 ? "…" : ""}</div>}
                        {a.context.length > 0 && (
                          <div className="ctx-summary">
                            <div className="h">Résumé contextuel{geo.trim() ? ` — ${geo.trim()}` : ""} · sources officielles</div>
                            <div className="ctx-grid">
                              {a.context.map((ctx) => (
                                <a key={ctx.label} className="ctx-src" href={ctx.sourceUrl} target="_blank" rel="noopener noreferrer">
                                  <div className="nm">{ctx.value}{ctx.unit}</div>
                                  <div className="ds">{ctx.label} · {ctx.source}{ctx.year ? ` ${ctx.year}` : ""} ↗</div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {a.library.length > 0 && (
                  <div className="hint">
                    📚 Bibliothèque IMP mobilisée : {a.library.map((l) =>
                      `${l.title}${l.pages.length ? ` (p.${l.pages.join(", ")})` : ""}`).join(" · ")}
                  </div>
                )}
                {a.libraryNotIndexed && a.libraryNotIndexed.length > 0 && (
                  <div className="hint" style={{ color: "var(--status-mid)" }}>
                    ⏳ {a.libraryNotIndexed.length} document(s) de la bibliothèque pas encore lisible(s) par l&apos;IA (indexation requise) : {a.libraryNotIndexed.join(" · ")}
                  </div>
                )}
                {a.libraryError && (
                  <div className="hint" style={{ color: "var(--status-ko)" }}>
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
                  <div className="hint">
                    Aucune question « {filter ? STATUT[filter].label.toLowerCase() : ""} » pour cette dimension.
                  </div>
                ) : (
                  <div className="vcards">
                    {verdicts.map((v) => {
                      const q = a.questions.find((x) => x.id === v.id);
                      if (!q) return null;
                      const s = STATUT[v.statut];
                      return (
                        <div key={v.id} className={`vc vc-${s.cls}`}>
                          <div className="vc-side"><span className={`vc-badge b-${s.cls}`}>{s.label}</span></div>
                          <div className="vc-body">
                            <div className="vc-q">{highlight(q.q.split("\n")[0])}</div>
                            {v.disponibles.length > 0 && (
                              <ul className="vc-avail">{v.disponibles.map((x, i) => <li key={i}>{x}</li>)}</ul>
                            )}
                            {v.manquants.length > 0 && (
                              <div className="vc-ask">
                                <span className="k">→ À demander :</span>
                                <ul>{v.manquants.map((x, i) => <li key={i}>{x}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {(notAnalyzed.length > 0 || DIMS_EXCLUDED_FROM_ANALYSIS.length > 0) && (
        <div className="nastrip">
          {notAnalyzed.map((dk) => (
            <span key={dk} className="na-it"><b>{dk}</b><span>pas de note visée — non analysée.</span></span>
          ))}
          {DIMS_EXCLUDED_FROM_ANALYSIS.map((dk) => (
            <span key={dk} className="na-it"><b>{dk}</b><span>évaluée via le questionnaire et l&apos;outil Genre dédiés.</span></span>
          ))}
        </div>
      )}

      {askDedup.length > 0 && (
        <div className="askcard">
          <div className="ask-head">
            <div>
              <div className="t">À redemander au client — synthèse</div>
              <div className="s">{askDedup.length} demande{askDedup.length > 1 ? "s" : ""}, prête{askDedup.length > 1 ? "s" : ""} à copier dans un e-mail</div>
            </div>
            <button className="copybtn" onClick={copyAsk}>{copied ? "✓ Copié" : "Copier la liste"}</button>
          </div>
          <div className="ask-body">
            {askDedup.map((a, i) => (
              <div key={i} className="ask-it">
                <span className="dimtag">{a.dim}</span>
                <span className="tx">{a.txt}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
