/**
 * RAG bibliothèque interne — indexation des documents qualifiés en passages
 * vectorisés (library_chunk). Serveur uniquement. L'indexation est lancée par
 * `pnpm indexer` (cron en prod) ; la recherche est consommée par le moteur
 * d'analyse. Embeddings locaux : rien ne sort de l'infrastructure.
 */
import fs from "node:fs";
import path from "node:path";
import { pool, ensureSchema } from "./db";
import { getEmbeddings } from "./llm/embeddings";
import { extractPdfText } from "./pdf-extract.server";

const CHUNK_SIZE = 1000;   // taille visée d'un passage (caractères)
const CHUNK_HARD = 1600;   // au-delà : découpe dure avec chevauchement
const OVERLAP = 150;

export interface Chunk { ord: number; page: number | null; text: string }

/** Découpage en passages alignés sur les paragraphes, repères [page N] suivis. */
export function chunkText(text: string): Chunk[] {
  const paras = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let buf = "";
  const flush = () => {
    if (buf.trim()) chunks.push({ ord: chunks.length, page: null, text: buf.trim() });
    buf = "";
  };
  for (const p of paras) {
    if (p.length > CHUNK_HARD) {
      flush();
      for (let i = 0; i < p.length; i += CHUNK_SIZE - OVERLAP) {
        buf = p.slice(i, i + CHUNK_SIZE);
        flush();
        if (i + CHUNK_SIZE >= p.length) break;
      }
      continue;
    }
    if (buf && buf.length + p.length + 2 > CHUNK_SIZE) flush();
    buf = buf ? `${buf}\n\n${p}` : p;
  }
  flush();

  // Page d'un passage = repère actif à son début (dernier [page N] rencontré).
  let current: number | null = null;
  for (const c of chunks) {
    const markers = [...c.text.matchAll(/\[page (\d+)\]/g)];
    const startsWithMarker = /^\s*\[page (\d+)\]/.exec(c.text);
    c.page = startsWithMarker ? Number(startsWithMarker[1]) : current ?? (markers[0] ? Number(markers[0][1]) : null);
    if (markers.length > 0) current = Number(markers[markers.length - 1][1]);
  }
  return chunks;
}

/** Documents qualifiés dont les passages manquent ou sont plus vieux que le fichier. */
export async function docsNeedingIndex(): Promise<Array<{ id: string; file: string; path: string }>> {
  await ensureSchema();
  const r = await pool.query<{ id: string; file: string; path: string }>(
    `SELECT d.id, d.file, d.path
       FROM library_document d
       LEFT JOIN (SELECT doc_id, max(indexed_at) AS ia FROM library_chunk GROUP BY doc_id) c
         ON c.doc_id = d.id
      WHERE d.qualified AND (c.ia IS NULL OR d.mtime > c.ia)
      ORDER BY d.file`);
  return r.rows;
}

/** (Ré)indexe un document : extraction → découpage → embeddings → remplacement. */
export async function indexLibraryDoc(doc: { id: string; file: string; path: string }):
  Promise<{ chunks: number; engine: string; note?: string }> {
  const ext = path.extname(doc.file).toLowerCase();
  let text = "", engine = "texte", note: string | undefined;
  if (ext === ".pdf") {
    const r = await extractPdfText(new Uint8Array(fs.readFileSync(doc.path)));
    text = r.text; engine = r.engine; note = r.note;
  } else if (ext === ".txt" || ext === ".md") {
    text = fs.readFileSync(doc.path, "utf-8");
  } else {
    throw new Error(`format non indexable pour le RAG : ${ext}`);
  }
  if (!text.trim()) throw new Error("aucun texte extractible");

  const chunks = chunkText(text);
  const emb = getEmbeddings();
  const vectors: number[][] = [];
  for (let i = 0; i < chunks.length; i += 32)
    vectors.push(...(await emb.embedPassages(chunks.slice(i, i + 32).map((c) => c.text))));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM library_chunk WHERE doc_id = $1", [doc.id]);
    for (const c of chunks)
      await client.query(
        "INSERT INTO library_chunk (doc_id, ord, page, text, embedding) VALUES ($1,$2,$3,$4,$5)",
        [doc.id, c.ord, c.page, c.text, JSON.stringify(vectors[c.ord])]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  return { chunks: chunks.length, engine, note };
}

export interface LibraryPassage {
  docId: string;
  title: string;
  page: number | null;
  text: string;
  score: number;
}

/** Passages les plus proches de la requête, restreints aux documents donnés
 *  (le filtrage dimension × géographie est fait en amont par libForDim). */
export async function searchLibrary(query: string, docIds: string[], k = 6): Promise<LibraryPassage[]> {
  if (docIds.length === 0) return [];
  await ensureSchema();
  const v = await getEmbeddings().embedQuery(query);
  const r = await pool.query<{ doc_id: string; title: string | null; file: string; page: number | null; text: string; score: number }>(
    `SELECT c.doc_id, d.title, d.file, c.page, c.text,
            1 - (c.embedding <=> $1::vector) AS score
       FROM library_chunk c JOIN library_document d ON d.id = c.doc_id
      WHERE c.doc_id = ANY($2)
      ORDER BY c.embedding <=> $1::vector
      LIMIT $3`,
    [JSON.stringify(v), docIds, k]);
  return r.rows.map((x) => ({
    docId: x.doc_id, title: x.title ?? x.file, page: x.page, text: x.text, score: Number(x.score),
  }));
}

/** Purge les documents disparus du partage (chunks supprimés en cascade).
 *  Ne purge JAMAIS sur un scan vide : un partage temporairement injoignable
 *  ne doit pas effacer les qualifications de l'IMP. */
export async function purgeVanished(existingPaths: string[]): Promise<number> {
  if (existingPaths.length === 0) return 0;
  await ensureSchema();
  const r = await pool.query("DELETE FROM library_document WHERE NOT (path = ANY($1))", [existingPaths]);
  return r.rowCount ?? 0;
}
