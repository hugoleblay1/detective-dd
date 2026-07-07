/**
 * Données de dev (corpus FACTICE uniquement). Scanne library-sample, upsert, puis
 * qualifie 3 documents comme dans le prototype pour démontrer le contexte interne.
 * Idempotent. `pnpm db:seed` (Postgres doit tourner).
 */
import fs from "node:fs";
import path from "node:path";
import { pool } from "../../src/lib/db";
import { upsertScanned, qualifyDocument, listDocuments } from "../../src/lib/library.server";
import { walk } from "../indexer/scan";
import type { QualifyInput } from "../../src/lib/library";

const ROOT = process.env.LIBRARY_ROOT || "./library-sample";

/** Fixtures factices recréées si absentes (library-sample est gitignoré). */
const FIXTURES = [
  "Kenya/2026-05-12_Kenya_Adaptation_Note-risque-climatique.pdf",
  "Afrique/2026-04-02_Afrique_Attenuation_Facteurs-emission-reseaux.xlsx",
  "Senegal/2026-03-18_Senegal_Social_Profil-inclusion-numerique.pdf",
  "_nouveaux/rapport_genre_2X_v3 final.pdf",
  "_nouveaux/DC_wateruse_benchmarks_draft.xlsx",
];
function ensureFixtures() {
  for (const rel of FIXTURES) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, ""); }
  }
}

const QUALIFY: Array<{ match: string; meta: QualifyInput }> = [
  { match: "Note-risque-climatique", meta: { title: "Note risque climatique — Kenya", geoLevel: "Pays", geoName: "Kenya", dims: ["Adaptation"], tags: ["eau", "chaleur", "inondation"] } },
  { match: "Facteurs-emission-reseaux", meta: { title: "Facteurs d'émission réseaux — Afrique", geoLevel: "Continental", geoName: "Afrique", dims: ["Atténuation"], tags: ["GES", "électricité"] } },
  { match: "Profil-inclusion-numerique", meta: { title: "Profil inclusion numérique — Sénégal", geoLevel: "Pays", geoName: "Sénégal", dims: ["Social"], tags: ["fracture numérique", "rural"] } },
];

async function main() {
  ensureFixtures();
  for (const e of walk(ROOT)) await upsertScanned(e);
  const docs = await listDocuments();
  let n = 0;
  for (const q of QUALIFY) {
    const doc = docs.find((d) => d.file.includes(q.match));
    if (doc) { await qualifyDocument(doc.id, q.meta); n++; }
  }
  console.log(`${docs.length} docs en base — ${n} qualifiés (démo).`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
