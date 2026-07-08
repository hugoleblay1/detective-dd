/**
 * Contexte sourcé par dimension. Non bloquant : toute erreur → aucune donnée
 * (jamais d'affirmation non sourcée). Les indicateurs sont persistés en base
 * (cache mensuel) : base fraîche → servie telle quelle ; sinon les connecteurs
 * sont interrogés et le résultat stocké ; API en échec → dernière copie datée ;
 * base indisponible → connecteurs en direct (comportement d'origine).
 */
import type { DimKey } from "../grid";
import { geoInfo } from "../context-sources";
import type { ContextIndicator } from "./types";
import { worldBankContext } from "./worldbank";
import { cckpContext } from "./cckp";
import { aqueductContext } from "./aqueduct";
import { thinkHazardContext } from "./thinkhazard";
import { readIndicators, writeIndicators } from "./store";

async function fetchDimContext(dim: DimKey, geo: string): Promise<ContextIndicator[]> {
  // Adaptation : les trois sources de référence de l'équipe (CCKP, Aqueduct,
  // ThinkHazard — voir PRODUCT.md), chacune isolée : une source en échec
  // n'empêche pas les autres.
  const sources: Array<Promise<ContextIndicator[]>> =
    dim === "Adaptation"
      ? [cckpContext(geo), aqueductContext(geo), thinkHazardContext(geo)]
      : [worldBankContext(dim, geo)];
  const parts = await Promise.all(sources.map((p) => p.catch(() => [])));
  return parts.flat();
}

export async function getDimContext(dim: DimKey, geo: string): Promise<ContextIndicator[]> {
  try {
    const info = geoInfo(geo);
    if (!info) return [];
    const stored = await readIndicators(dim, info.iso3).catch(() => null);
    if (stored?.fresh) return stored.indicators;
    const fetched = await fetchDimContext(dim, geo);
    if (fetched.length === 0) return stored?.indicators ?? [];
    await writeIndicators(dim, info.iso3, fetched).catch(() => {});
    return fetched;
  } catch {
    return [];
  }
}

export type { ContextIndicator } from "./types";
