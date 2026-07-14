import { useState } from "react";
import { isRagIndexable, type LibraryDoc } from "@/lib/library";

const ALL_DIMS = ["Atténuation", "Adaptation", "Social", "Genre", "Biodiversité"];
const GEO_LEVELS = ["Monde", "Continental", "Pays"];

function QualifyRow({ doc, onQualified }: { doc: LibraryDoc; onQualified: (d: LibraryDoc) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [geoLevel, setGeoLevel] = useState("Pays");
  const [geoName, setGeoName] = useState("");
  const [dims, setDims] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleDim(d: string) { setDims((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d])); }

  async function save() {
    setSaving(true); setErr(null);
    try {
      const body = {
        title: title.trim() || doc.file,
        geoLevel, geoName: geoName.trim() || "—",
        dims: dims.length ? dims : ["Social"],
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/library/${doc.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Échec de l'enregistrement.");
      onQualified(data.document as LibraryDoc);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`doc-row newdoc${open ? " qualifying" : ""}`}>
      <div className="doc-top">
        <span className="doc-new">NOUVEAU</span>
        <span className="doc-file">{doc.path}</span>
        <button className="btn small" onClick={() => setOpen((o) => !o)}>Qualifier</button>
      </div>
      <div className="doc-meta">Détecté le {doc.detectedAt.slice(0, 10)}</div>
      <div className="qform">
        <div className="row"><label>Titre</label><input type="text" style={{ flex: 1, minWidth: 220 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre lisible" /></div>
        <div className="row">
          <label>Géographie</label>
          <select value={geoLevel} onChange={(e) => setGeoLevel(e.target.value)}>{GEO_LEVELS.map((g) => <option key={g}>{g}</option>)}</select>
          <input type="text" value={geoName} onChange={(e) => setGeoName(e.target.value)} placeholder="ex. Kenya" style={{ width: 150 }} />
        </div>
        <div className="row">
          <label>Dimensions</label>
          <span className="chips">{ALL_DIMS.map((dm) => <span key={dm} className={"chip" + (dims.includes(dm) ? " on" : "")} onClick={() => toggleDim(dm)}>{dm}</span>)}</span>
        </div>
        <div className="row"><label>Hashtags</label><input type="text" style={{ flex: 1, minWidth: 220 }} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex. eau, 2X, rural (séparés par des virgules)" /></div>
        {err && <div className="gap-error" style={{ margin: "0 0 10px" }}>{err}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginBottom: 0 }}><button className="btn small" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</button></div>
      </div>
    </div>
  );
}

export function LibraryView({ docs, onQualified }: { docs: LibraryDoc[] | null; onQualified: (d: LibraryDoc) => void }) {
  if (docs === null) return <div className="content"><div className="placeholder">Chargement de la bibliothèque…</div></div>;
  const pending = docs.filter((d) => !d.qualified);
  const qualified = docs.filter((d) => d.qualified);
  return (
    <div className="content">
      <div className="lib-note">Démonstration : l&apos;index et les fichiers sont factices. En production, un script planifié scanne le réseau et écrit l&apos;index ; la qualification est enregistrée en base.</div>

      <div className="lib-sec">
        <h4>À qualifier — détectés sur le réseau ({pending.length})</h4>
        {pending.length === 0 && <div className="esg-note">Aucun nouveau fichier en attente.</div>}
        {pending.map((d) => <QualifyRow key={d.id} doc={d} onQualified={onQualified} />)}
      </div>

      <div className="lib-sec">
        <h4>Bibliothèque qualifiée ({qualified.length})</h4>
        {qualified.map((d) => (
          <div key={d.id} className="doc-row">
            <div className="doc-top">
              <span className="doc-file" style={{ flex: "unset" }}>{d.title}</span>
              <span className="tagint">qualifié</span>
              {d.chunks === 0 && isRagIndexable(d.file) && <span className="tagpend">Pas encore lisible par l&apos;IA — indexation requise</span>}
            </div>
            <div className="doc-meta">
              <span>{d.geoLevel} · {d.geoName}</span><span>·</span><span>{d.dims.join(", ")}</span><span>·</span><span>{(d.qualifiedAt ?? d.detectedAt).slice(0, 10)}</span>
              {d.tags.map((t) => <span key={t} className="tagchip">#{t}</span>)}
            </div>
            <div className="doc-meta" style={{ marginTop: 3 }}><span className="pathln">{d.path}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}
