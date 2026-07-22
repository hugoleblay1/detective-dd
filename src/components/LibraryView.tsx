import { useState } from "react";
import { isRagIndexable, type LibraryDoc } from "@/lib/library";
import { ctxForDim, geoInfo } from "@/lib/context-sources";
import { ALL_DIMS } from "./TargetsEditor";
import { GEO_PRESETS } from "./geo";

const GEO_LEVELS = ["Monde", "Continental", "Pays"];
/** Démo : séparation de rôle visuelle, PAS un contrôle d'accès sécurisé (auth réelle = P2). */
const IMP_PASSWORD = "imp2026";

/** Libellé géographique d'un document (le niveau Monde n'a pas de nom propre). */
const geoLabel = (d: LibraryDoc) => (d.geoLevel === "Monde" ? "Monde" : d.geoName ?? "—");
/** Certains tags historiques embarquent déjà le « # » : on normalise à l'affichage. */
const tagLabel = (t: string) => "#" + t.replace(/^#+/, "");

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  function tryUnlock() {
    if (pw.trim().toLowerCase() === IMP_PASSWORD) onUnlock();
    else setErr(true);
  }
  return (
    <div className="lgate-wrap">
      <div className="lgate">
        <div className="lgate-ic">🔒</div>
        <div>
          <div className="t">Espace réservé à l&apos;équipe Impact</div>
          <div className="s">La bibliothèque de référence alimente les citations de l&apos;analyse. Son accès est limité aux experts IMP.</div>
        </div>
        <input type="password" autoFocus placeholder="Mot de passe" value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }} />
        {err && <div className="lgate-err">Mot de passe incorrect.</div>}
        <button className="btn" onClick={tryUnlock}>Entrer</button>
        <div className="hint">Démo : le mot de passe est IMP2026. (Séparation de rôle visuelle, pas un contrôle d&apos;accès sécurisé.)</div>
      </div>
    </div>
  );
}

