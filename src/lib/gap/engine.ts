/**
 * Moteur d'analyse d'écart — un appel LLM PAR dimension (jamais un appel global :
 * sorties courtes = pas de troncature JSON), contrat de sortie validé par zod.
 * L'agent ne propose JAMAIS de note : il évalue la couverture.
 */
import { getProvider } from "../llm";
import { SectorGrid, DimKey, critsForNote, questionsFor, exigence } from "../grid";
import { BlockResult, type AnalyzeRequest, type AnalyzeTarget, type DimAnalysis } from "./types";

export * from "./types";

function blockPrompt(b: DimAnalysis, req: AnalyzeRequest, docs: string): string {
  return `Tu es un analyste de l'équipe Impact d'une institution de financement du développement. Tu lis et COMPRENDS les documents fournis (contexte, chiffres, engagements — pas une recherche de mots-clés). Tu ne proposes JAMAIS de note.
Dossier: ${req.subtype}, ${req.geo}. Description: """${req.dealText.slice(0, 2500)}"""
Documents du client:
${docs || "(aucun document fourni)"}

Dimension analysée: ${b.dim} — note visée ${b.note}${b.crit ? ` — critère visé : ${b.crit}` : ""}
Exigence de la grille:
${b.exigence.slice(0, 1500)}
Questions:
${b.questions.map((x) => `- [${x.id}] ${x.q.split("\n").join(" ")}${x.ress ? ` (docs attendus: ${x.ress})` : ""}`).join("\n")}

Pour CHAQUE question: statut "repondu" (réellement couvert), "partiel" ou "manquant" (sois strict, ne déduis pas d'un thème voisin). "disponibles": max 2 points ultra-courts, chacun avec citation exacte ≤12 mots entre « » + nom du document. "manquants": max 2 points précis (nommer le document à demander).
Réponds STRICTEMENT en JSON compact sans backticks ni texte autour:
{"verdicts":[{"id":"...","statut":"...","disponibles":["..."],"manquants":["..."]}],"a_redemander":["..."]}`;
}

function parseLLMJson(txt: string): unknown {
  const i = txt.indexOf("{"); const j = txt.lastIndexOf("}");
  if (i < 0 || j <= i) throw new Error("réponse sans JSON");
  return JSON.parse(txt.slice(i, j + 1));
}

export async function analyze(grid: SectorGrid, req: AnalyzeRequest): Promise<DimAnalysis[]> {
  const provider = getProvider();
  const docs = req.docs.map((d) => `### ${d.name}\n${d.text.slice(0, 12000)}`).join("\n\n");

  const blocks: DimAnalysis[] = (Object.entries(req.targets) as [DimKey, AnalyzeTarget][]).map(([dk, t]) => {
    const pool = critsForNote(grid, req.subtype, dk, t.note);
    const crit = t.crit && pool.includes(t.crit) ? t.crit : pool.length > 1 ? pool[0] : pool[0] ?? null;
    const questions = questionsFor(grid, req.subtype, dk, crit, t.note)
      .map((q, i) => ({ id: dk.slice(0, 3).toUpperCase() + (i + 1), q: q.question, ress: q.ressources ?? "" }));
    return {
      dim: dk, note: t.note, crit,
      exigence: exigence(grid, req.subtype, dk, t.note, crit),
      questions, result: { verdicts: [], a_redemander: [] }, engine: "ia",
    };
  });

  await Promise.all(blocks.map(async (b) => {
    try {
      const raw = await provider.complete(blockPrompt(b, req, docs), { maxTokens: 2000 });
      b.result = BlockResult.parse(parseLLMJson(raw));
      b.engine = "ia";
    } catch (e) {
      b.engine = "erreur";
      b.error = e instanceof Error ? e.message : String(e);
    }
  }));
  return blocks;
}
