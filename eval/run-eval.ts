/**
 * Harnais d'évaluation — corpus de test vs vérité terrain.
 * Boîte noire : interroge l'API réelle (/api/analyze), donc teste toute la chaîne
 * (prompts, RAG, extraction). Produit eval/report.md + eval/FEEDBACK-CLAUDE-CODE.md.
 *
 * Usage : pnpm dev (dans un autre terminal), puis : pnpm eval
 * Env : EVAL_API (défaut http://localhost:3000/api/analyze), CORPUS_DIR (défaut eval/corpus)
 */
import fs from "node:fs";
import path from "node:path";

const API = process.env.EVAL_API ?? "http://localhost:3000/api/analyze";
const CORPUS = process.env.CORPUS_DIR ?? path.join("eval", "corpus");
const GT = JSON.parse(fs.readFileSync(path.join("eval", "ground-truth.json"), "utf-8"));

type Statut = "repondu" | "partiel" | "manquant";
const WORSE: Statut[] = ["manquant", "partiel", "repondu"]; // ordre croissant

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[«»"']/g, " ").replace(/\s+/g, " ").trim();

function loadDocs(dir: string): { name: string; text: string }[] {
  const full = path.join(CORPUS, dir);
  if (!fs.existsSync(full)) throw new Error(`Corpus introuvable: ${full} — dézippez corpus-test-dd dans ${CORPUS}`);
  return fs.readdirSync(full).filter((f) => f.endsWith(".md")).sort()
    .map((f) => ({ name: f, text: fs.readFileSync(path.join(full, f), "utf-8") }));
}

/** Adapte ici si le contrat de l'API a évolué. */
async function callAnalyze(deal: any, c: any) {
  const body = {
    sector: GT.sector, subtype: deal.subtype, geo: deal.geo, dealText: deal.deal_text,
    targets: { [c.dim]: { note: c.note, ...(c.crit ? { crit: c.crit } : {}) } },
    docs: loadDocs(deal.dir),
  };
  const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(240_000) });
  if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const an = (data.analyses ?? [])[0];
  if (!an) throw new Error("réponse sans analyses[0]");
  const verdicts = an.result?.verdicts ?? an.verdicts ?? [];
  return { verdicts, raw: an };
}

function dominant(verdicts: { statut: Statut }[]): Statut {
  const counts: Record<Statut, number> = { repondu: 0, partiel: 0, manquant: 0 };
  verdicts.forEach((v) => { if (v.statut in counts) counts[v.statut as Statut]++; });
  let best: Statut = "manquant", n = -1;
  for (const s of WORSE) { // en cas d'égalité, on retient le plus défavorable
    if (counts[s] > n) { n = counts[s]; best = s; }
  }
  return verdicts.length ? best : "manquant";
}

function citations(verdicts: any[]): string[] {
  const out: string[] = [];
  verdicts.forEach((v) => (v.disponibles ?? []).forEach((d: string) => {
    const m = d.match(/«([^»]{6,})»/g);
    (m ?? []).forEach((x) => out.push(x.replace(/[«»]/g, "").trim()));
  }));
  return out;
}

