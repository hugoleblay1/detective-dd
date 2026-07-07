/** Bloc « Données de contexte utiles » — docs internes qualifiés + liens externes publics. */
import { ctxForDim, geoInfo } from "@/lib/context-sources";
import { libForDim, type LibraryDoc } from "@/lib/library";
import type { DimKey } from "@/lib/grid";

export function ContextLinks({ dk, geo, libDocs }: { dk: DimKey | null; geo: string; libDocs: LibraryDoc[] }) {
  const cx = ctxForDim(dk);
  const internal = dk ? libForDim(libDocs, dk, geo) : [];
  if (!cx && internal.length === 0) return null;
  const c = geoInfo(geo);
  const g = geo.trim();
  return (
    <div className="ctx-inline">
      <div className="h">
        <span className="dot" style={{ background: cx?.color ?? "#1f7a44" }} />
        Données de contexte utiles{g ? ` — ${g}` : ""}
      </div>
      <div className="ctx-grid">
        {internal.map((d) => (
          <div key={d.id} className="ctx-src int">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="nm" style={{ flex: 1 }}>{d.title}</div>
              <span className="tagint">interne</span>
            </div>
            <div className="ds">{d.dims.join(", ")} · {d.geoName} · {(d.qualifiedAt ?? d.detectedAt).slice(0, 10)}</div>
            <div className="pathln">{d.path}</div>
          </div>
        ))}
        {cx?.sources.map((s) => (
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
