"use client";
import { useEffect, useState } from "react";
import type { SectorGrid } from "@/lib/grid";
import type { LibraryDoc } from "@/lib/library";
import { ControlBar } from "./ControlBar";
import { BrowseView } from "./BrowseView";
import { AgentView } from "./AgentView";
import { LibraryView } from "./LibraryView";

type Tab = "browse" | "agent" | "lib";
/** Démo : séparation de rôle visuelle, PAS un contrôle d'accès sécurisé (auth réelle = P2). */
const IMP_PASSWORD = "imp2026";

export function AppShell({ grid }: { grid: SectorGrid }) {
  const subtypes = Object.keys(grid.subtypes);
  const [sub, setSub] = useState(subtypes.includes("Data Centre") ? "Data Centre" : subtypes[0]);
  const [geo, setGeo] = useState("Kenya");
  const [tab, setTab] = useState<Tab>("browse");
  const [imp, setImp] = useState(false);
  const [modal, setModal] = useState(false);
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState(false);
  const [docs, setDocs] = useState<LibraryDoc[] | null>(null);

  useEffect(() => {
    fetch("/api/library").then((r) => r.json()).then((d) => setDocs(d.documents ?? [])).catch(() => setDocs([]));
  }, []);

  function tryImp() {
    if (pass === IMP_PASSWORD) { setImp(true); setModal(false); setPass(""); setPassErr(false); setTab("lib"); }
    else setPassErr(true);
  }
  function toggleImp() {
    if (imp) { setImp(false); if (tab === "lib") setTab("browse"); }
    else { setModal(true); setPass(""); setPassErr(false); }
  }
  function onQualified(doc: LibraryDoc) {
    setDocs((prev) => (prev ?? []).map((d) => (d.id === doc.id ? doc : d)));
  }

  return (
    <>
      <div className="brandline" />
      <header className="top">
        <div className="wrap">
          <div>
            <h1 className="title">Outil Détective DD — Secteur {grid.sector}</h1>
            <div className="subtitle">Notation Développement Durable · aide à la notation autonome pour chargés d&apos;affaires</div>
          </div>
          <div className="hdr-right">
            <span className={"badge-int" + (imp ? " badge-imp" : "")}>{imp ? "Mode IMP · équipe Impact" : "Interne"}</span>
            <span className="imp-link" onClick={toggleImp}>{imp ? "Quitter le mode IMP" : "Mode IMP"}</span>
          </div>
        </div>
      </header>
      <div className="wrap">
        <ControlBar subtypes={subtypes} sub={sub} geo={geo} onSub={setSub} onGeo={setGeo} />
        <div className="tabs">
          <button className={tab === "browse" ? "on" : ""} onClick={() => setTab("browse")}>Parcourir les critères</button>
          <button className={tab === "agent" ? "on" : ""} onClick={() => setTab("agent")}>Décrire mon dossier</button>
          {imp && <button className={tab === "lib" ? "on" : ""} onClick={() => setTab("lib")}>Bibliothèque IMP</button>}
        </div>
        {tab === "browse" && <BrowseView grid={grid} sub={sub} geo={geo} libDocs={docs ?? []} />}
        {tab === "agent" && <AgentView grid={grid} sub={sub} geo={geo} />}
        {tab === "lib" && <LibraryView docs={docs} onQualified={onQualified} />}
        <div className="foot">
          Grille = Excel maître (source de vérité), republié vers l&apos;appli.<br />
          L&apos;agent évalue la couverture et cite ses sources ; la note reste une décision humaine.
        </div>
      </div>

      {modal && (
        <div className="modal-bg show" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal">
            <h3>Mode IMP</h3>
            <p>Accès équipe Impact — qualification des documents de la bibliothèque interne. (Démo : séparation des rôles, pas un contrôle d&apos;accès sécurisé.)</p>
            <input type="password" autoFocus value={pass} placeholder="Mot de passe"
              onChange={(e) => { setPass(e.target.value); setPassErr(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") tryImp(); }} />
            {passErr && <div className="merr" style={{ display: "block" }}>Mot de passe incorrect.</div>}
            <div className="mrow">
              <button className="btn ghost small" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn small" onClick={tryImp}>Entrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
