/** Bloc « Données de contexte utiles » — liens externes publics par dimension. */
import { ctxForDim, geoInfo } from "@/lib/context-sources";
import type { DimKey } from "@/lib/grid";

export function ContextLinks({ dk, geo }: { dk: DimKey | null; geo: string }) {
  const cx = ctxForDim(dk);
  if (!cx) return null;
  const c = geoInfo(geo);
  const g = geo.trim();
  return (
    <div className="ctx-inline">
      <div className="h">
        <span className="dot" style={{ background: cx.color }} />
        Données de contexte utiles{g ? ` — ${g}` : ""}
      </div>
      <div className="ctx-grid">
        {cx.sources.map((s) => (
          <a key={s.name} className="ctx-src" href={s.url(c)} target="_blank" rel="noopener noreferrer">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="nm" style={{ flex: 1 }}>{s.name} ↗</div>
              <span className="tagext">externe</span>
            </div>
            <div className="ds">{s.desc}</div>
            {c && <div className="cc">{g}</div>}
          </a>
        ))}
      </div>
    </div>
  );
}
