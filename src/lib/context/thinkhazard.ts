/**
 * Connecteur ThinkHazard! (GFDRR / Banque mondiale) — niveaux d'aléa naturel par
 * pays (API JSON publique, sans clé). Source de référence Adaptation (voir PRODUCT.md).
 * Serveur uniquement. Ne transmet que le code de division administrative (donnée
 * publique). Les niveaux sont qualitatifs et non datés : year reste vide.
 * Aujourd'hui au niveau pays (ADM0) ; l'API sert aussi l'infranational (ADM1/ADM2),
 * à brancher quand la localisation du projet existera (BACKLOG P2).
 */
import { geoInfo } from "../context-sources";
import type { ContextIndicator } from "./types";

/* Aléas retenus pour l'analyse Adaptation, dans l'ordre d'affichage. */
const HAZARDS: Record<string, string> = {
  FL: "Aléa inondation fluviale",
  UF: "Aléa inondation urbaine",
  CF: "Aléa inondation côtière",
  EH: "Aléa chaleur extrême",
  DG: "Aléa pénurie d'eau",
  CY: "Aléa cyclone",
};

const LEVELS: Record<string, string> = {
  HIG: "Élevé",
  MED: "Moyen",
  LOW: "Faible",
  VLO: "Très faible",
};

interface ThRow { hazardtype: { mnemonic: string }; hazardlevel: { mnemonic: string } }

const cache = new Map<string, ContextIndicator[]>();

/** Niveaux d'aléa ThinkHazard! pour un pays (dimension Adaptation). */
export async function thinkHazardContext(geo: string): Promise<ContextIndicator[]> {
  const info = geoInfo(geo);
  if (!info?.th) return [];
  const cached = cache.get(info.th);
  if (cached) return cached;

  const res = await fetch(`https://thinkhazard.org/en/report/${info.th}.json`);
  if (!res.ok) throw new Error(`ThinkHazard ${res.status}`);
  const rows = (await res.json()) as ThRow[];
  const byMnemonic = new Map(rows.map((r) => [r.hazardtype.mnemonic, r.hazardlevel.mnemonic]));

  const out: ContextIndicator[] = [];
  for (const [mnemonic, label] of Object.entries(HAZARDS)) {
    const lvl = byMnemonic.get(mnemonic);
    if (!lvl || !LEVELS[lvl]) continue;
    out.push({
      label,
      value: LEVELS[lvl],
      unit: "",
      year: "",
      source: "ThinkHazard! (GFDRR)",
      sourceUrl: `https://thinkhazard.org/fr/report/${info.th}-${info.slug}`,
    });
  }
  cache.set(info.th, out);
  return out;
}
