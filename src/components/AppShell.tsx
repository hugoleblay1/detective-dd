"use client";
import { useEffect, useState } from "react";
import type { MethodDefinition, SectorGrid } from "@/lib/grid";
import type { LibraryDoc } from "@/lib/library";
import { BrowseView } from "./BrowseView";
import { AgentView } from "./AgentView";
import { LibraryView } from "./LibraryView";

type Tab = "browse" | "agent" | "lib";
export type AgentPhase = "description" | "analyse" | "resultats";
const PHASES: { key: AgentPhase; num: string; label: string }[] = [
  { key: "description", num: "1", label: "Décrire le dossier" },
  { key: "analyse", num: "2", label: "Analyse" },
  { key: "resultats", num: "3", label: "Résultats" },
];
export function AppShell({ grid, defs }: { grid: SectorGrid; defs: MethodDefinition[] }) {
  const subtypes = Object.keys(grid.subtypes);
  const [sub, setSub] = useState(subtypes.includes("Data Centre") ? "Data Centre" : subtypes[0]);
  const [geo, setGeo] = useState("Kenya");
  const [tab, setTab] = useState<Tab>("browse");
  // Porte IMP : affichée dans l'onglet Bibliothèque (LibraryView), déverrouillage mémorisé ici.
  const [imp, setImp] = useState(false);
  const [docs, setDocs] = useState<LibraryDoc[] | null>(null);
  // Étape du flux « Décrire mon dossier », affichée dans la barre d'onglets (stepper).
  const [agentPhase, setAgentPhase] = useState<AgentPhase>("description");

  useEffect(() => {
    fetch("/api/library").then((r) => r.json()).then((d) => setDocs(d.documents ?? [])).catch(() => setDocs([]));
  }, []);

  function onQualified(doc: LibraryDoc) {
    setDocs((prev) => (prev ?? []).map((d) => (d.id === doc.id ? doc : d)));
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <div className="hdr-brand">
            <div className="hdr-eyebrow">Proparco · Secteur {grid.sector}</div>
            <div className="hdr-titleline">
              <h1 className="title">Détective DD</h1>
              <span className="subtitle">Aide à la notation développement durable</span>
            </div>
          </div>
          <div className="hdr-right">
            <span className="hdr-tagline">L&apos;outil vérifie la couverture et cite ses sources. La note reste une décision humaine.</span>
            <span className={"badge-int" + (imp ? " badge-imp" : "")}>{imp ? "Mode IMP" : "Interne"}</span>
            {imp && <span className="imp-link" onClick={() => setImp(false)}>Quitter le mode IMP</span>}
          </div>
        </div>
      </header>
      <div className="tabbar">
        <div className="wrap">
          <button className={tab === "browse" ? "on" : ""} onClick={() => setTab("browse")}>Parcourir les critères</button>
          <button className={tab === "agent" ? "on" : ""} onClick={() => setTab("agent")}>Décrire mon dossier</button>
          <button className={tab === "lib" ? "on" : ""} onClick={() => setTab("lib")}>Bibliothèque IMP</button>
          {tab === "agent" && (
            <div className="stepper">
              {PHASES.map((p, i) => {
                const cur = PHASES.findIndex((x) => x.key === agentPhase);
                const cls = i < cur ? "done" : i === cur ? "cur" : "";
                return (
                  <span key={p.key} className={`st ${cls}`}>
                    <span className="n">{i < cur ? "✓" : p.num}</span>
                    <span className="l">{p.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="wrap">
        {tab === "browse" && (
          <BrowseView grid={grid} sub={sub} geo={geo} libDocs={docs ?? []} defs={defs} onSub={setSub} onGeo={setGeo} />
        )}
        {tab === "agent" && (
          <AgentView grid={grid} sub={sub} geo={geo} subtypes={subtypes}
            onSub={setSub} onGeo={setGeo} onPhase={setAgentPhase} />
        )}
        {tab === "lib" && <LibraryView docs={docs} geo={geo} unlocked={imp} onUnlock={() => setImp(true)} onQualified={onQualified} />}
        <div className="foot">
          Grille = Excel maître (source de vérité), republié vers l&apos;appli.<br />
          L&apos;agent évalue la couverture et cite ses sources ; la note reste une décision humaine.
        </div>
      </div>
    </>
  );
}
