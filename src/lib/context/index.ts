/** Contexte sourcé par dimension. Non bloquant : toute erreur → aucune donnée (jamais d'affirmation non sourcée). */
import type { DimKey } from "../grid";
import type { ContextIndicator } from "./types";
import { worldBankContext } from "./worldbank";
import { cckpContext } from "./cckp";
import { aqueductContext } from "./aqueduct";
import { thinkHazardContext } from "./thinkhazard";

export async function getDimContext(dim: DimKey, geo: string): Promise<ContextIndicator[]> {
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

export type { ContextIndicator } from "./types";
