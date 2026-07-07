import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extraction texte d'un PDF, côté serveur (le prototype ne lisait que du texte brut).
 * Le fichier ne transite que par notre infra ; en dev, corpus factice uniquement.
 * Pas d'OCR : un PDF scanné sans couche texte renvoie un texte vide → signalé au client.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return NextResponse.json({ name: file.name, text, pages: totalPages });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
