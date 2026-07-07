"use client";
import { useState } from "react";
import type { SectorGrid } from "@/lib/grid";
import { ControlBar } from "./ControlBar";
import { BrowseView } from "./BrowseView";
import { AgentView } from "./AgentView";

type Tab = "browse" | "agent";

export function AppShell({ grid }: { grid: SectorGrid }) {
  const subtypes = Object.keys(grid.subtypes);
  const [sub, setSub] = useState(subtypes.includes("Data Centre") ? "Data Centre" : subtypes[0]);
  const [geo, setGeo] = useState("Kenya");
  const [tab, setTab] = useState<Tab>("browse");
  return (
    <>
      <div className="brandline" />
      <header className="top">
        <div className="wrap">
          <div>
            <h1 className="title">Outil Détective DD — Secteur {grid.sector}</h1>
            <div className="subtitle">Notation Développement Durable · aide à la notation autonome pour chargés d&apos;affaires</div>
          </div>
          <div className="hdr-right"><span className="badge-int">Interne</span></div>
        </div>
      </header>
      <div className="wrap">
        <ControlBar subtypes={subtypes} sub={sub} geo={geo} onSub={setSub} onGeo={setGeo} />
        <div className="tabs">
          <button className={tab === "browse" ? "on" : ""} onClick={() => setTab("browse")}>Parcourir les critères</button>
          <button className={tab === "agent" ? "on" : ""} onClick={() => setTab("agent")}>Décrire mon dossier</button>
        </div>
        {tab === "browse"
          ? <BrowseView grid={grid} sub={sub} geo={geo} />
          : <AgentView grid={grid} sub={sub} geo={geo} />}
        <div className="foot">
          Grille = Excel maître (source de vérité), republié vers l&apos;appli.<br />
          L&apos;agent évalue la couverture et cite ses sources ; la note reste une décision humaine.
        </div>
      </div>
    </>
  );
}
