import { NextResponse } from "next/server";
import { listDocuments } from "@/lib/library.server";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ documents: await listDocuments() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
