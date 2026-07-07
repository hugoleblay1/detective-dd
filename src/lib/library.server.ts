/** Requêtes bibliothèque — serveur only (pg). */
import { createHash } from "node:crypto";
import { pool, ensureSchema } from "./db";
import type { LibraryDoc, QualifyInput } from "./library";

export const docId = (path: string) => createHash("sha1").update(path).digest("hex").slice(0, 12);

interface Row {
  id: string; file: string; path: string; mtime: Date | null; detected_at: Date; qualified: boolean;
  title: string | null; geo_level: string | null; geo_name: string | null;
  dims: string[]; tags: string[]; qualified_at: Date | null;
}
const toDoc = (r: Row): LibraryDoc => ({
  id: r.id, file: r.file, path: r.path,
  mtime: r.mtime ? r.mtime.toISOString() : null,
  detectedAt: r.detected_at.toISOString(), qualified: r.qualified,
  title: r.title, geoLevel: r.geo_level, geoName: r.geo_name,
  dims: r.dims ?? [], tags: r.tags ?? [],
  qualifiedAt: r.qualified_at ? r.qualified_at.toISOString() : null,
});

export async function listDocuments(): Promise<LibraryDoc[]> {
  await ensureSchema();
  const r = await pool.query<Row>("SELECT * FROM library_document ORDER BY qualified ASC, detected_at DESC");
  return r.rows.map(toDoc);
}

export async function listQualified(): Promise<LibraryDoc[]> {
  await ensureSchema();
  const r = await pool.query<Row>("SELECT * FROM library_document WHERE qualified = true ORDER BY qualified_at DESC");
  return r.rows.map(toDoc);
}

export async function qualifyDocument(id: string, meta: QualifyInput): Promise<LibraryDoc | null> {
  await ensureSchema();
  const r = await pool.query<Row>(
    `UPDATE library_document
       SET qualified = true, title = $2, geo_level = $3, geo_name = $4, dims = $5, tags = $6, qualified_at = now()
     WHERE id = $1 RETURNING *`,
    [id, meta.title, meta.geoLevel, meta.geoName, meta.dims, meta.tags],
  );
  return r.rows[0] ? toDoc(r.rows[0]) : null;
}

/** Upsert d'un fichier détecté : insère s'il est nouveau, ne touche pas la qualification existante. */
export async function upsertScanned(e: { file: string; path: string; mtime: string }): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO library_document (id, file, path, mtime)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (path) DO UPDATE SET mtime = EXCLUDED.mtime, file = EXCLUDED.file`,
    [docId(e.path), e.file, e.path, e.mtime],
  );
}
