/**
 * Bibliothèque interne — types + matcher PUR (client-safe).
 * Les requêtes DB vivent dans library.server.ts (pg, serveur only).
 */
import { normGeo } from "./context-sources";
import type { DimKey } from "./grid";

export interface LibraryDoc {
  id: string; file: string; path: string; mtime: string | null;
  detectedAt: string; qualified: boolean;
  title: string | null; geoLevel: string | null; geoName: string | null;
  dims: string[]; tags: string[]; qualifiedAt: string | null;
}

export interface QualifyInput {
  title: string; geoLevel: string; geoName: string; dims: string[]; tags: string[];
}

/** Docs internes qualifiés pertinents pour une dimension et une géographie.
 *  Un doc « Pays » n'apparaît que si le pays correspond ; Continental/Monde toujours. */
export function libForDim(docs: LibraryDoc[], dim: DimKey, geo: string): LibraryDoc[] {
  const g = normGeo(geo);
  return docs.filter((d) =>
    d.qualified && d.dims.includes(dim) && (d.geoLevel !== "Pays" || normGeo(d.geoName ?? "") === g));
}
