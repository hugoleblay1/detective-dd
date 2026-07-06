/**
 * Couche grille — logique métier portée du prototype validé (docs/prototype-spec.html).
 * Règles clés :
 *  - Un critère peut être non mobilisable pour un sous-type (texte « Non applicable »,
 *    « le critère X prévaut », « se reporter aux critères… ») → exclu.
 *  - Au sein d'un critère, seuls les niveaux réellement mobilisables sont exposés.
 *  - Logique OR : une note se valide sur UN critère (+ prérequis de la dimension).
 *  - Les questions sont filtrées par dimension, critère visé et note visée.
 */
import fs from "node:fs";
import path from "node:path";

export type Note = "-2" | "-1" | "0" | "+1" | "+2" | "+3";
export type DimKey = "Atténuation" | "Adaptation" | "Social" | "Genre" | "Biodiversité";

export interface CriterionView { levels: Record<string, string>; example: string | null }
export interface Criterion { criterion: string; summary: CriterionView; detail: CriterionView | null }
export interface Dimension {
  dimension: string; pillar: string; objective: string;
  prerequisite: string | null; connector_note: string | null;
  scale: string[]; criteria: Criterion[];
}
export interface KeyQuestion {
  section: string | null; question: string; thematique: string | null;
  dimension: string | null; note_visee: string | null;
  commentaire: string | null; ressources: string | null;
}
export interface SectorGrid {
  sector: string;
  subtypes: Record<string, { notation_dd: { title: string; dimensions: Dimension[] }; key_qs: { title: string; questions: KeyQuestion[] } }>;
}

const CONTENT_DIR = process.env.CONTENT_DIR ?? path.join(process.cwd(), "content", "proparco");

let cache: Record<string, SectorGrid> | null = null;
export function loadGrids(): Record<string, SectorGrid> {
  if (cache) return cache;
  cache = {};
  for (const f of fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json"))) {
    const g = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), "utf-8")) as SectorGrid;
    cache[g.sector] = g;
  }
  return cache;
}

/* ---------- non-applicabilité ---------- */
const NA_RX = [
  /^\s*non applicable/i,
  /crit[eè]re\s+de\s+notation\s+non\s+applicable/i,
  /se\s+reporter\s+aux?\s+crit[eè]res?/i,
  /crit[eè]re\s+[^.]{0,40}pr[ée]vaut/i,
];
export const lvlNA = (t?: string | null) => { const s = (t ?? "").trim(); return !!s && NA_RX.some((r) => r.test(s)); };
export const usableLevels = (levels: Record<string, string>) =>
  Object.fromEntries(Object.entries(levels ?? {}).filter(([, v]) => !lvlNA(v)));
export const critExcluded = (cr: Criterion) => {
  const ks = Object.keys(cr.summary.levels); return ks.length > 0 && ks.every((k) => lvlNA(cr.summary.levels[k]));
};
export function critNAExpl(cr: Criterion): string {
  for (const t of Object.values(cr.summary.levels)) if (lvlNA(t))
    return t.replace(/^\s*non applicable\s*[-–:]*\s*/i, "").trim() || t;
  return "non mobilisable pour ce type d'investissement";
}

/* ---------- accès dimensions/critères ---------- */
export function dimKeyOf(name: string): DimKey | null {
  const u = (name || "").toUpperCase();
  if (u.includes("ATTÉN") || u.includes("ATTEN")) return "Atténuation";
  if (u.includes("ADAPT")) return "Adaptation";
  if (u.includes("SOCIAL") || u.includes("INCLUS")) return "Social";
  if (u.includes("GENRE")) return "Genre";
  if (u.includes("BIODIV")) return "Biodiversité";
  return null;
}
export function dimObj(grid: SectorGrid, subtype: string, dk: DimKey): Dimension | undefined {
  return grid.subtypes[subtype]?.notation_dd.dimensions.find((d) => dimKeyOf(d.dimension) === dk);
}
export function critsForNote(grid: SectorGrid, subtype: string, dk: DimKey, note: Note): string[] {
  const d = dimObj(grid, subtype, dk); if (!d) return [];
  return d.criteria
    .filter((c) => !critExcluded(c) && c.summary.levels[note] && !lvlNA(c.summary.levels[note]))
    .map((c) => c.criterion);
}

/* ---------- questions ---------- */
const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function qMatchesCrit(q: KeyQuestion, dk: DimKey, crit: string | null): boolean {
  const qd = (q.dimension ?? "").trim();
  if (!qd || norm(qd) === "general") return true;
  if (dk === "Social") {
    const isCritQ = ["acces", "emplois", "territoires", "chain"].some((p) => norm(qd).startsWith(p));
    if (!isCritQ) return true;
    return crit ? norm(qd).startsWith(norm(crit).slice(0, 5)) : true;
  }
  if (dk === "Genre") {
    if (norm(qd).startsWith("termino") || norm(qd).startsWith("methodo")) return true;
    const isProduct = norm(qd).startsWith("critere produit");
    if (crit && norm(crit).includes("boost")) return !isProduct;
    return true;
  }
  return true;
}
export function questionsFor(grid: SectorGrid, subtype: string, dk: DimKey, crit: string | null, note: Note | null): KeyQuestion[] {
  const arr = grid.subtypes[subtype]?.key_qs.questions ?? [];
  let base: KeyQuestion[];
  if (dk === "Social") base = arr.filter((q) => q.thematique === "Social");
  else if (dk === "Genre") base = arr.filter((q) => q.thematique === "Genre");
  else base = arr.filter((q) => q.thematique === "Planète" && (q.dimension ?? "").toLowerCase().startsWith(dk.slice(0, 5).toLowerCase()));
  let out = crit ? base.filter((q) => qMatchesCrit(q, dk, crit)) : base;
  if (note) out = out.filter((q) => { const v = (q.note_visee ?? "").trim(); return !v || v.includes(note); });
  return out;
}

/* ---------- exigence ---------- */
export function exigence(grid: SectorGrid, subtype: string, dk: DimKey, note: Note, crit: string | null): string {
  const d = dimObj(grid, subtype, dk); if (!d) return "";
  const pool = crit ? d.criteria.filter((c) => c.criterion === crit) : d.criteria.filter((c) => !critExcluded(c));
  const parts: string[] = [];
  for (const cr of pool) {
    const t = cr.summary.levels[note] ?? cr.detail?.levels[note];
    if (t && !lvlNA(t)) parts.push(`${cr.criterion} : ${t}`);
  }
  let ex = parts.join("\n\n");
  if (d.criteria.filter((c) => !critExcluded(c)).length > 1)
    ex = `Logique : atteindre le niveau ${note} sur UN SEUL critère suffit${crit ? ` — critère visé : ${crit}` : ""}.\n\n` + ex;
  if (d.prerequisite && (note === "+2" || note === "+3")) ex = d.prerequisite + "\n\n" + ex;
  return ex;
}
