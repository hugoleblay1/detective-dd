"use client";
import { useState } from "react";

/**
 * Banc d'essai de l'API /api/analyze.
 * L'interface de référence (UX validée avec l'équipe IMP) est docs/prototype-spec.html —
 * son portage React est le premier chantier V1.5 (voir README, feuille de route).
 */
const EXAMPLE = {
  sector: "Numérique",
  subtype: "Data Centre",
  geo: "Kenya",
  dealText: "Data center à Nairobi, refroidissement adiabatique, PPA solaire 60%.",
  targets: { Adaptation: { note: "+2" } },
  docs: [{ name: "Extrait rapport client", text: "Le client a réalisé une analyse des risques climatiques physiques actuels et futurs. Co-bénéfices adaptation évalués à 35% du financement." }],
};

export default function Home() {
  const [payload, setPayload] = useState(JSON.stringify(EXAMPLE, null, 2));
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setOut("Analyse en cours…");
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: payload });
      setOut(JSON.stringify(await res.json(), null, 2));
    } catch (e) { setOut(String(e)); } finally { setBusy(false); }
  }
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 20 }}>Détective DD — banc d'essai API</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        POST /api/analyze — moteur d'analyse d'écart (un appel LLM par dimension).
        L'UI de référence : <code>docs/prototype-spec.html</code>.
      </p>
      <textarea value={payload} onChange={(e) => setPayload(e.target.value)}
        style={{ width: "100%", height: 260, fontFamily: "monospace", fontSize: 13 }} />
      <div style={{ margin: "12px 0" }}>
        <button onClick={run} disabled={busy} style={{ padding: "10px 18px", fontWeight: 600 }}>
          {busy ? "…" : "Analyser"}
        </button>
      </div>
      <pre style={{ background: "#f6f6fa", padding: 16, borderRadius: 8, whiteSpace: "pre-wrap", fontSize: 12.5 }}>{out}</pre>
    </main>
  );
}
