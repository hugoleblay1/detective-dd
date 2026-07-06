/**
 * Indexeur de bibliothèque interne (chantier 1, option validée : script planifié).
 * Scanne LIBRARY_ROOT, produit index-library.json : fichiers connus + nouveaux à qualifier.
 * En production : tourne en cron sur le serveur ; la qualification (métadonnées saisies
 * par l'équipe IMP dans l'appli) sera persistée en base — voir README, feuille de route.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.LIBRARY_ROOT ?? "./library-sample";
const OUT = "index-library.json";
const EXTS = new Set([".pdf", ".docx", ".xlsx", ".md", ".txt"]);

interface Entry { file: string; path: string; mtime: string; qualified: boolean;
  title?: string; geoLevel?: string; geoName?: string; dims?: string[]; tags?: string[] }

const prev: Record<string, Entry> = fs.existsSync(OUT)
  ? Object.fromEntries((JSON.parse(fs.readFileSync(OUT, "utf-8")) as Entry[]).map((e) => [e.path, e]))
  : {};

function walk(dir: string): Entry[] {
  if (!fs.existsSync(dir)) { console.error(`LIBRARY_ROOT introuvable: ${dir}`); return []; }
  const out: Entry[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (EXTS.has(path.extname(name).toLowerCase())) {
      out.push(prev[p] ?? { file: name, path: p, mtime: st.mtime.toISOString(), qualified: false });
    }
  }
  return out;
}

const entries = walk(ROOT);
fs.writeFileSync(OUT, JSON.stringify(entries, null, 2));
console.log(`${entries.length} fichiers indexés — ${entries.filter((e) => !e.qualified).length} à qualifier → ${OUT}`);
