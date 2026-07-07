import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { qualifyDocument } from "@/lib/library.server";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().min(1),
  geoLevel: z.string().min(1),
  geoName: z.string(),
  dims: z.array(z.string()),
  tags: z.array(z.string()),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const doc = await qualifyDocument(id, parsed.data);
    if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    return NextResponse.json({ document: doc });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