async function main() {
  const rows: any[] = [];
  const feedback = new Set<string>();
  let pass = 0, fail = 0, halluc = 0;

  for (const deal of GT.deals) {
    const corpusText = norm(loadDocs(deal.dir).map((d) => d.text).join(" "));
    const dealStatuts: Statut[] = [];

    for (const c of deal.cases) {
      const label = `${deal.id} · ${c.dim}${c.crit ? " / " + c.crit : ""} · ${c.note}`;
      console.log(`→ ${label}`);
      try {
        const { verdicts } = await callAnalyze(deal, c);
        const got = dominant(verdicts);
        verdicts.forEach((v: any) => dealStatuts.push(v.statut));
        const ok = got === c.expected;
        ok ? pass++ : fail++;
        console.log(`  ${ok ? "✅" : "❌"} attendu ${c.expected} · obtenu ${got}`);
        if (!ok && c.hint) feedback.add(c.hint);
        // assertion "mentionne le seuil"
        let assertNote = "";
        if (c.assert_mentions) {
          const all = JSON.stringify(verdicts);
          if (!all.includes(c.assert_mentions)) {
            assertNote = ` · ⚠ n'évoque pas « ${c.assert_mentions} »`;
            if (c.hint) feedback.add(c.hint);
          }
        }
        // fidélité des citations
        const badCites = citations(verdicts).filter((q) => !corpusText.includes(norm(q)));
        if (badCites.length) {
          halluc += badCites.length;
          feedback.add("CITATIONS : des citations produites n'existent pas mot pour mot dans les documents — renforcer l'exigence de citation exacte dans le prompt et/ou vérifier l'extraction.");
        }
        rows.push({ label, expected: c.expected, got, ok, detail: verdicts.map((v: any) => `${v.id}:${v.statut}`).join(" "), assertNote, badCites });
      } catch (e) {
        fail++;
        const isTimeout = e instanceof Error && e.name === "TimeoutError";
        const motif = isTimeout ? "timeout" : String(e).slice(0, 200);
        console.log(`  ❌ ${motif}`);
        rows.push({ label, expected: c.expected, got: "ERREUR", ok: false, detail: motif, assertNote: "", badCites: [] });
        feedback.add("ROBUSTESSE : au moins un appel API a échoué pendant l'éval — vérifier le contrat /api/analyze et la gestion d'erreurs.");
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    // assertions au niveau du deal
    for (const a of deal.assertions ?? []) {
      if (a.type === "no_status_anywhere") {
        const bad = dealStatuts.filter((s) => a.statuses.includes(s)).length;
        if (bad > 0) { fail++; feedback.add(a.hint); rows.push({ label: `${deal.id} · assertion no_status ${a.statuses}`, expected: "0", got: String(bad), ok: false, detail: "", assertNote: "", badCites: [] }); }
        else pass++;
      }
      if (a.type === "max_status_share") {
        const share = dealStatuts.length ? dealStatuts.filter((s) => s === a.status).length / dealStatuts.length : 0;
        if (share > a.max) { fail++; feedback.add(a.hint); rows.push({ label: `${deal.id} · assertion part ${a.status} ≤ ${a.max}`, expected: `≤${a.max}`, got: share.toFixed(2), ok: false, detail: "", assertNote: "", badCites: [] }); }
        else pass++;
      }
    }
  }

  // ---- rapport ----
  const total = pass + fail;
  const lines = [
    `# Rapport d'évaluation — corpus de test DD`, ``,
    `**Score : ${pass}/${total} (${Math.round((100 * pass) / total)} %) · citations hallucinées : ${halluc}** · ${new Date().toISOString()}`, ``,
    `| Cas | Attendu | Obtenu | OK | Détail |`, `|---|---|---|---|---|`,
    ...rows.map((r) => `| ${r.label} | ${r.expected} | ${r.got}${r.assertNote} | ${r.ok ? "✅" : "❌"} | ${r.detail}${r.badCites.length ? " · citations non trouvées: " + r.badCites.map((c: string) => `« ${c.slice(0, 40)}… »`).join(" ") : ""} |`),
  ];
  fs.writeFileSync(path.join("eval", "report.md"), lines.join("\n"));

  const fb = [
    `# FEEDBACK POUR CLAUDE CODE — issu de l'évaluation du ${new Date().toISOString().slice(0, 10)}`, ``,
    `Score : ${pass}/${total}. Les points ci-dessous sont des PATTERNS d'échec observés,`,
    `à corriger dans le moteur (src/lib/gap/engine.ts : prompt et logique), PAS en modifiant la vérité terrain ni le corpus.`,
    `Règle absolue inchangée : l'agent ne propose jamais de note.`, ``,
    ...(feedback.size ? [...feedback].map((f) => `- ${f}`) : ["- Aucun pattern d'échec : tous les cas passent. Ne rien changer au moteur."]),
    ``, `Détail complet des cas : eval/report.md. Après correction, relancer \`pnpm eval\` et vérifier la non-régression des cas déjà verts.`,
  ];
  fs.writeFileSync(path.join("eval", "FEEDBACK-CLAUDE-CODE.md"), fb.join("\n"));
  console.log(`\nScore ${pass}/${total} — hallucinations: ${halluc}`);
  console.log("→ eval/report.md · eval/FEEDBACK-CLAUDE-CODE.md");
  process.exit(fail > 0 ? 1 : 0);
}

main();
