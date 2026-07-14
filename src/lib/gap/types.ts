/**
 * Contrats de l'analyse d'écart — types PURS (zod + types de grille), sans dépendance
 * serveur. Importables côté client (rendu des résultats) comme côté moteur (engine.ts).
 */
import { z } from "zod";
import type { DimKey, Note } from "../grid";
import type { ContextIndicator } from "../context/types";

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

// --- Avis qualitatif consolidé (appel LLM dédié, un par dimension) ---
// Un appui = une affirmation + sa citation obligatoire (≤15 mots, nom du doc/source).
export const Appui = z.object({
  point: z.string(),
  citation: z.string(),
});
// Une faiblesse peut être une ABSENCE → citation optionnelle (on ne cite pas ce qui manque).
export const Faiblesse = z.object({
  point: z.string(),
  citation: z.string().optional(),
});
// Maturité = complétude DOCUMENTAIRE du dossier au regard de ce qu'exige la note visée.
// Ce n'est ni une note ni un jugement de mérite du projet (règle 1 : jamais de note).
export const Maturite = z.object({
  niveau: z.enum(["complet", "partiel", "insuffisant"]),
  justification: z.string(),
});
export const DimSynthesis = z.object({
  forces: z.array(Appui).default([]),
  faiblesses: z.array(Faiblesse).default([]),
  a_obtenir: z.array(z.string()).default([]),
  maturite: Maturite,
});
export type TDimSynthesis = z.infer<typeof DimSynthesis>;

// Dimensions exclues de l'analyse du dossier — le Genre est évalué via son propre
// questionnaire et outil (2X) : une partie de ses questions n'est pas réponse ici,
// et sa verbosité fait déborder la sortie JSON. À réintégrer plus tard (cf. BACKLOG).
export const DIMS_EXCLUDED_FROM_ANALYSIS: readonly DimKey[] = ["Genre"];

export interface ClientDoc { name: string; text: string }
export interface AnalyzeTarget { note: Note; crit?: string | null }
export interface AnalyzeRequest {
  sector: string; subtype: string; geo: string; dealText: string;
  targets: Partial<Record<DimKey, AnalyzeTarget>>;
  docs: ClientDoc[];
}
export interface DimAnalysis {
  dim: DimKey; note: Note; crit: string | null; exigence: string;
  questions: { id: string; q: string; ress: string; comm: string }[];
  context: ContextIndicator[];
  /** Documents de la bibliothèque IMP dont des passages ont nourri les prompts (RAG). */
  library: Array<{ title: string; pages: number[] }>;
  libraryError?: string;
  /** Docs qualifiés pour la dimension mais sans passage indexé — pas encore lisibles par l'IA. */
  libraryNotIndexed?: string[];
  result: TBlockResult; engine: "ia" | "erreur";
  error?: string;
  /** Citations « » introuvables verbatim dans les docs client, supprimées après retry (règle 5). */
  citationsRejetees?: number;
  synthesis: TDimSynthesis | null; synthesisError?: string;
}
