/**
 * Chargement des grilles depuis `content/` — IO uniquement (jamais côté client).
 * La logique métier vit dans `grid.ts` (module pur, importable par l'UI).
 */
import fs from "node:fs";
import path from "node:path";
import type { SectorGrid } from "./grid";

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
