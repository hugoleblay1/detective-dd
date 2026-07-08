import type { MethodDefinition, SectorGrid } from "@/lib/grid";
import type { LibraryDoc } from "@/lib/library";
import { DimensionCard } from "./DimensionCard";
import { KeyQuestions } from "./KeyQuestions";
import { ScoreTag } from "./ScoreTag";

const LEGEND: Array<[string, string]> = [
  ["-1", "Enjeu / désaligné"], ["0", "Pas d'enjeu"], ["+1", "Prise en compte"],
  ["+2", "Qualifie obj. strat."], ["+3", "Excellence"],
];

export function BrowseView({ grid, sub, geo, libDocs, defs }: { grid: SectorGrid; sub: string; geo: string; libDocs: LibraryDoc[]; defs: MethodDefinition[] }) {
  const dims = grid.subtypes[sub].notation_dd.dimensions;
  return (
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
        <DimensionCard key={`${sub}:${d.dimension}`} grid={grid} subtype={sub} geo={geo} dim={d} defaultOpen={i === 3} libDocs={libDocs} defs={defs} />
      ))}
      <KeyQuestions grid={grid} subtype={sub} />
    </div>
  );
}
