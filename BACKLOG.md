# Backlog priorisé

Règle de file : **parité avec le prototype validé d'abord** (P0), nouveautés ensuite. Une tranche = compilable, typée, committée.

## P0 — Parité prototype (la spec : `docs/prototype-spec.html`)

- [ ] **UI « Parcourir les critères »** en React sur `src/lib/grid.ts` : dimensions, prérequis en bandeau, critères non mobilisables exclus avec explication, niveaux NA masqués, mise en gras des éléments signifiants, questions filtrables (Planète avec sous-filtre Atténuation/Adaptation/Biodiversité).
- [ ] **UI « Décrire mon dossier »** : notes visées + critère visé (logique OR, options filtrées par note), documents collés/joints, appel `/api/analyze`, tableau de couverture à code couleur, liste « à redemander au client », moteur affiché (IA / erreur) par dimension.
- [ ] **Bibliothèque + file de qualification** : indexeur (`scripts/indexer`) branché sur un dossier local de dev, écran de qualification (métadonnées : titre, géographie à 3 niveaux, dimensions, tags), persistance Postgres (schéma à créer), affichage des ressources internes dans le contexte de chaque dimension.
- [ ] **Ingestion PDF** des documents du dossier (extraction texte serveur) — le prototype ne lisait que du texte brut.

## P1 — Le cran au-dessus du prototype

- [ ] **Avis qualitatif consolidé** par dimension (forces / faiblesses / à obtenir / maturité vs note visée) au-dessus du tableau — contrat zod dédié, toujours sans note.
- [ ] **Résumé contextuel à l'écran** par dimension × pays : pré-extraction serveur des indicateurs de base (aires protégées, stress hydrique, indicateurs d'inclusion…) avec source + date, stockés en base — remplace les simples liens.
- [ ] **RAG banque interne** : pgvector, découpage/indexation des documents qualifiés, injection des passages pertinents dans l'analyse avec citation.
- [ ] **Routage de modèles** : configuration par tâche (léger pour extraction/indexation, supérieur pour analyse) dans la couche `llm/`.

## P2 — Ancrage local et connecteurs

- [ ] **Localisation du projet** (pays → région → point GPS optionnel) pour Adaptation, Biodiversité, Social/Territoires ; sources spatiales correspondantes (bassin versant, aléas par zone, aires protégées à proximité, indicateurs territoriaux).
- [ ] **Connecteurs bibliothèque** par profil : dossier local (dev) / partage réseau (Proparco) / SharePoint (M365).
- [ ] **Deuxième secteur** dans `content/` (Financier/IF) — valide la généricité du moteur.
- [ ] **Auth** par profil (Entra ID chez Proparco).

## P3 — Extension marché

- [ ] Branding configurable par instance (logo, couleurs, libellés).
- [ ] Profil « entreprise » en lecture guidée (auto-évaluation contre une grille publiée).
- [ ] Packaging commercial : script d'installation d'instance, documentation d'exploitation.

## Hors file (dettes et garde-fous)

- Republication Excel → JSON industrialisée (commande unique, validation de schéma).
- Jeu de tests sur `grid.ts` (les règles de non-applicabilité et de filtrage sont le cœur métier).
