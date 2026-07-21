import { useState } from "react";
import type { ClientDoc } from "@/lib/gap/types";

const tileLabel = (name: string) => /\.(\w+)$/.exec(name)?.[1]?.toUpperCase().slice(0, 4) ?? "TXT";

export function DocsEditor({ docs, onAdd, onRemove }: {
  docs: ClientDoc[]; onAdd: (d: ClientDoc) => void; onRemove: (i: number) => void;
}) {
  const [paste, setPaste] = useState("");
  const [pending, setPending] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);

  function addPaste() {
    const t = paste.trim();
    if (!t) return;
    onAdd({ name: `Extrait collé ${docs.length + 1}`, text: t });
    setPaste("");
  }

  async function extractPdf(f: File) {
    setPending((p) => [...p, f.name]);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ? `${f.name} : ${data.error}` : `${f.name} : extraction échouée (${res.status}).`);
      if (!String(data.text ?? "").trim()) throw new Error(`${f.name} : aucun texte extractible (PDF scanné ? OCR non géré).`);
      if (data.note) setNotes((n) => [...n, `${f.name} : ${data.note}`]);
      onAdd({ name: f.name, text: data.text });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPending((p) => p.filter((n) => n !== f.name));
    }
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    setErr(null);
    setNotes([]);
    for (const f of Array.from(files)) {
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
        void extractPdf(f);
      } else {
        const r = new FileReader();
        r.onload = () => onAdd({ name: f.name, text: String(r.result ?? "") });
        r.readAsText(f);
      }
    }
  }

  return (
    <>
      {(docs.length > 0 || pending.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map((d, i) => (
            <div key={`${d.name}-${i}`} className="docrow">
              <span className="doctile">{tileLabel(d.name)}</span>
              <span className="dmain">
                <span className="nm">{d.name}</span>
                <span className="mt">{d.text.length.toLocaleString("fr-FR")} caractères</span>
              </span>
              <span className="rm" onClick={() => onRemove(i)}>Retirer</span>
            </div>
          ))}
          {pending.map((n) => (
            <div key={n} className="docrow" style={{ opacity: 0.7 }}>
              <span className="doctile">⏳</span>
              <span className="dmain">
                <span className="nm">{n}</span>
                <span className="mt">extraction du texte…</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="docadd">
        <span className="addfile">
          + Joindre un fichier (.pdf, .txt, .md)
          <input type="file" accept=".pdf,.txt,.md,.csv" multiple onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </span>
        <span className="hint">PDF : retranscription enrichie (tableaux et graphiques lus) jusqu&apos;à <b>100 pages / 30 Mo</b> par document — au-delà, texte brut seul.</span>
      </div>
      <div className="fgroup">
        <span className="flabel">Ou coller un extrait <span className="opt">(texte brut)</span></span>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)}
          placeholder="Collez ici un extrait de document client… puis « Ajouter »" />
        <div><button className="btn ghost small" onClick={addPaste} disabled={!paste.trim()}>Ajouter l&apos;extrait</button></div>
      </div>
      {err && <div className="gap-error" style={{ margin: 0 }}>{err}</div>}
      {notes.map((n) => <div key={n} className="hint">⚠ {n}</div>)}
    </>
  );
}
