/* Audit de parité : logique prototype (docs/prototype-spec.html) vs src/lib/grid.ts. */
import fs from "node:fs";
import * as G from "../src/lib/grid";

const grid = JSON.parse(fs.readFileSync("content/proparco/numerique.json", "utf8")) as G.SectorGrid;
const SUBS = Object.keys(grid.subtypes);
const DIMS: G.DimKey[] = ["Atténuation", "Adaptation", "Social", "Genre", "Biodiversité"];
const NOTES: G.Note[] = ["-2", "-1", "0", "+1", "+2", "+3"];

/* ---------- fonctions PROTOTYPE (copiées de l'HTML) ---------- */
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const NA_RX = [/^\s*non applicable/i, /crit[eè]re\s+de\s+notation\s+non\s+applicable/i, /se\s+reporter\s+aux?\s+crit[eè]res?/i, /crit[eè]re\s+[^.]{0,40}pr[ée]vaut/i];
const lvlNA = (t?: string) => { const s = (t ?? "").trim(); return !!s && NA_RX.some((r) => r.test(s)); };
const usableLevels = (levels: Record<string, string>) => { const o: Record<string, string> = {}; Object.keys(levels || {}).forEach((k) => { if (!lvlNA(levels[k])) o[k] = levels[k]; }); return o; };
type Cr = G.Criterion;
const critExcluded = (cr: Cr) => { const l = cr.summary.levels; const ks = Object.keys(l); return ks.length > 0 && ks.every((k) => lvlNA(l[k])); };
const dimKey = (name: string): G.DimKey | null => { const u = (name || "").toUpperCase(); if (u.includes("ATTÉN") || u.includes("ATTEN")) return "Atténuation"; if (u.includes("ADAPT")) return "Adaptation"; if (u.includes("SOCIAL") || u.includes("INCLUS")) return "Social"; if (u.includes("GENRE")) return "Genre"; if (u.includes("BIODIV")) return "Biodiversité"; return null; };
const dimObjP = (sub: string, dk: G.DimKey) => grid.subtypes[sub].notation_dd.dimensions.find((d) => dimKey(d.dimension) === dk);
function critsForNoteP(sub: string, dk: G.DimKey, note: G.Note): string[] { const d = dimObjP(sub, dk); if (!d) return []; return d.criteria.filter((c) => !critExcluded(c) && c.summary.levels[note] && !lvlNA(c.summary.levels[note])).map((c) => c.criterion); }
const critList = (sub: string, dk: G.DimKey) => { const d = dimObjP(sub, dk); return d ? d.criteria.map((c) => c.criterion) : []; };
const multiCrit = (sub: string, dk: G.DimKey) => critList(sub, dk).length > 1;
function singleNoteCritsP(sub: string, dk: G.DimKey) { const d = dimObjP(sub, dk); if (!d) return []; return d.criteria.filter((c) => !critExcluded(c)).map((c) => { const u = Object.keys(usableLevels(c.summary.levels)).filter((k) => k !== "0"); return u.length === 1 ? { crit: c.criterion, note: u[0] } : null; }).filter(Boolean) as { crit: string; note: string }[]; }
function qMatchesCritP(q: G.KeyQuestion, dk: G.DimKey, crit: string | null): boolean {
  const qd = (q.dimension || "").trim();
  if (!qd || norm(qd) === "general") return true;
  if (dk === "Social") { const isCritQ = ["acces", "accès", "emplois", "territoires", "chaines", "chaînes"].some((p) => norm(qd).startsWith(norm(p).slice(0, 5))); if (!isCritQ) return true; return crit ? norm(qd).startsWith(norm(crit).slice(0, 5)) : true; }
  if (dk === "Genre") { const isMeta = norm(qd).startsWith("termino") || norm(qd).startsWith("methodo"); if (isMeta) return true; const isProduct = norm(qd).startsWith("critere produit"); if (crit && norm(crit).includes("boost")) return !isProduct; return true; }
  return true;
}
function qsForDimP(sub: string, dk: G.DimKey, crit: string | null, note: G.Note | null): G.KeyQuestion[] {
  const arr = grid.subtypes[sub].key_qs.questions; let base: G.KeyQuestion[];
  if (dk === "Social") base = arr.filter((q) => q.thematique === "Social");
  else if (dk === "Genre") base = arr.filter((q) => q.thematique === "Genre");
  else base = arr.filter((q) => q.thematique === "Planète" && (q.dimension || "").toLowerCase().startsWith(dk.slice(0, 5).toLowerCase()));
  let out = crit ? base.filter((q) => qMatchesCritP(q, dk, crit)) : base;
  if (note) out = out.filter((q) => { const v = (q.note_visee || "").trim(); return !v || v.includes(note); });
  return out;
}
function exigenceP(sub: string, dk: G.DimKey, note: G.Note, crit: string | null): string {
  const dim = dimObjP(sub, dk); if (!dim) return "";
  const parts: string[] = [];
  const pool = crit ? dim.criteria.filter((c) => c.criterion === crit) : dim.criteria;
  pool.forEach((cr) => { const t = cr.summary.levels[note] || (cr.detail && cr.detail.levels[note]); if (t) parts.push(`${cr.criterion} : ${t}`); });
  let ex = parts.join("\n\n");
  if (multiCrit(sub, dk)) ex = `Logique : atteindre le niveau ${note} sur UN SEUL critère suffit${crit ? ` — critère visé : ${crit}` : ""}.\n\n` + ex;
  if (dim.prerequisite && (note === "+2" || note === "+3")) ex = dim.prerequisite + "\n\n" + ex;
  return ex;
}

/* ---------- diff ---------- */
const diffs: string[] = [];
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function check(label: string, proto: unknown, app: unknown) { if (!eq(proto, app)) diffs.push(`✗ ${label}\n    proto: ${JSON.stringify(proto)}\n    app:   ${JSON.stringify(app)}`); }

for (const sub of SUBS) {
  for (const dk of DIMS) {
    const d = dimObjP(sub, dk); if (!d) continue;
    // critExcluded per criterion
    for (const cr of d.criteria) check(`critExcluded [${sub}/${dk}/${cr.criterion}]`, critExcluded(cr), G.critExcluded(cr));
    // naList / singleNoteCrits
    check(`naList [${sub}/${dk}]`, dimObjP(sub, dk)!.criteria.filter(critExcluded).map((c) => c.criterion), G.naList(grid, sub, dk).map((x) => x.crit));
    check(`singleNoteCrits [${sub}/${dk}]`, singleNoteCritsP(sub, dk), G.singleNoteCrits(grid, sub, dk));
    // critsForNote per note
    for (const note of NOTES) check(`critsForNote [${sub}/${dk}/${note}]`, critsForNoteP(sub, dk, note), G.critsForNote(grid, sub, dk, note));
    // questionsFor / exigence per crit×note
    const crits: (string | null)[] = [null, ...critList(sub, dk)];
    for (const crit of crits) {
      for (const note of [null, ...NOTES] as (G.Note | null)[]) {
        check(`questionsFor [${sub}/${dk}/crit=${crit}/note=${note}]`, qsForDimP(sub, dk, crit, note).map((q) => q.question), G.questionsFor(grid, sub, dk, crit, note).map((q) => q.question));
        if (note) check(`exigence [${sub}/${dk}/crit=${crit}/note=${note}]`, exigenceP(sub, dk, note, crit), G.exigence(grid, sub, dk, note, crit));
      }
    }
  }
}

console.log(diffs.length ? diffs.join("\n") : "✓ AUCUN écart de logique métier.");
console.log(`\n${diffs.length} écart(s).`);
