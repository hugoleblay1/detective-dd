import { useState } from "react";
import type { ClientDoc } from "@/lib/gap/types";

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
      <textarea value={paste} onChange={(e) => setPaste(e.target.value)}
        placeholder="Collez ici un extrait de document client… puis « Ajouter »" />
      <div className="docadd">
        <button className="btn ghost small" onClick={addPaste}>Ajouter l&apos;extrait</button>
        <span className="filebtn">
          <button className="btn ghost small">Joindre un fichier .pdf / .txt / .md</button>
          <input type="file" accept=".pdf,.txt,.md,.csv" multiple onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </span>
        <span className="hint">PDF : retranscription enrichie (tableaux et graphiques lus) jusqu&apos;à <b>100 pages / 30 Mo</b> par document — au-delà, texte brut seul (tableaux et graphiques non exploités).</span>
      </div>
      {err && <div className="gap-error" style={{ margin: "10px 0 0" }}>{err}</div>}
      {notes.map((n) => <div key={n} className="hint" style={{ margin: "8px 0 0" }}>⚠ {n}</div>)}
      <div>
        {pending.map((n) => (
          <div key={n} className="docpill" style={{ opacity: 0.7 }}>
            <span>⏳ <b>{n}</b> · extraction du texte…</span>
          </div>
        ))}
        {docs.map((d, i) => (
          <div key={i} className="docpill">
            <span>▤ <b>{d.name}</b> · {d.text.length.toLocaleString("fr-FR")} caractères</span>
            <span className="x" onClick={() => onRemove(i)}>✕</span>
          </div>
        ))}
      </div>
    </>
  );
}
