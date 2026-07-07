/**
 * Contrats de l'analyse d'écart — types PURS (zod + types de grille), sans dépendance
 * serveur. Importables côté client (rendu des résultats) comme côté moteur (engine.ts).
 */
import { z } from "zod";
import type { DimKey, Note } from "../grid";

export const Verdict = z.object({
  id: z.string(),
  statut: z.enum(["repondu", "partiel", "manquant"]),
  disponibles: z.array(z.string()).default([]),
  manquants: z.array(z.string()).default([]),
});
export const BlockResult = z.object({
  verdicts: z.array(Verdict),
  a_redemander: z.array(z.string()).default([]),
});
export type TVerdict = z.infer<typeof Verdict>;
export type TBlockResult = z.infer<typeof BlockResult>;

export interface ClientDoc { name: string; text: string }
export interface AnalyzeTarget { note: Note; crit?: string | null }
export interface AnalyzeRequest {
  sector: string; subtype: string; geo: string; dealText: string;
  targets: Partial<Record<DimKey, AnalyzeTarget>>;
  docs: ClientDoc[];
}
export interface DimAnalysis {
  dim: DimKey; note: Note; crit: string | null; exigence: string;
  questions: { id: string; q: string; ress: string }[];
  result: TBlockResult; engine: "ia" | "erreur";
  error?: string;
}
