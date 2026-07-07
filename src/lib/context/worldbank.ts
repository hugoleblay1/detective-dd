/**
 * Connecteur Banque mondiale — indicateurs officiels par pays (API publique, sans clé).
 * Serveur uniquement (fetch). Ne transmet que l'ISO3 du pays (donnée publique) ;
 * aucun document client ne sort. L'API renvoie du XML d'erreur sous charge → on
 * réessaie, avec un plafond de concurrence, et on met en cache (valeurs et absences).
 */
import { geoInfo } from "../context-sources";
import type { DimKey } from "../grid";
import type { ContextIndicator } from "./types";

interface IndSpec { code: string; label: string; unit: string }

const INDICATORS: Partial<Record<DimKey, IndSpec[]>> = {
  "Atténuation": [
    { code: "EG.ELC.RNEW.ZS", label: "Part renouvelable de l'électricité", unit: " %" },
    { code: "EN.ATM.CO2E.PC", label: "Émissions de CO₂ par habitant", unit: " t" },
  ],
  "Social": [
    { code: "EG.ELC.ACCS.ZS", label: "Accès à l'électricité", unit: " % pop." },
    { code: "IT.NET.USER.ZS", label: "Utilisateurs d'Internet", unit: " % pop." },
    { code: "SI.POV.DDAY", label: "Pauvreté (< 2,15 $/j)", unit: " % pop." },
    { code: "SP.RUR.TOTL.ZS", label: "Population rurale", unit: " % pop." },
  ],
  "Genre": [
    { code: "SL.TLF.CACT.FM.ZS", label: "Ratio d'activité femmes/hommes", unit: " %" },
    { code: "SG.GEN.PARL.ZS", label: "Sièges de femmes au parlement", unit: " %" },
  ],
  "Biodiversité": [
    { code: "ER.LND.PTLD.ZS", label: "Aires protégées terrestres", unit: " % du territoire" },
    { code: "AG.LND.FRST.ZS", label: "Superficie forestière", unit: " % du territoire" },
  ],
};

const SOURCE = "Banque mondiale";
const cache = new Map<string, ContextIndicator | null>();

/* plafond de concurrence simple pour ménager l'API */
let active = 0;
const waiters: Array<() => void> = [];
async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 3) await new Promise<void>((r) => waiters.push(r));
  active++;
  try { return await fn(); } finally { active--; waiters.shift()?.(); }
}

async function fetchOne(iso3: string, spec: IndSpec): Promise<ContextIndicator | null> {
  const key = `${iso3}:${spec.code}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let result: ContextIndicator | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.worldbank.org/v2/country/${iso3}/indicator/${spec.code}?format=json&mrnev=1`);
      const txt = await res.text();
      if (!txt.trimStart().startsWith("[")) throw new Error("réponse non-JSON (limite de débit)");
      const data = JSON.parse(txt) as [unknown, Array<{ value: number | null; date: string }> | null];
      const row = data?.[1]?.[0];
      if (row && row.value !== null && row.value !== undefined) {
        result = {
          label: spec.label,
          value: Math.round(Number(row.value) * 10) / 10,
          unit: spec.unit,
          year: String(row.date),
          source: SOURCE,
          sourceUrl: `https://data.worldbank.org/indicator/${spec.code}`,
        };
      }
      break; // JSON valide (valeur trouvée ou réellement absente) → pas de retry
    } catch {
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  cache.set(key, result);
  return result;
}

/** Indicateurs Banque mondiale pertinents pour une dimension et un pays. */
export async function worldBankContext(dim: DimKey, geo: string): Promise<ContextIndicator[]> {
  const info = geoInfo(geo);
  const specs = INDICATORS[dim];
  if (!info || !specs) return [];
  const results = await Promise.all(specs.map((s) => withLimit(() => fetchOne(info.iso3, s))));
  return results.filter((x): x is ContextIndicator => x !== null);
}
