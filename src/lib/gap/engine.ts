/**
 * Moteur d'analyse d'écart — un appel LLM PAR dimension (jamais un appel global :
 * sorties courtes = pas de troncature JSON), contrat de sortie validé par zod.
 * L'agent ne propose JAMAIS de note : il évalue la couverture.
 */
import { getProvider } from "../llm";
import { SectorGrid, DimKey, critsForNote, questionsFor, exigence } from "../grid";
import { getDimContext } from "../context";
import { listQualified } from "../library.server";
import { libForDim, type LibraryDoc } from "../library";
import { BlockResult, DimSynthesis, type AnalyzeRequest, type AnalyzeTarget, type DimAnalysis } from "./types";

export * from "./types";

function blockPrompt(b: DimAnalysis, req: AnalyzeRequest, docs: string, internalSources: string[]): string {
  return `Tu es un analyste de l'équipe Impact d'une institution de financement du développement. Tu lis et COMPRENDS les documents fournis (contexte, chiffres, engagements — pas une recherche de mots-clés). Tu ne proposes JAMAIS de note.
Dossier: ${req.subtype}, ${req.geo}. Description: """${req.dealText.slice(0, 2500)}"""
Documents du client:
${docs || "(aucun document fourni)"}

Dimension analysée: ${b.dim} — note visée ${b.note}${b.crit ? ` — critère visé : ${b.crit}` : ""}
Exigence de la grille:
${b.exigence.slice(0, 1500)}
Données de contexte officielles (${req.geo}) — chiffres réels ; si tu t'en sers, cite la valeur, l'année et la source :
${b.context.length ? b.context.map((c) => `- ${c.label} : ${c.value}${c.unit} (${c.year}, ${c.source})`).join("\n") : "(aucune donnée de contexte disponible)"}
Ressources internes disponibles (renvoie le chargé d'affaires vers elles si pertinent ; n'invente PAS leur contenu) :
${internalSources.length ? internalSources.map((s) => `- ${s}`).join("\n") : "(aucune)"}
Questions:
${b.questions.map((x) => `- [${x.id}] ${x.q.split("\n").join(" ")}${x.ress ? ` (docs attendus: ${x.ress})` : ""}`).join("\n")}

Pour CHAQUE question: statut "repondu" (réellement couvert), "partiel" ou "manquant" (sois strict, ne déduis pas d'un thème voisin). "disponibles": max 4 points courts, chacun avec citation exacte ≤25 mots entre « » + nom du document — exploite les tableaux et données chiffrées (une ligne de tableau retranscrite est une citation valable). "manquants": max 3 points précis (nommer le document à demander).
Réponds STRICTEMENT en JSON compact sans backticks ni texte autour:
{"verdicts":[{"id":"...","statut":"...","disponibles":["..."],"manquants":["..."]}],"a_redemander":["..."]}`;
}

