/**
 * Indexeur de bibliothèque interne (option validée : script planifié).
 * Scanne LIBRARY_ROOT et upsert les fichiers détectés dans Postgres (nouveaux =
 * non qualifiés ; la qualification saisie par l'IMP dans l'appli est préservée).
 * En production : cron sur le serveur. En dev : `docker compose up db -d` puis `pnpm indexer`.
 */
import { pool } from "../../src/lib/db";
import { upsertScanned } from "../../src/lib/library.server";
import { docsNeedingIndex, indexLibraryDoc, purgeVanished } from "../../src/lib/rag.server";
import { walk } from "./scan";

const ROOT = process.env.LIBRARY_ROOT || "./library-sample";

async function main() {
  const entries = walk(ROOT);
  for (const e of entries) await upsertScanned(e);
  const purged = await purgeVanished(entries.map((e) => e.path));

  // RAG : (ré)indexation des documents qualifiés (nouveaux ou modifiés).
  const todo = await docsNeedingIndex();
  let indexed = 0;
  for (const d of todo) {
    try {
      const r = await indexLibraryDoc(d);
      console.log(`  ✔ ${d.file} — ${r.chunks} passages (${r.engine}${r.note ? ` ; ${r.note}` : ""})`);
      indexed++;
    } catch (e) {
      console.error(`  ✖ ${d.file} — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const { rows } = await pool.query<{ n: string }>("SELECT count(*) FILTER (WHERE NOT qualified) AS n FROM library_document");
  console.log(`${entries.length} fichiers détectés — ${purged} purgé(s) — ${indexed}/${todo.length} document(s) (ré)indexé(s) pour le RAG — ${rows[0].n} à qualifier.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
