import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/pdf-extract.server";

/**
 * Extraction d'un PDF du dossier, côté serveur — voir lib/pdf-extract.server.ts
 * (moteur « vision » : tableaux et graphiques lus ; repli texte signalé).
 * Le document part vers le fournisseur LLM configuré, même statut de
 * confidentialité que le texte injecté ensuite à l'analyse.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    const r = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ name: file.name, ...r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