// Avis qualitatif consolidé — appel dédié, lancé APRÈS la couverture de la même
// dimension et nourri de ses verdicts, pour rester cohérent avec le tableau.
function synthPrompt(b: DimAnalysis, req: AnalyzeRequest, docs: string, internalSources: string[]): string {
  const verdicts = b.result.verdicts.length
    ? b.result.verdicts.map((v) => `- [${v.statut}] ${v.id}${v.manquants.length ? ` — manque: ${v.manquants.join("; ")}` : ""}`).join("\n")
    : "(couverture non établie)";
  return `Tu es un analyste de l'équipe Impact d'une institution de financement du développement. Tu produis un AVIS QUALITATIF sur la qualité et la complétude du DOSSIER pour une dimension.
RÈGLE ABSOLUE — tu ne proposes JAMAIS de note, ni explicitement ni implicitement (pas de « mérite +2 », « atteint le niveau +3 », « note X »). Tu n'évalues pas le MÉRITE du projet : tu évalues si le DOSSIER est assez documenté pour qu'un humain instruise. La note est une décision humaine, hors de ton rôle.
Dossier: ${req.subtype}, ${req.geo}. Description: """${req.dealText.slice(0, 2500)}"""
Documents du client:
${docs || "(aucun document fourni)"}
Dimension analysée: ${b.dim} — note visée ${b.note}${b.crit ? ` — critère visé : ${b.crit}` : ""}
Exigence de la grille:
${b.exigence.slice(0, 1500)}
Données de contexte officielles (${req.geo}) — chiffres réels ; si tu t'en sers, cite la valeur, l'année et la source :
${b.context.length ? b.context.map((c) => `- ${c.label} : ${c.value}${c.unit} (${c.year}, ${c.source})`).join("\n") : "(aucune donnée de contexte disponible)"}
Ressources internes disponibles (pointeurs, n'invente PAS leur contenu) :
${internalSources.length ? internalSources.map((s) => `- ${s}`).join("\n") : "(aucune)"}
Couverture déjà établie question par question (appuie-toi dessus pour rester cohérent) :
${verdicts}

Produis :
- "forces": max 4, ce que le dossier ÉTABLIT réellement. CHACUNE avec "citation" exacte ≤25 mots entre « » + nom du document/source (données chiffrées et lignes de tableaux bienvenues). Pas de citation possible ⇒ ce n'est pas une force.
- "faiblesses": max 4, ce qui est faible, vague ou absent. "citation" seulement si l'élément EST présent mais insuffisant ; une absence n'a pas de citation.
- "a_obtenir": max 4, documents/preuves précis à demander au client (nomme le document).
- "maturite": {"niveau":"complet"|"partiel"|"insuffisant","justification":"…"} — niveau = à quel point le DOSSIER fournit les éléments attendus par l'exigence de la note visée (complétude documentaire), JAMAIS le niveau de performance du projet ni une note. justification = une phrase, sans aucun chiffre de note.
Réponds STRICTEMENT en JSON compact sans backticks ni texte autour:
{"forces":[{"point":"…","citation":"« … » — Doc"}],"faiblesses":[{"point":"…"}],"a_obtenir":["…"],"maturite":{"niveau":"partiel","justification":"…"}}`;
}

function parseLLMJson(txt: string): unknown {
  const i = txt.indexOf("{"); const j = txt.lastIndexOf("}");
  if (i < 0 || j <= i) throw new Error("réponse sans JSON");
  return JSON.parse(txt.slice(i, j + 1));
}

export async function analyze(grid: SectorGrid, req: AnalyzeRequest): Promise<DimAnalysis[]> {
  const provider = getProvider("analyse");
  // 80k caractères ≈ 25-30 pages retranscrites : assez pour les rapports du
  // dossier sans coupure des tableaux en fin de document (contexte 1M côté modèle).
  const docs = req.docs.map((d) => `### ${d.name}\n${d.text.slice(0, 80000)}`).join("\n\n");
  const qualified: LibraryDoc[] = await listQualified().catch(() => []);

  const blocks: DimAnalysis[] = (Object.entries(req.targets) as [DimKey, AnalyzeTarget][]).map(([dk, t]) => {
    const pool = critsForNote(grid, req.subtype, dk, t.note);
    const crit = t.crit && pool.includes(t.crit) ? t.crit : pool.length > 1 ? pool[0] : pool[0] ?? null;
    const questions = questionsFor(grid, req.subtype, dk, crit, t.note)
      .map((q, i) => ({ id: dk.slice(0, 3).toUpperCase() + (i + 1), q: q.question, ress: q.ressources ?? "" }));
    return {
      dim: dk, note: t.note, crit,
      exigence: exigence(grid, req.subtype, dk, t.note, crit),
      questions, context: [], result: { verdicts: [], a_redemander: [] }, engine: "ia",
      synthesis: null,
    };
  });

  await Promise.all(blocks.map(async (b) => {
    b.context = await getDimContext(b.dim, req.geo);
    const internalSources = libForDim(qualified, b.dim, req.geo).map((d) => `${d.title} (${d.geoName})`);
    try {
      const raw = await provider.complete(blockPrompt(b, req, docs, internalSources), { maxTokens: 3000 });
      b.result = BlockResult.parse(parseLLMJson(raw));
      b.engine = "ia";
    } catch (e) {
      b.engine = "erreur";
      b.error = e instanceof Error ? e.message : String(e);
    }
    // Avis qualitatif : appel dédié, nourri des verdicts ci-dessus. Échoue
    // indépendamment de la couverture (n'invalide pas le tableau).
    try {
      const raw = await provider.complete(synthPrompt(b, req, docs, internalSources), { maxTokens: 2000 });
      b.synthesis = DimSynthesis.parse(parseLLMJson(raw));
    } catch (e) {
      b.synthesisError = e instanceof Error ? e.message : String(e);
    }
  }));
  return blocks;
}
