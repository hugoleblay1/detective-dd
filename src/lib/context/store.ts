/**
 * Persistance des indicateurs de contexte — serveur uniquement (pg).
 * Cache durable par (dimension, pays ISO3) : sert les données sans re-frapper
 * les API externes, et garde une copie datée (fetched_at) si elles tombent.
 */
import type { DimKey } from "../grid";
import { pool, ensureSchema } from "../db";
import type { ContextIndicator } from "./types";

/* Données annuelles ou quasi statiques : un rafraîchissement mensuel suffit. */
const TTL_DAYS = 30;

/** Ligne stockée : l'indicateur, sa date de récupération, et sa péremption (> TTL). */
export interface StoredRow {
  indicator: ContextIndicator;
  /** ISO — null pour une ligne fraîchement récupérée (now() à l'écriture). */
  fetchedAt: string | null;
  stale: boolean;
}

interface Row {
  label: string; value: number | string; unit: string; year: string;
  source: string; source_url: string; fetched_at: Date; stale: boolean;
}

/** Indicateurs stockés pour (dim, iso3), datés ; null si rien en base. */
export async function readIndicators(dim: DimKey, iso3: string): Promise<StoredRow[] | null> {
  await ensureSchema();
  const r = await pool.query<Row>(
    `SELECT label, value, unit, year, source, source_url, fetched_at,
            fetched_at < now() - make_interval(days => $3) AS stale
       FROM context_indicator WHERE dim = $1 AND geo = $2 ORDER BY pos`,
    [dim, iso3, TTL_DAYS],
  );
  if (r.rows.length === 0) return null;
  return r.rows.map((x) => ({
    indicator: {
      label: x.label, value: x.value, unit: x.unit, year: x.year,
      source: x.source, sourceUrl: x.source_url,
    },
    fetchedAt: x.fetched_at.toISOString(),
    stale: x.stale,
  }));
}

/** Remplace les indicateurs de (dim, iso3). fetchedAt null ⇒ now() (ligne fraîche) ;
 *  une date portée depuis la base reste honnête sur l'âge de la donnée. */
export async function writeIndicators(dim: DimKey, iso3: string, rows: StoredRow[]): Promise<void> {
  if (rows.length === 0) return;
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM context_indicator WHERE dim = $1 AND geo = $2", [dim, iso3]);
    for (const [pos, { indicator: c, fetchedAt }] of rows.entries()) {
      await client.query(
        `INSERT INTO context_indicator (dim, geo, label, pos, value, unit, year, source, source_url, fetched_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now()))
         ON CONFLICT (dim, geo, label) DO NOTHING`,
        [dim, iso3, c.label, pos, JSON.stringify(c.value), c.unit, c.year, c.source, c.sourceUrl, fetchedAt],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
