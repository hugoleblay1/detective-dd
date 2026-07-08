import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { getProvider, type LLMProvider } from "@/lib/llm";

/**
 * Extraction d'un PDF, côté serveur. Deux moteurs :
 *  - « vision » (préféré) : lecture native par le LLM de l'étage extraction —
 *    pages rendues en texte + image, donc tableaux et graphiques réellement lus
 *    et retranscrits. Le document part vers le fournisseur LLM configuré, même
 *    statut de confidentialité que le texte injecté ensuite à l'analyse.
 *  - « texte » (repli, toujours signalé par `note`) : couche texte brute unpdf —
 *    tableaux à plat, graphiques invisibles. Pas d'OCR : un PDF scanné sans
 *    couche texte renvoie un texte vide → signalé au client.
 */
export const runtime = "nodejs";

/* Limites de la lecture native (API : 32 Mo/requête, 100 pages en contexte 200k). */
const MAX_VISION_BYTES = 30 * 1024 * 1024;
const MAX_VISION_PAGES = 100;

const EXTRACT_PROMPT = `Retranscris fidèlement ce document PDF pour une analyse documentaire (aucun résumé, aucune interprétation, aucun commentaire).
Page par page, chaque page précédée de "[page N]" :
- reproduis le texte utile tel quel (verbatim) ;
- reconstitue CHAQUE tableau en tableau markdown complet (entêtes + toutes les lignes et valeurs) ;
- pour chaque graphique, carte ou figure : donne son titre, ses axes/légende et TOUTES les valeurs lisibles, en tableau ou liste.
N'omets aucune donnée chiffrée. Réponds uniquement avec la retranscription.`;

const raw = (name: string, text: string, pages: number, note: string) =>
  NextResponse.json({ name, text, pages, engine: "texte", note });

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    const buf = new Uint8Array(await file.arrayBuffer());
    const byteLength = buf.length;
    // Encoder AVANT unpdf : pdf.js détache le buffer qu'on lui confie.
    const pdfBase64 = Buffer.from(buf).toString("base64");
    const pdf = await getDocumentProxy(buf);
    const { text: rawText, totalPages } = await extractText(pdf, { mergePages: true });

    let provider: LLMProvider | null = null;
    try {
      provider = getProvider("extraction");
    } catch {
      provider = null; // fournisseur non configuré → repli texte
    }
    if (!provider?.extractPdf) {
      return raw(file.name, rawText, totalPages,
        "Lecture enrichie indisponible avec ce fournisseur LLM — texte brut seul : tableaux et graphiques non exploités.");
    }
    if (byteLength > MAX_VISION_BYTES || totalPages > MAX_VISION_PAGES) {
      return raw(file.name, rawText, totalPages,
        `Document trop volumineux pour la lecture enrichie (${totalPages} pages) — texte brut seul : tableaux et graphiques non exploités.`);
    }

    try {
      const { text, truncated } = await provider.extractPdf(
        EXTRACT_PROMPT, pdfBase64, { maxTokens: 16000 });
      if (!text.trim()) throw new Error("retranscription vide");
      return NextResponse.json({
        name: file.name, text, pages: totalPages, engine: "vision",
        note: truncated
          ? "Retranscription enrichie interrompue (document long) : la fin du document n'est pas couverte."
          : undefined,
      });
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      return raw(file.name, rawText, totalPages,
        `Lecture enrichie en échec (${why.slice(0, 140)}) — texte brut seul : tableaux et graphiques non exploités.`);
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
