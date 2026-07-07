import { loadGrids } from "@/lib/grid.loader";
import { BrowseView } from "@/components/BrowseView";

/**
 * Onglet « Parcourir les critères » (portage du prototype validé, docs/prototype-spec.html).
 * Composant serveur : charge la grille du secteur ; toute la logique métier vient de `grid.ts`.
 */
export default function Home() {
  const grid = loadGrids()["Numérique"];
  if (!grid) {
    return (
      <div className="wrap">
        <p style={{ padding: "40px 0", color: "var(--muted)" }}>
          Grille « Numérique » introuvable dans <code>content/</code>.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="brandline" />
      <BrowseView grid={grid} />
    </>
  );
}
