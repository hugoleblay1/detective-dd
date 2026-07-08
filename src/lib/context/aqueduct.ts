/**
 * Connecteur WRI Aqueduct — stress hydrique de base par pays, via l'API SQL
 * publique de la table Carto des « country rankings » (Aqueduct 3.0, 2019).
 * Source de référence Adaptation (voir PRODUCT.md). Serveur uniquement ; ne
 * transmet que l'ISO3. L'atlas couvre aussi le niveau bassin/local, à brancher
 * quand la localisation du projet existera (BACKLOG P2).
 */
import { geoInfo } from "../context-sources";
import type { ContextIndicator } from "./types";

const TABLE = "aqueduct_results_v01_country_v03";
/* Catégories Aqueduct (cat 0 → 4) en français. */
const CATS = ["Faible", "Faible à moyen", "Moyen à élevé", "Élevé", "Extrêmement élevé"];

const ATLAS_URL = "https://www.wri.org/applications/aqueduct/water-risk-atlas/";
const cache = new Map<string, ContextIndicator[]>();

/** Stress hydrique de base Aqueduct (pondération « Tot ») pour un pays. */
export async function aqueductContext(geo: string): Promise<ContextIndicator[]> {
  const info = geoInfo(geo);
  if (!info) return [];
  const cached = cache.get(info.iso3);
  if (cached) return cached;

  const q = encodeURIComponent(
    `SELECT cat FROM ${TABLE} WHERE gid_0='${info.iso3}' AND indicator_name='bws' AND weight='Tot'`,
  );
  const res = await fetch(`https://wri-rw.carto.com/api/v2/sql?q=${q}`);
  if (!res.ok) throw new Error(`Aqueduct ${res.status}`);
  const data = (await res.json()) as { rows?: Array<{ cat: number | null }> };
  const cat = data.rows?.[0]?.cat;

  const out: ContextIndicator[] =
    cat !== null && cat !== undefined && CATS[cat]
      ? [{
          label: "Stress hydrique de base (Aqueduct)",
          value: CATS[cat],
          unit: "",
          year: "2019",
          source: "WRI Aqueduct",
          sourceUrl: ATLAS_URL,
        }]
      : [];
  cache.set(info.iso3, out);
  return out;
}
