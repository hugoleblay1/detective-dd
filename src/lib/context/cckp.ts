/**
 * Connecteur CCKP — Climate Change Knowledge Portal de la Banque mondiale
 * (API JSON publique, sans clé). Source de référence Adaptation (voir PRODUCT.md).
 * Serveur uniquement ; ne transmet que l'ISO3 du pays. Le portail sert aussi des
 * données infranationales, à brancher quand la localisation existera (BACKLOG P2).
 * Format d'appel : {collection}_{variable}_{produit}_{agrégation}_{période}_{percentile}_{scénario}_{ensemble}_{statistique}/{ISO3}
 */
import { geoInfo } from "../context-sources";
import type { ContextIndicator } from "./types";

interface CckpSpec { query: string; label: string; unit: string; year: string }

const SPECS: CckpSpec[] = [
  {
    query: "cmip6-x0.25_climatology_tas_anomaly_annual_2040-2059_median_ssp245_ensemble_all_mean",
    label: "Réchauffement projeté (SSP2-4.5)",
    unit: " °C", year: "2040-2059",
  },
  {
    query: "cmip6-x0.25_climatology_hd35_climatology_annual_1995-2014_median_historical_ensemble_all_mean",
    label: "Jours > 35 °C par an",
    unit: " j", year: "1995-2014",
  },
  {
    query: "cmip6-x0.25_climatology_pr_climatology_annual_1995-2014_median_historical_ensemble_all_mean",
    label: "Précipitations annuelles",
    unit: " mm", year: "1995-2014",
  },
];

const SOURCE = "Banque mondiale — CCKP";
const cache = new Map<string, ContextIndicator | null>();

async function fetchOne(iso3: string, slug: string, spec: CckpSpec): Promise<ContextIndicator | null> {
  const key = `${iso3}:${spec.query}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let result: ContextIndicator | null = null;
  try {
    const res = await fetch(`https://cckpapi.worldbank.org/cckp/v1/${spec.query}/${iso3}?_format=json`);
    if (res.ok) {
      const data = (await res.json()) as { data?: Record<string, Record<string, number | null>> };
      const value = Object.values(data.data?.[iso3] ?? {})[0];
      if (value !== null && value !== undefined) {
        result = {
          label: spec.label,
          value: Math.round(Number(value) * 10) / 10,
          unit: spec.unit,
          year: spec.year,
          source: SOURCE,
          sourceUrl: `https://climateknowledgeportal.worldbank.org/country/${slug}`,
        };
      }
    }
  } catch {
    result = null;
  }
  cache.set(key, result);
  return result;
}

/** Indicateurs climat CCKP pour un pays (dimension Adaptation). */
export async function cckpContext(geo: string): Promise<ContextIndicator[]> {
  const info = geoInfo(geo);
  if (!info) return [];
  const results = await Promise.all(SPECS.map((s) => fetchOne(info.iso3, info.slug, s)));
  return results.filter((x): x is ContextIndicator => x !== null);
}
