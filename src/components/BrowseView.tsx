"use client";
import { useState } from "react";
import type { SectorGrid } from "@/lib/grid";
import { DimensionCard } from "./DimensionCard";
import { KeyQuestions } from "./KeyQuestions";
import { ScoreTag } from "./ScoreTag";

const GEO_PRESETS = ["Kenya", "Nigeria", "Maroc", "Côte d'Ivoire", "Sénégal", "Arménie", "Jordanie"];
const LEGEND: Array<[string, string]> = [
  ["-1", "Enjeu / désaligné"], ["0", "Pas d'enjeu"], ["+1", "Prise en compte"],
  ["+2", "Qualifie obj. strat."], ["+3", "Excellence"],
];

export function BrowseView({ grid }: { grid: SectorGrid }) {
  const subtypes = Object.keys(grid.subtypes);
  const [sub, setSub] = useState(subtypes.includes("Data Centre") ? "Data Centre" : subtypes[0]);
  const [geo, setGeo] = useState("Kenya");
  const dims = grid.subtypes[sub].notation_dd.dimensions;
  return (
    <div className="wrap">
      <div className="controls">
        <div className="ctl">
          <label>Type d&apos;investissement</label>
          <div className="seg">
            {subtypes.map((s) => (
              <button key={s} className={s === sub ? "on" : ""} onClick={() => setSub(s)}>{s}</button>
            ))}
          </div>
        </div>
        <div className="ctl">
          <label>Géographie du projet</label>
          <div className="geo-in">
            <input value={geo} placeholder="ex. Kenya" onChange={(e) => setGeo(e.target.value)} />
            <div className="chips">
              {GEO_PRESETS.map((g) => (
                <span key={g} className="chip" onClick={() => setGeo(g)}>{g}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="content">
        <div className="legend-strip">
          <span className="ttl">Échelle DD</span>
          {LEGEND.map(([s, lbl]) => (
            <div key={s} className="legend-item">
              <ScoreTag note={s} className="sbox" />
              <span className="txt" style={s === "+2" ? { fontWeight: 600, color: "#1e6b34" } : undefined}>{lbl}</span>
            </div>
          ))}
        </div>
        {dims.map((d, i) => (
          <DimensionCard key={`${sub}:${d.dimension}`} grid={grid} subtype={sub} geo={geo} dim={d} defaultOpen={i === 3} />
        ))}
        <KeyQuestions grid={grid} subtype={sub} />
      </div>
    </div>
  );
}
