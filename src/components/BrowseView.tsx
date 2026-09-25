import React, { useState } from "react";
import {
  critExcluded, defsForDim, dimKeyOf, naList, questionsFor, singleNoteCrits, usableLevels,
  type Dimension, type MethodDefinition, type Note, type SectorGrid,
} from "@/lib/grid";
import { ctxForDim, geoInfo } from "@/lib/context-sources";
import { libForDim, type LibraryDoc } from "@/lib/library";
import { GEO_PRESETS } from "./geo";
import { highlightDefs } from "./highlight";

/** Suffixe de classe CSS d'une note : -2 → m2, 0 → 0, +2 → p2. */
const nk = (n: string) => (n === "0" ? "0" : (n[0] === "-" ? "m" : "p") + n.slice(1));

function pillarKey(p: string) {
  const s = (p || "").toLowerCase();
  if (s.startsWith("incl") || s.startsWith("social")) return "inclusion";
  if (s.startsWith("genre")) return "genre";
  return "planete";
}

export function BrowseView({ grid, sub, geo, libDocs, defs, onSub, onGeo }: {
  grid: SectorGrid; sub: string; geo: string; libDocs: LibraryDoc[]; defs: MethodDefinition[];
  onSub: (s: string) => void; onGeo: (g: string) => void;
}) {
  const dims = grid.subtypes[sub].notation_dd.dimensions;
  const [selName, setSelName] = useState(
    () => (dims.find((d) => d.criteria.length > 0) ?? dims[0])?.dimension ?? "");
  const dim: Dimension = dims.find((d) => d.dimension === selName) ?? dims[0];
  const [selLevel, setSelLevel] = useState<Note | null>(dim?.scale.includes("+2") ? "+2" : null);
  const [openChemins, setOpenChemins] = useState<Record<string, boolean>>({});
  const [drawer, setDrawer] = useState(false);
  const [defOpen, setDefOpen] = useState<MethodDefinition | null>(null);

  if (!dim) return null;
  const dk = dimKeyOf(dim.dimension);
  const dimDefs = dk ? defsForDim(defs, dk) : [];
  const onDef = (d: MethodDefinition) => setDefOpen(d);
  const naL = dk ? naList(grid, sub, dk) : [];
  const snc = dk ? singleNoteCrits(grid, sub, dk) : [];
  const sncByNote = new Map<string, string[]>();
  for (const x of snc) sncByNote.set(x.note, [...(sncByNote.get(x.note) ?? []), x.crit]);
  const visibleCrits = dim.criteria.filter((c) => !critExcluded(c));

  // Chemins (logique OR) : les critères mobilisables à un niveau donné.
  const cheminsAt = (n: string) => visibleCrits
    .map((cr) => ({ cr, txt: usableLevels(cr.summary.levels)[n] }))
    .filter((x): x is { cr: typeof x.cr; txt: string } => !!x.txt);
  const notesWithContent = dim.scale.filter((n) => cheminsAt(n).length > 0);
  const shownNotes = selLevel ? [selLevel] : notesWithContent;
  const anyMulti = notesWithContent.some((n) => cheminsAt(n).length > 1);

  function pickDim(d: Dimension) {
    setSelName(d.dimension);
    setSelLevel(d.scale.includes("+2") ? "+2" : null);
    setOpenChemins({});
  }

  // Groupes de la barre latérale, dans l'ordre des piliers de la grille.
  const groups: { pillar: string; items: Dimension[] }[] = [];
  for (const d of dims) {
    const g = groups.find((x) => x.pillar === d.pillar);
    if (g) g.items.push(d); else groups.push({ pillar: d.pillar, items: [d] });
  }

  const cx = ctxForDim(dk);
  const gi = geoInfo(geo);
  const internal = dk ? libForDim(libDocs, dk, geo) : [];

  return (
    <div className="browse">
      <div className="bfilter">
        <div className="bf-group">
          <span className="flabel">Secteur</span>
          <div className="segjoin"><button className="on">{grid.sector}</button></div>
        </div>
        <div className="bf-group">
          <span className="flabel">Grille applicable</span>
          <div className="gchips">
            {Object.keys(grid.subtypes).map((s) => (
              <span key={s} className={"gchip" + (s === sub ? " on" : "")} onClick={() => onSub(s)}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bgrid">
        <div className="bside">
          {groups.map((g) => (
            <div key={g.pillar} className="bs-group">
              <div className={`bs-pillar pk-${pillarKey(g.pillar)}`}>{g.pillar}</div>
              {g.items.map((d) => (
                <div key={d.dimension} className={"bs-item" + (d.dimension === dim.dimension ? " on" : "")} onClick={() => pickDim(d)}>
                  <span>{d.dimension.replace(/^[A-ZÉÈ&\s]+-\s*/, "")}</span>
                  <span className="meta">{d.scale.length ? `${d.scale[0]} à ${d.scale[d.scale.length - 1]}` : ""}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="bs-foot">La grille est la source de vérité, republiée vers l&apos;outil.</div>
        </div>

        <div className="bpanel">
          <div className="bp-head">
            <div className="bp-title">
              <span className={`pillbadge pk-${pillarKey(dim.pillar)}`}>{dim.pillar}</span>
              <span className="t">{dim.dimension}</span>
            </div>
            <button className="resbtn" onClick={() => setDrawer(true)}>Ressources par pays ↗</button>
            {(naL.length > 0 || snc.length > 0) && (
              <div className="dimnote">
                {naL.map((x) => (
                  <div key={x.crit} className="it"><b>{x.crit}</b> — non mobilisable pour {sub} : {highlightDefs(x.expl, dimDefs, onDef)}</div>
                ))}
                {[...sncByNote.entries()].map(([note, crits]) => (
                  <div key={note} className="it">
                    Mobilisables uniquement en <b>{note}</b> : {crits.map((cr, i) => (
                      <React.Fragment key={cr}>{i > 0 ? ", " : ""}<b>{cr}</b></React.Fragment>
                    ))}.
                  </div>
                ))}
              </div>
            )}
          </div>

          {dim.objective && <div className="enjeu">{highlightDefs(dim.objective, dimDefs, onDef)}</div>}

          {dim.scale.length > 0 && (
            <div className="fgroup">
              <div className="scalehead">
                <span className="flabel">Échelle de notation</span>
                <span className="schint">
                  {selLevel ? `niveau ${selLevel} affiché — cliquez à nouveau pour voir toute l'échelle` : "cliquez sur un niveau pour n'afficher que ses critères"}
                </span>
              </div>
              <div className="scaleseg">
                {dim.scale.map((n) => (
                  <div key={n} className={`sc-seg n-${nk(n)}` + (selLevel === n ? " on" : "")}
                    onClick={() => setSelLevel(selLevel === n ? null : (n as Note))}>
                    <div className="n">{n}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {anyMulti && (
            <div className="orbanner">
              <b>Un seul critère suffit</b> pour valider un niveau : plusieurs chemins mènent à la même note.
              {dim.prerequisite ? " Les notes +2 et +3 supposent en plus le prérequis de la dimension, rappelé sous ces niveaux." : ""}
            </div>
          )}

          {dim.criteria.length === 0 && <div className="esg-note">Dimension renvoyée à l&apos;analyse ESG pour ce secteur.</div>}

          {shownNotes.map((n) => {
            const chemins = cheminsAt(n);
            if (chemins.length === 0) return (
              <div key={n} className="hint">Aucun critère mobilisable en {n} pour {sub}.</div>
            );
            return (
              <div key={n} className="lvlblock">
                <div className="lv-head">
                  <span className={`lvbadge n-${nk(n)}`}>{n}</span>
                  {chemins.length > 1 && <span className="lv-multi">{chemins.length} chemins possibles — un seul suffit</span>}
                </div>
                {(n === "+2" || n === "+3") && dim.prerequisite && (
                  <div className="prereqbox">{highlightDefs(dim.prerequisite, dimDefs, onDef)}</div>
                )}
                {chemins.map(({ cr, txt }, i) => {
                  const key = `${dim.dimension}|${n}|${cr.criterion}`;
                  const isOpen = !!openChemins[key];
                  const detailTxt = cr.detail ? usableLevels(cr.detail.levels)[n] : undefined;
                  const qs = dk ? questionsFor(grid, sub, dk, cr.criterion, n as Note) : [];
                  const hasDetail = !!detailTxt || qs.length > 0 || !!cr.summary.example;
                  return (
                    <React.Fragment key={key}>
                      {i > 0 && (
                        <div className="ousep"><i /><span>OU</span><i className="grow" /></div>
                      )}
                      <div className="chemin">
                        <div className="ch-main">
                          <span className="ch-crit">{cr.criterion}</span>
                          <span className="ch-txt">{highlightDefs(txt, dimDefs, onDef)}</span>
                          {hasDetail && (
                            <span className="ch-toggle" onClick={() => setOpenChemins((p) => ({ ...p, [key]: !p[key] }))}>
                              {isOpen ? "Masquer le détail ▴" : "Exigences & questions clés ▾"}
                            </span>
                          )}
                        </div>
                        {isOpen && (
                          <div className="ch-detail">
                            {detailTxt && (
                              <div className="ch-sec">
                                <div className="h">Exigences détaillées</div>
                                <div className="it"><span className="b">•</span><span>{highlightDefs(detailTxt, dimDefs, onDef)}</span></div>
                              </div>
                            )}
                            {cr.summary.example && (
                              <div className="ch-sec">
                                <div className="h">Exemple de projet</div>
                                <div className="it"><span className="b">•</span><span>{highlightDefs(cr.summary.example, dimDefs, onDef)}</span></div>
                              </div>
                            )}
                            {qs.length > 0 && (
                              <div className="ch-sec">
                                <div className="h">Questions clés de due diligence</div>
                                {qs.map((q, j) => (
                                  <div key={j} className="it">
                                    <span className="b">›</span>
                                    <span>
                                      {highlightDefs(q.question, dimDefs, onDef)}
                                      {q.ressources && <span className="docs">Docs attendus : {q.ressources}</span>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}

          {selLevel && (
            <button className="resbtn" onClick={() => setSelLevel(null)}>Voir tous les niveaux — {dim.dimension}</button>
          )}
        </div>
      </div>

      {drawer && (
        <>
          <div className="drw-bg" onClick={() => setDrawer(false)} />
          <div className="drw">
            <div className="drw-head">
              <div>
                <div className="t">Ressources mobilisables</div>
                <div className="s">{dim.dimension} · contexte pays pour l&apos;analyse</div>
              </div>
              <span className="x" onClick={() => setDrawer(false)}>✕</span>
            </div>
            <div className="drw-body">
              <div className="drw-sec">
                <div className="h">Pays</div>
                <div className="gchips">
                  {GEO_PRESETS.map((p) => (
                    <span key={p} className={"gchip sm" + (geo === p ? " on" : "")} onClick={() => onGeo(p)}>{p}</span>
                  ))}
                  <input value={GEO_PRESETS.includes(geo) ? "" : geo} placeholder="autre pays…"
                    onChange={(e) => onGeo(e.target.value)} style={{ width: 110 }} type="text" />
                </div>
              </div>
              <div className="drw-sec">
                <div className="h">Sources externes — {dim.dimension}</div>
                {cx?.sources.length ? cx.sources.map((s) => (
                  <a key={s.name} className="drw-card ext" href={s.url(gi)} target="_blank" rel="noopener noreferrer">
                    <div className="top"><span className="nm">{s.name} ↗</span><span className="tagext">externe</span></div>
                    <div className="ds">{s.desc}</div>
                    {geo.trim() && <div className="mt">Donnée {geo.trim()} disponible sur le site</div>}
                  </a>
                )) : <div className="drw-empty">Pas de source externe liée à cette dimension pour le moment.</div>}
              </div>
              <div className="drw-sec">
                <div className="h">Bibliothèque interne — {geo.trim() || "monde"}</div>
                {internal.length ? internal.map((d) => (
                  <div key={d.id} className="drw-card int">
                    <div className="top"><span className="nm">{d.title}</span><span className="tagint">interne</span></div>
                    <div className="mt">{d.dims.join(", ")} · {d.geoName} · {(d.qualifiedAt ?? d.detectedAt).slice(0, 10)}</div>
                    <div className="pathln">{d.path}</div>
                  </div>
                )) : <div className="drw-empty">Aucun document qualifié pour {geo.trim() || "ce pays"} sur cette dimension — à signaler à l&apos;équipe Impact.</div>}
              </div>
              <div className="drw-foot">Ces ressources sont mobilisées automatiquement par l&apos;analyse. La bibliothèque interne est gérée par l&apos;équipe Impact (onglet Bibliothèque IMP).</div>
            </div>
          </div>
        </>
      )}

      {defOpen && (
        <div className="modal-bg show" onClick={(e) => { if (e.target === e.currentTarget) setDefOpen(null); }}>
          <div className="modal defmodal">
            <h3>{defOpen.terme}</h3>
            <div className="defbody">{defOpen.definition}</div>
            <div className="hint" style={{ marginTop: 10 }}>Référentiel méthodologique du client — cette définition prime sur l&apos;acception générique.</div>
            <div className="mrow">
              <button className="btn small" onClick={() => setDefOpen(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
