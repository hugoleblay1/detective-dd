/**
 * Chargement des grilles depuis `content/` — IO uniquement (jamais côté client).
 * La logique métier vit dans `grid.ts` (module pur, importable par l'UI).
 */
import fs from "node:fs";
import path from "node:path";
import type { MethodDefinition, SectorGrid } from "./grid";

const CONTENT_DIR = process.env.CONTENT_DIR ?? path.join(process.cwd(), "content", "proparco");
/* Fichiers de content/ qui ne sont pas des grilles sectorielles. */
const NOT_A_GRID = new Set(["definitions.json"]);

let cache: Record<string, SectorGrid> | null = null;
export function loadGrids(): Record<string, SectorGrid> {
  if (cache) return cache;
  cache = {};
  for (const f of fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".json") && !NOT_A_GRID.has(f))) {
    const g = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), "utf-8")) as SectorGrid;
    cache[g.sector] = g;
  }
  return cache;
}

/** Définitions méthodologiques du client — [] si le fichier est absent. */
let defsCache: MethodDefinition[] | null = null;
export function loadDefinitions(): MethodDefinition[] {
  if (defsCache) return defsCache;
  const file = path.join(CONTENT_DIR, "definitions.json");
  if (!fs.existsSync(file)) return (defsCache = []);
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as { definitions: MethodDefinition[] };
  return (defsCache = data.definitions ?? []);
}
