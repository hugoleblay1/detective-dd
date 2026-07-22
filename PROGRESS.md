# PROGRESS — Détective DD

État au 2026-07-22. File de travail détaillée : `BACKLOG.md`.

## Fait

- **Refonte UI complète sur la maquette Claude design** (validée, v2). Design tokens dans `src/app/theme.css` (voir `TOKENS.md`, contrôle sur `/style-guide`), typo Source Sans 3 / Source Serif 4, header et onglets avec stepper. Les quatre écrans sont portés : Décrire mon dossier (cartes, CTA collant, écran d'analyse à étapes réelles), Résultats (bandeau de synthèse, accordéons par dimension, cartes de verdict, « À redemander » avec copie), Parcourir les critères (sidebar par pilier, chemins OU, drawer « Ressources par pays »), Bibliothèque IMP (porte dans l'onglet, stats et jauges de couverture, file de qualification, filtres). Logique métier et contrats API intacts ; l'or ne code plus le +2 (accent de marque), échelle 0 neutre / positifs en vert. Progression de l'écran d'analyse : rythme visuel sans streaming API — acté, pas d'évolution prévue.

- **P0 — Parité prototype : terminée.** Parcours des critères, description du dossier avec analyse d'écart, bibliothèque IMP + qualification, ingestion PDF. Audit de parité du 2026-07-08 : logique métier 100 % conforme (divergences volontaires documentées dans `grid.ts`).
- **P1 — Quasi terminée.**
  - Avis qualitatif consolidé par dimension (jamais de note).
  - Résumé contextuel sourcé : Banque mondiale, CCKP / Aqueduct / ThinkHazard (Adaptation), Ember via OWID (Atténuation) ; persistance en base, cache 30 j.
  - Extraction PDF multimodale (tableaux et graphiques exploités, replis signalés).
  - Référentiel méthodologique client (`content/<client>/definitions.json`), injecté dans les prompts et affiché dans le parcours.
  - RAG bibliothèque interne : pgvector + embeddings locaux, top 6 passages par dimension, citations « titre, p.X », badge « non indexé ».
  - Routage de modèles par tâche (analyse vs extraction).
  - Texte CHAFF citable mais plafonné à « partiel » (le document client manquant est nommé).
- **Qualité** : 28 tests sur `grid.ts` (`pnpm test`) ; harnais d'éval boîte noire (`pnpm eval`) sur corpus factice — référence courante **20/27, 0 hallucination** ; pack holdout prêt (10 cas jamais vus, thermomètre de généralisation, voir `eval/README-HOLDOUT.md`).

## En cours / à brancher

- Connecteur Protected Planet (Biodiversité) — clé API demandée le 2026-07-08, à brancher dès réception (`PROTECTED_PLANET_TOKEN`).
- Genre exclu de l'analyse du dossier (questionnaire/outil 2X dédiés) — réintégration à décider (item P1 du backlog).

## Prochaine file (P2)

- Localisation du projet (pays → région → GPS) et exploitation fine des connecteurs existants.
- Connecteurs bibliothèque par profil (dossier local / partage réseau / SharePoint).
- Deuxième secteur dans `content/` (valide la généricité) ; auth Entra ID.

## Dettes

- Republication Excel → JSON à industrialiser (commande unique + validation de schéma).
- `.docx`/`.xlsx` non indexés par le RAG (signalés dans l'UI).
