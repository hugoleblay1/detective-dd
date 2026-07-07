import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadGrids } from "@/lib/grid.loader";
import { analyze } from "@/lib/gap/engine";
import { DIMS_EXCLUDED_FROM_ANALYSIS } from "@/lib/gap/types";

const Body = z.object({
  sector: z.string().default("Numérique"),
  subtype: z.string(),
  geo: z.string().default(""),
  dealText: z.string().default(""),
  targets: z.record(
    z.enum(["Atténuation", "Adaptation", "Social", "Genre", "Biodiversité"]),
    z.object({ note: z.enum(["+1", "+2", "+3"]), crit: z.string().nullable().optional() }),
  ),
  docs: z.array(z.object({ name: z.string(), text: z.string() })).default([]),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const grids = loadGrids();
  const grid = grids[parsed.data.sector];
  if (!grid) return NextResponse.json({ error: `Secteur inconnu: ${parsed.data.sector}` }, { status: 404 });
  if (!grid.subtypes[parsed.data.subtype])
    return NextResponse.json({ error: `Sous-type inconnu: ${parsed.data.subtype}` }, { status: 404 });
  // Rejet explicite (pas de filtrage silencieux) : le Genre est évalué via son
  // propre questionnaire et outil, hors de cette analyse pour le moment.
  const excluded = DIMS_EXCLUDED_FROM_ANALYSIS.filter((dk) => dk in parsed.data.targets);
  if (excluded.length)
    return NextResponse.json(
      { error: `Dimension(s) hors analyse du dossier : ${excluded.join(", ")} (questionnaire et outil dédiés).` },
      { status: 400 },
    );
  const result = await analyze(grid, parsed.data);
  return NextResponse.json({ analyses: result });
}
