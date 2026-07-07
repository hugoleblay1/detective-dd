/**
 * Accès Postgres — serveur uniquement. Pool partagé + création idempotente du schéma.
 * DATABASE_URL en .env. En dev : `docker compose up db -d`.
 */
import { Pool } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let schemaReady: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS library_document (
        id           TEXT PRIMARY KEY,
        file         TEXT NOT NULL,
        path         TEXT NOT NULL UNIQUE,
        mtime        TIMESTAMPTZ,
        detected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        qualified    BOOLEAN NOT NULL DEFAULT false,
        title        TEXT,
        geo_level    TEXT,
        geo_name     TEXT,
        dims         TEXT[] NOT NULL DEFAULT '{}',
        tags         TEXT[] NOT NULL DEFAULT '{}',
        qualified_at TIMESTAMPTZ
      );
    `).then(() => undefined).catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}
