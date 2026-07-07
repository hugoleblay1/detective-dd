import fs from "node:fs";
import path from "node:path";

const EXTS = new Set([".pdf", ".docx", ".xlsx", ".md", ".txt"]);
export interface Scanned { file: string; path: string; mtime: string }

export function walk(dir: string): Scanned[] {
  if (!fs.existsSync(dir)) { console.error(`LIBRARY_ROOT introuvable: ${dir}`); return []; }
  const out: Scanned[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (EXTS.has(path.extname(name).toLowerCase())) out.push({ file: name, path: p, mtime: st.mtime.toISOString() });
  }
  return out;
}
