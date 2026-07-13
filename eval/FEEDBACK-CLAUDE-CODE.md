# FEEDBACK POUR CLAUDE CODE — issu de l'évaluation du 2026-07-13

Score : 20/27. Les points ci-dessous sont des PATTERNS d'échec observés,
à corriger dans le moteur (src/lib/gap/engine.ts : prompt et logique), PAS en modifiant la vérité terrain ni le corpus.
Règle absolue inchangée : l'agent ne propose jamais de note.

- STRICTNESS : trop de 'partiel' sur le deal B — l'agent confond communication et éléments probants.
- SEUILS : 30% documentés < seuil de 50% — l'agent doit relever l'écart au seuil, pas seulement l'existence de la donnée.

Détail complet des cas : eval/report.md. Après correction, relancer `pnpm eval` et vérifier la non-régression des cas déjà verts.