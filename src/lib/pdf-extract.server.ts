/**
 * Extraction du texte d'un PDF — serveur uniquement. Partagé par la route
 * /api/extract (documents du dossier) et l'indexeur RAG (bibliothèque IMP).
 * Moteur « vision » (lecture native LLM, tableaux/graphiques lus) avec repli
 * « texte » (couche brute unpdf) TOUJOURS signalé par `note`.
 */
import { extractText, getDocumentProxy } from "unpdf";
import { getProvider, type LLMProvider } from "./llm";

/* Limites de la lecture native (API : 32 Mo/requête, 100 pages en contexte 200k). */
export const MAX_VISION_BYTES = 30 * 1024 * 1024;
export const MAX_VISION_PAGES = 100;

const EXTRACT_PROMPT = `Retranscris fidèlement ce document PDF pour une analyse documentaire (aucun résumé, aucune interprétation, aucun commentaire).
Page par page, chaque page précédée de "[page N]" :
- reproduis le texte utile tel quel (verbatim) ;
- reconstitue CHAQUE tableau en tableau markdown complet (entêtes + toutes les lignes et valeurs) ;
- pour chaque graphique, carte ou figure : donne son titre, ses axes/légende et TOUTES les valeurs lisibles, en tableau ou liste.
N'omets aucune donnée chiffrée. Réponds uniquement avec la retranscription.`;

export interface PdfText {
  text: string;
  pages: number;
  engine: "vision" | "texte";
  note?: string;
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfText> {
  const byteLength = bytes.length;
  // Encoder AVANT unpdf : pdf.js détache le buffer qu'on lui confie.
  const pdfBase64 = Buffer.from(bytes).toString("base64");
  const pdf = await getDocumentProxy(bytes);
  const { text: rawText, totalPages } = await extractText(pdf, { mergePages: true });

  let provider: LLMProvider | null = null;
  try {
    provider = getProvider("extraction");
  } catch {
    provider = null; // fournisseur non configuré → repli texte
  }
  if (!provider?.extractPdf) {
    return { text: rawText, pages: totalPages, engine: "texte",
      note: "Lecture enrichie indisponible avec ce fournisseur LLM — texte brut seul : tableaux et graphiques non exploités." };
  }
  if (byteLength > MAX_VISION_BYTES || totalPages > MAX_VISION_PAGES) {
    return { text: rawText, pages: totalPages, engine: "texte",
      note: `Document trop volumineux pour la lecture enrichie (${totalPages} pages) — texte brut seul : tableaux et graphiques non exploités.` };
  }

  try {
    const { text, truncated } = await provider.extractPdf(EXTRACT_PROMPT, pdfBase64, { maxTokens: 16000 });
    if (!text.trim()) throw new Error("retranscription vide");
    return { text, pages: totalPages, engine: "vision",
      note: truncated
        ? "Retranscription enrichie interrompue (document long) : la fin du document n'est pas couverte."
        : undefined };
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return { text: rawText, pages: totalPages, engine: "texte",
      note: `Lecture enrichie en échec (${why.slice(0, 140)}) — texte brut seul : tableaux et graphiques non exploités.` };
  }
}
