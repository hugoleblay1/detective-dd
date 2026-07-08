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
import { owidContext } from "./owid";
import { readIndicators, writeIndicators } from "./store";

async function fetchDimContext(dim: DimKey, geo: string): Promise<ContextIndicator[]> {
  // Chaque source est isolée : une source en échec n'empêche pas les autres.
  // Adaptation : les trois sources de référence de l'équipe (CCKP, Aqueduct,
  // ThinkHazard — voir PRODUCT.md). Atténuation : Banque mondiale + Ember (OWID).
  const sources: Array<Promise<ContextIndicator[]>> =
    dim === "Adaptation"
      ? [cckpContext(geo), aqueductContext(geo), thinkHazardContext(geo)]
      : dim === "Atténuation"
        ? [worldBankContext(dim, geo), owidContext(geo)]
        : [worldBankContext(dim, geo)];
  const parts = await Promise.all(sources.map((p) => p.catch(() => [])));
  return parts.flat();
}

export async function getDimContext(dim: DimKey, geo: string): Promise<ContextIndicator[]> {
  try {
    const info = geoInfo(geo);
    if (!info) return [];
    const stored = await readIndicators(dim, info.iso3).catch(() => null);
    if (stored && stored.every((r) => !r.stale)) return stored.map((r) => r.indicator);
    const fetched = await fetchDimContext(dim, geo);
    if (fetched.length === 0) return stored?.map((r) => r.indicator) ?? [];
    // Une source en échec transitoire ne doit pas effacer ses indicateurs pour
    // 30 jours : les lignes stockées absentes du fetch sont portées avec leur
    // date d'origine, tant qu'elles ne sont pas périmées (les indicateurs
    // retirés du code disparaissent donc d'eux-mêmes après le TTL).
    const carried = (stored ?? []).filter(
      (r) => !r.stale && !fetched.some((f) => f.label === r.indicator.label),
    );
    const rows = [
      ...fetched.map((indicator) => ({ indicator, fetchedAt: null, stale: false })),
      ...carried,
    ];
    await writeIndicators(dim, info.iso3, rows).catch(() => {});
    return rows.map((r) => r.indicator);
  } catch {
    return [];
  }
}

export type { ContextIndicator } from "./types";
