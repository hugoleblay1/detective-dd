/**
 * Connecteur Our World in Data (grapher CSV, public, sans clé) — utilisé pour
 * les données Ember sur l'électricité (intensité carbone du réseau, part
 * renouvelable), plus fraîches que la Banque mondiale sur ce champ.
 * Serveur uniquement ; ne transmet que l'ISO3 du pays. `tab=chart&country=~ISO3`
 * renvoie la série annuelle du seul pays : on prend la dernière ligne.
 */
import { geoInfo } from "../context-sources";
import type { ContextIndicator } from "./types";

interface OwidSpec { slug: string; label: string; unit: string; source: string }

/* Indicateurs Atténuation. Les entités OWID de nos pays ne contiennent pas de
   virgule (« Cote d'Ivoire ») : le parsing CSV par split est sûr ici. */
const SPECS: OwidSpec[] = [
  {
    slug: "carbon-intensity-electricity",
    label: "Intensité carbone de l'électricité",
    unit: " gCO₂/kWh",
    source: "Ember — via Our World in Data",
  },
  {
    slug: "share-electricity-renewables",
    label: "Part renouvelable de l'électricité",
    unit: " %",
    source: "Ember — via Our World in Data",
  },
];

const cache = new Map<string, ContextIndicator | null>();

async function fetchOne(iso3: string, spec: OwidSpec): Promise<ContextIndicator | null> {
  const key = `${iso3}:${spec.slug}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let result: ContextIndicator | null = null;
  try {
    const res = await fetch(
      `https://ourworldindata.org/grapher/${spec.slug}.csv?csvType=filtered&tab=chart&country=%7E${iso3}`,
    );
    if (res.ok) {
      const lines = (await res.text()).trim().split("\n");
      const last = lines.length > 1 ? lines[lines.length - 1].split(",") : null;
      const value = last ? Number.parseFloat(last[3]) : Number.NaN;
      if (last && last[1] === iso3 && Number.isFinite(value)) {
        result = {
          label: spec.label,
          value: Math.round(value * 10) / 10,
          unit: spec.unit,
          year: last[2],
          source: spec.source,
          sourceUrl: `https://ourworldindata.org/grapher/${spec.slug}?country=~${iso3}`,
        };
      }
    }
  } catch {
    result = null;
  }
  cache.set(key, result);
  return result;
}

/** Indicateurs électricité (Ember via OWID) pour un pays (dimension Atténuation). */
export async function owidContext(geo: string): Promise<ContextIndicator[]> {
  const info = geoInfo(geo);
  if (!info) return [];
  const results = await Promise.all(SPECS.map((s) => fetchOne(info.iso3, s)));
  return results.filter((x): x is ContextIndicator => x !== null);
}
