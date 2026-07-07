import { useState } from "react";
import { questionsFor, type DimKey, type SectorGrid } from "@/lib/grid";
import { highlight } from "./highlight";

type Filter = "Planète" | "Social" | "Genre";
const FILTERS: Filter[] = ["Planète", "Social", "Genre"];
const PLANETE_SUBS: DimKey[] = ["Atténuation", "Adaptation", "Biodiversité"];

export function KeyQuestions({ grid, subtype }: { grid: SectorGrid; subtype: string }) {
  const [filter, setFilter] = useState<Filter>("Planète");
  const [sub, setSub] = useState<DimKey>("Atténuation");
  const dk: DimKey = filter === "Planète" ? sub : filter;
  const qs = questionsFor(grid, subtype, dk, null, null);
  return (
    <div className="card" style={{ padding: 18, marginTop: 20 }}>
      <h3 style={{ margin: "0 0 12px" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--blue)" }}>Questions clés de due diligence</span>
      </h3>
      <div className="kq-filter">
        {FILTERS.map((c) => (
          <span key={c} className={"chip" + (filter === c ? " on" : "")} onClick={() => setFilter(c)}>{c}</span>
        ))}
      </div>
      {filter === "Planète" && (
        <div className="kq-sub">
          {PLANETE_SUBS.map((s) => (
            <span key={s} className={"chip" + (sub === s ? " on" : "")} onClick={() => setSub(s)}>{s}</span>
          ))}
        </div>
      )}
      {qs.length === 0 && (
        <div className="esg-note">
          {filter === "Planète" && sub === "Biodiversité" ? "Questions biodiversité à venir." : "Aucune question pour cette catégorie."}
        </div>
      )}
      {qs.map((q, i) => (
        <div key={i} className="kq">
          <div className="kq-top">
            <div className="kq-q">{highlight(q.question)}</div>
            {q.note_visee && <span className="notebadge">{q.note_visee}</span>}
          </div>
          <div className="kq-meta">
            <span className="k">{q.thematique || ""}{q.dimension ? " · " + q.dimension : ""}</span>
            {q.commentaire && <><br /><span className="cm">{q.commentaire}</span></>}
            {q.ressources && <><br /><span className="k">Ressources :</span> {q.ressources}</>}
          </div>
        </div>
      ))}
    </div>
  );
}
