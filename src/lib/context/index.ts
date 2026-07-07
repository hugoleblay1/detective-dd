/** Contexte sourcé par dimension. Non bloquant : toute erreur → aucune donnée (jamais d'affirmation non sourcée). */
import type { DimKey } from "../grid";
import type { ContextIndicator } from "./types";
import { worldBankContext } from "./worldbank";

export async function getDimContext(dim: DimKey, geo: string): Promise<ContextIndicator[]> {
  try {
    return await worldBankContext(dim, geo);
  } catch {
    return [];
  }
}

export type { ContextIndicator } from "./types";
