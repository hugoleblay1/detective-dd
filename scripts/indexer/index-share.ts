/**
 * Indexeur de bibliothèque interne (option validée : script planifié).
 * Scanne LIBRARY_ROOT et upsert les fichiers détectés dans Postgres (nouveaux =
 * non qualifiés ; la qualification saisie par l'IMP dans l'appli est préservée).
 * En production : cron sur le serveur. En dev : `docker compose up db -d` puis `pnpm indexer`.
 */
import { pool } from "../../src/lib/db";
import { upsertScanned } from "../../src/lib/library.server";
import { walk } from "./scan";

const ROOT = process.env.LIBRARY_ROOT || "./library-sample";

async function main() {
  const entries = walk(ROOT);
  for (const e of entries) await upsertScanned(e);
  const { rows } = await pool.query<{ n: string }>("SELECT count(*) FILTER (WHERE NOT qualified) AS n FROM library_document");
  console.log(`${entries.length} fichiers indexés — ${rows[0].n} à qualifier (table library_document).`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
