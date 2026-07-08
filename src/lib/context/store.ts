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

interface Row {
  label: string; value: number | string; unit: string; year: string;
  source: string; source_url: string; stale: boolean;
}

export interface StoredContext { indicators: ContextIndicator[]; fresh: boolean }

/** Indicateurs stockés pour (dim, iso3), avec leur fraîcheur ; null si rien en base. */
export async function readIndicators(dim: DimKey, iso3: string): Promise<StoredContext | null> {
  await ensureSchema();
  const r = await pool.query<Row>(
    `SELECT label, value, unit, year, source, source_url,
            fetched_at < now() - make_interval(days => $3) AS stale
       FROM context_indicator WHERE dim = $1 AND geo = $2 ORDER BY pos`,
    [dim, iso3, TTL_DAYS],
  );
  if (r.rows.length === 0) return null;
  return {
    indicators: r.rows.map((x) => ({
      label: x.label, value: x.value, unit: x.unit, year: x.year,
      source: x.source, sourceUrl: x.source_url,
    })),
    fresh: r.rows.every((x) => !x.stale),
  };
}

/** Remplace les indicateurs de (dim, iso3) par le jeu fraîchement récupéré. */
export async function writeIndicators(dim: DimKey, iso3: string, indicators: ContextIndicator[]): Promise<void> {
  if (indicators.length === 0) return;
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM context_indicator WHERE dim = $1 AND geo = $2", [dim, iso3]);
    for (const [pos, c] of indicators.entries()) {
      await client.query(
        `INSERT INTO context_indicator (dim, geo, label, pos, value, unit, year, source, source_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (dim, geo, label) DO NOTHING`,
        [dim, iso3, c.label, pos, JSON.stringify(c.value), c.unit, c.year, c.source, c.sourceUrl],
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
