import { useState } from "react";
import type { ClientDoc } from "@/lib/gap/types";

export function DocsEditor({ docs, onAdd, onRemove }: {
  docs: ClientDoc[]; onAdd: (d: ClientDoc) => void; onRemove: (i: number) => void;
}) {
  const [paste, setPaste] = useState("");
  function addPaste() {
    const t = paste.trim();
    if (!t) return;
    onAdd({ name: `Extrait collé ${docs.length + 1}`, text: t });
    setPaste("");
  }
  function onFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const r = new FileReader();
      r.onload = () => onAdd({ name: f.name, text: String(r.result ?? "") });
      r.readAsText(f);
    }
  }
  return (
    <>
      <textarea value={paste} onChange={(e) => setPaste(e.target.value)}
        placeholder="Collez ici un extrait de document client… puis « Ajouter »" />
      <div className="docadd">
        <button className="btn ghost small" onClick={addPaste}>Ajouter l&apos;extrait</button>
        <span className="filebtn">
          <button className="btn ghost small">Joindre un fichier .txt / .md</button>
          <input type="file" accept=".txt,.md,.csv" multiple onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </span>
        <span className="hint">En production : PDF lus par le modèle ; ici texte brut pour la démo.</span>
      </div>
      <div>
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
