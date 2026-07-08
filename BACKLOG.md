# Backlog priorisé

Règle de file : **parité avec le prototype validé d'abord** (P0), nouveautés ensuite. Une tranche = compilable, typée, committée.

## P0 — Parité prototype (la spec : `docs/prototype-spec.html`)

> Audit de parité (2026-07-08, `scripts/parity-audit.ts`) : logique métier 100 % conforme (critExcluded, naList, critsForNote, questionsFor). Seules divergences volontaires — `singleNoteCrits` (correction du bug « Accès » du prototype) et `exigence` (filtre les niveaux « Non applicable », documenté dans `grid.ts`). Hors périmètre convenu : mode IMP / onglet Bibliothèque, docs internes de contexte.

- [x] **UI « Parcourir les critères »** en React sur `src/lib/grid.ts` : dimensions, prérequis en bandeau, critères non mobilisables exclus avec explication, niveaux NA masqués, mise en gras des éléments signifiants, questions filtrables (Planète avec sous-filtre Atténuation/Adaptation/Biodiversité).
- [x] **UI « Décrire mon dossier »** : notes visées + critère visé (logique OR, options filtrées par note), documents collés/joints, appel `/api/analyze`, tableau de couverture à code couleur, liste « à redemander au client », moteur affiché (IA / erreur) par dimension.
- [x] **Bibliothèque + file de qualification** : indexeur (`scripts/indexer`) → upsert Postgres (`library_document`), mode IMP (porte démo) + écran de qualification (titre, géographie à 3 niveaux, dimensions, tags), ressources internes qualifiées affichées dans le contexte des dimensions + pointeurs passés à l'analyse. *Reste :* purge des fichiers disparus (upsert seulement) ; auth réelle = P2.
- [x] **Ingestion PDF** des documents du dossier (extraction texte serveur) — le prototype ne lisait que du texte brut.

## P1 — Le cran au-dessus du prototype

- [x] **Avis qualitatif consolidé** par dimension (forces / faiblesses / à obtenir / maturité vs note visée) au-dessus du tableau — contrat zod dédié (`DimSynthesis`), appel LLM séparé nourri des verdicts de couverture, échec indépendant du tableau, toujours sans note (maturité = complétude documentaire, jamais une note).
- [~] **Résumé contextuel à l'écran** par dimension × pays : pré-extraction serveur des indicateurs de base (aires protégées, stress hydrique, indicateurs d'inclusion…) avec source + date, stockés en base — remplace les simples liens. *Amorcé* : connecteur Banque mondiale (`src/lib/context/`, 4 dimensions) ; Adaptation servie par les trois sources de référence de l'équipe (CCKP, WRI Aqueduct, ThinkHazard! — voir PRODUCT.md), affichées dans l'analyse et injectées au prompt ; indicateurs persistés en base (`context_indicator`, cache 30 j, copie datée servie si les API tombent, portage des lignes saines si une source échoue) ; Atténuation enrichie d'Ember via Our World in Data (intensité carbone + part renouvelable, sans clé). Reste : connecteur Protected Planet (Biodiversité) — clé API demandée par Hugo (2026-07-08), à brancher dès réception (`PROTECTED_PLANET_TOKEN` en `.env`). L'« exploitation plus fine » est traitée en P2 avec la localisation (décidé 2026-07-08).
- [x] **Extraction PDF multimodale** (constat test Hugo 2026-07-08 : tableaux et graphiques invisibles) : lecture PDF native par l'étage « extraction » (`extractPdf` dans `llm/`, tableaux → markdown, données des graphiques explicitées), repli unpdf toujours signalé (`note` affichée) ; troncature 12k → 80k caractères/document ; caps desserrés (4 points/question, citations ≤ 25 mots, 4 forces/faiblesses). Limites lecture enrichie : 100 pages / 30 Mo → repli texte signalé.
- [ ] **RAG banque interne** : pgvector, découpage/indexation des documents qualifiés, injection des passages pertinents dans l'analyse avec citation.
- [x] **Routage de modèles** : configuration par tâche dans la couche `llm/` — `getProvider("analyse")` (LLM_MODEL, Sonnet par défaut) pour l'analyse d'écart et l'avis qualitatif, `getProvider("extraction")` (LLM_MODEL_EXTRACTION, Haiku par défaut) pour les tâches mécaniques ; le RAG s'y branchera.

- [ ] **Réintégrer le Genre dans l'analyse du dossier** : exclu pour le moment (`DIMS_EXCLUDED_FROM_ANALYSIS`) — la dimension est très verbeuse (sortie JSON tronquée) et une partie de ses questions relève du questionnaire et de l'outil Genre dédiés (2X). À revoir : découpage de l'appel, sous-ensemble de questions propre à l'analyse du dossier, ou pont vers l'outil dédié.

## P2 — Ancrage local et connecteurs

- [ ] **Localisation du projet** (pays → région → point GPS optionnel) pour Adaptation, Biodiversité, Social/Territoires ; sources spatiales correspondantes (bassin versant, aléas par zone, aires protégées à proximité, indicateurs territoriaux). Inclut l'« exploitation plus fine » du résumé contextuel : les connecteurs existants (CCKP régional, Aqueduct par bassin, ThinkHazard par province) servent déjà l'infranational, à brancher sur la localisation.
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