function QualifyCard({ doc, onQualified }: { doc: LibraryDoc; onQualified: (d: LibraryDoc) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(() => doc.file.replace(/\.(pdf|xlsx|docx|txt|md)$/i, "").replace(/_/g, " "));
  const [geoLevel, setGeoLevel] = useState("Pays");
  const [geoName, setGeoName] = useState("");
  const [dims, setDims] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = !!title.trim() && dims.length > 0 && (geoLevel === "Monde" || !!geoName.trim());
  function toggleDim(d: string) { setDims((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d])); }

  async function save() {
    if (!canSave || saving) return;
    setSaving(true); setErr(null);
    try {
      const body = {
        title: title.trim(),
        geoLevel, geoName: geoLevel === "Monde" ? "—" : geoName.trim(),
        dims,
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const res = await fetch(`/api/library/${doc.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Échec de l'enregistrement.");
      onQualified(data.document as LibraryDoc);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lqueue-card">
      <div className="lq-head">
        <span className="lq-badge">Nouveau</span>
        <span className="lq-main">
          <span className="nm">{doc.file}</span>
          <span className="pathln">{doc.path}</span>
          <span className="mt">Détecté le {doc.detectedAt.slice(0, 10)}</span>
        </span>
        <button className="btn small" onClick={() => setOpen((o) => !o)}>{open ? "Fermer" : "Qualifier"}</button>
      </div>
      {open && (
        <div className="lq-form">
          <div className="fgroup">
            <span className="flabel">Titre lisible <span className="opt">— c&apos;est lui qui apparaît dans les citations</span></span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={{ maxWidth: 560 }} />
          </div>
          <div className="fgroup">
            <span className="flabel">Portée géographique</span>
            <div className="gchips">
              {GEO_LEVELS.map((g) => (
                <span key={g} className={"gchip sm" + (geoLevel === g ? " on" : "")} onClick={() => setGeoLevel(g)}>{g}</span>
              ))}
              {geoLevel !== "Monde" && (
                <input type="text" value={geoName} onChange={(e) => setGeoName(e.target.value)}
                  placeholder={geoLevel === "Continental" ? "ex. Afrique" : "ex. Kenya"} style={{ width: 150 }} />
              )}
            </div>
          </div>
          <div className="fgroup">
            <span className="flabel">Dimensions concernées</span>
            <div className="gchips">
              {ALL_DIMS.map((dm) => (
                <span key={dm} className={"gchip sm gold" + (dims.includes(dm) ? " on" : "")} onClick={() => toggleDim(dm)}>{dm}</span>
              ))}
            </div>
          </div>
          <div className="fgroup">
            <span className="flabel">Mots-clés <span className="opt">— séparés par des virgules</span></span>
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="eau, benchmarks, data centre…" style={{ maxWidth: 560 }} />
          </div>
          {err && <div className="gap-error">{err}</div>}
          <div className="lq-actions">
            <button className="btn" onClick={save} disabled={!canSave || saving}>{saving ? "…" : "Enregistrer dans la bibliothèque"}</button>
            <span className="cancel" onClick={() => setOpen(false)}>Annuler</span>
            <span className="hint">
              {canSave ? <>Le document devient citable : « {title.trim()}, p. X »</> : "Un titre, au moins une dimension et la portée géographique sont nécessaires."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function LibraryView({ docs, geo, unlocked, onUnlock, onQualified }: {
  docs: LibraryDoc[] | null; geo: string; unlocked: boolean; onUnlock: () => void; onQualified: (d: LibraryDoc) => void;
}) {
  const [openCov, setOpenCov] = useState<Record<string, boolean>>({});
  const [fDim, setFDim] = useState("Toutes");
  const [fGeo, setFGeo] = useState("Toutes");
  const [fTag, setFTag] = useState("Tous");

  if (!unlocked) return <Gate onUnlock={onUnlock} />;
  if (docs === null) return <div className="content"><div className="placeholder">Chargement de la bibliothèque…</div></div>;

  const pending = docs.filter((d) => !d.qualified);
  const qualified = docs.filter((d) => d.qualified);
  const notIndexed = qualified.filter((d) => d.chunks === 0 && isRagIndexable(d.file));

  // Couverture par dimension (documents qualifiés)
  const maxCov = Math.max(1, ...ALL_DIMS.map((dk) => qualified.filter((d) => d.dims.includes(dk)).length));
  const couverture = ALL_DIMS.map((dk) => {
    const dDocs = qualified.filter((d) => d.dims.includes(dk));
    const c = dDocs.length;
    const nMonde = dDocs.filter((d) => d.geoLevel === "Monde").length;
    const nCont = dDocs.filter((d) => d.geoLevel === "Continental").length;
    const nPays = c - nMonde - nCont;
    const lvl = c === 0 ? "ko" : c < 3 ? "mid" : "ok";
    const chipLabel = c === 0 ? "aucun document" : c < 3 ? "à enrichir" : "bien couverte";
    const paysDetail = GEO_PRESETS.map((p) => {
      const k = dDocs.filter((d) => d.geoLevel === "Pays" && d.geoName === p).length;
      return { label: p + (k ? ` · ${k}` : ""), has: k > 0 };
    });
    const nMissing = paysDetail.filter((p) => !p.has).length;
    const missingLine = nMissing === 0
      ? "Tous les pays de référence ont au moins un document."
      : `${nMissing} pays de référence sans document dédié${nMonde + nCont > 0 ? " (les documents monde/continent s'appliquent partout, mais sans donnée locale)" : ""}.`;
    return { dk, c, pct: Math.max(4, (100 * c) / maxCov), lvl, chipLabel, nMonde, nCont, nPays, paysDetail, missingLine };
  });

  // Filtres de la bibliothèque qualifiée
  const geoOpts = ["Toutes", ...[...new Set(qualified.map(geoLabel))].sort((a, b) => a.localeCompare(b))];
  const tagOpts = ["Tous", ...[...new Set(qualified.flatMap((d) => d.tags))].sort((a, b) => a.localeCompare(b))];
  const filtered = qualified.filter((d) =>
    (fDim === "Toutes" || d.dims.includes(fDim)) &&
    (fGeo === "Toutes" || geoLabel(d) === fGeo) &&
    (fTag === "Tous" || d.tags.includes(fTag)));
  const hasFilter = fDim !== "Toutes" || fGeo !== "Toutes" || fTag !== "Tous";

  // Ressources externes (context-sources), suivent le filtre Dimension
  const gi = geoInfo(geo);
  const extMap = new Map<string, { name: string; desc: string; url: string; dims: string[] }>();
  for (const dk of ALL_DIMS) {
    if (fDim !== "Toutes" && dk !== fDim) continue;
    for (const s of ctxForDim(dk)?.sources ?? []) {
      const e = extMap.get(s.name) ?? { name: s.name, desc: s.desc, url: s.url(gi), dims: [] };
      e.dims.push(dk);
      extMap.set(s.name, e);
    }
  }
  const externes = [...extMap.values()];

  return (
    <div className="libv">
      <div className="lib-note">Démonstration : l&apos;index et les fichiers sont factices. En production, un script planifié scanne le réseau et écrit l&apos;index ; la qualification est enregistrée en base.</div>

      <div className="lgrid">
        <div className="lcard">
          <span className="flabel">Bibliothèque de référence</span>
          <div className="lstats">
            <div className="lstat"><span className="n" style={{ color: "var(--color-primary)" }}>{docs.length}</span><span className="d">documents au total</span></div>
            <div className="lstat"><span className="n" style={{ color: "var(--status-ok)" }}>{qualified.length}</span><span className="d">qualifiés, citables</span></div>
            <div className="lstat"><span className="n" style={{ color: "var(--status-mid)" }}>{pending.length}</span><span className="d">à qualifier</span></div>
            <div className="lstat"><span className="n" style={{ color: "var(--status-ko)" }}>{notIndexed.length}</span><span className="d">pas encore lisibles par l&apos;IA</span></div>
          </div>
          <div className="lcard-foot">Un document mal qualifié = une citation inutilisable côté chargé d&apos;affaires.</div>
        </div>
        <div className="lcard">
          <span className="flabel">Couverture par dimension</span>
          <div className="lcov">
            {couverture.map((cv) => (
              <div key={cv.dk}>
                <div className="lcov-row" onClick={() => setOpenCov((p) => ({ ...p, [cv.dk]: !p[cv.dk] }))}>
                  <span className="lb">{cv.dk}</span>
                  <span className="bar"><i className={`f-${cv.lvl}`} style={{ width: `${cv.pct}%` }} /></span>
                  <span className="ct">{cv.c}</span>
                  <span className={`chipst c-${cv.lvl}`}>{cv.chipLabel}</span>
                  <span className={"chev" + (openCov[cv.dk] ? " up" : "")}>▾</span>
                </div>
                {openCov[cv.dk] && (
                  <div className="lcov-detail">
                    <div className="bk">{cv.nMonde} monde · {cv.nCont} continent · {cv.nPays} pays</div>
                    <div className="gchips">
                      {cv.paysDetail.map((p) => (
                        <span key={p.label} className={"pchip " + (p.has ? "has" : "miss")}>{p.label}</span>
                      ))}
                    </div>
                    <div className="ml">{cv.missingLine}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lsec">
        <div className="lsec-h">
          <span className="t">À qualifier d&apos;abord</span>
          <span className="s">{pending.length} document{pending.length > 1 ? "s" : ""} en attente — la file se vide par le haut</span>
        </div>
        {pending.length === 0 && <div className="esg-note">Aucun nouveau fichier en attente.</div>}
        {pending.map((d) => <QualifyCard key={d.id} doc={d} onQualified={onQualified} />)}
      </div>

      <div className="lsec">
        <div className="lsec-h">
          <span className="t">Bibliothèque qualifiée</span>
          <span className="s">{hasFilter ? `${filtered.length} document(s) sur ${qualified.length} correspondent aux filtres` : `${qualified.length} documents citables par l'analyse`}</span>
          {hasFilter && <span className="reset" onClick={() => { setFDim("Toutes"); setFGeo("Toutes"); setFTag("Tous"); }}>Réinitialiser les filtres</span>}
        </div>
        <div className="lfilter">
          {([
            ["Dimension", ["Toutes", ...ALL_DIMS], fDim, setFDim, ""],
            ["Géographie", geoOpts, fGeo, setFGeo, ""],
            ["Mot-clé", tagOpts, fTag, setFTag, "#"],
          ] as [string, string[], string, (v: string) => void, string][]).map(([label, opts, cur, set, prefix]) => (
            <div key={label} className="lf-row">
              <span className="lb">{label}</span>
              <div className="gchips">
                {opts.map((o) => (
                  <span key={o} className={"gchip sm" + (cur === o ? " on" : "")} onClick={() => set(o)}>
                    {o === "Toutes" || o === "Tous" ? o : prefix === "#" ? tagLabel(o) : o}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {filtered.map((d) => (
          <div key={d.id} className="lbib-card">
            <div className="top">
              <span className="nm">{d.title}</span>
              <span className="tagq">Qualifié</span>
              {d.chunks === 0 && isRagIndexable(d.file) && <span className="tagpend">Pas encore lisible par l&apos;IA — indexation requise</span>}
            </div>
            <div className="meta">
              <span className="mt">{d.geoLevel} · {geoLabel(d)} · {d.dims.join(", ")} · qualifié le {(d.qualifiedAt ?? d.detectedAt).slice(0, 10)}</span>
              {d.tags.map((t) => <span key={t} className="tagchip">{tagLabel(t)}</span>)}
            </div>
            <div className="pathln">{d.path}</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="esg-note">Aucun document ne correspond aux filtres.</div>}
      </div>

      {externes.length > 0 && (
        <div className="lsec">
          <div className="lsec-h">
            <span className="t">Ressources externes liées</span>
            <span className="s">sources publiques mobilisées par l&apos;analyse — suivent le filtre Dimension</span>
          </div>
          <div className="lext">
            {externes.map((x) => (
              <div key={x.name} className="lext-card">
                <div className="top">
                  <a href={x.url} target="_blank" rel="noopener noreferrer" className="nm">{x.name} ↗</a>
                  <span className="tagext">externe</span>
                </div>
                <div className="ds">{x.desc}</div>
                <div className="mt">{x.dims.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
