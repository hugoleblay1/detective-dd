# Boucle d'évaluation — mode d'emploi

## Installation (une fois)
1. Dézipper le corpus dans `eval/corpus/` :
   `eval/corpus/deal-A-voltagrid-datacentre-kenya/…` (les `.md` suffisent au harnais).
2. Ajouter le script dans package.json : `"eval": "tsx eval/run-eval.ts"`.
3. Committer `eval/` (corpus fictif inclus : c'est le harnais de non-régression du repo).

## La boucle
```
pnpm dev                 # terminal 1 — l'appli tourne
pnpm eval                # terminal 2 — ~20 appels API, 2-3 min
```
Le harnais produit :
- `eval/report.md` — le détail cas par cas (attendu vs obtenu, citations non retrouvées) ;
- `eval/FEEDBACK-CLAUDE-CODE.md` — les patterns d'échec, formulés en instructions actionnables.

Puis, dans Claude Code :
```
Lis eval/FEEDBACK-CLAUDE-CODE.md et eval/report.md. Corrige le moteur
(src/lib/gap/engine.ts — prompt et logique) pour traiter les patterns listés,
SANS toucher à eval/ (vérité terrain et corpus sont la référence) et sans
enfreindre les règles du CLAUDE.md. Propose ton plan avant de coder.
```
Relancer `pnpm eval` après correction : les cas verts doivent le rester (non-régression).

## Lecture du score
- Le verdict d'un cas = statut **dominant** des questions du bloc (égalité → le plus défavorable).
- Les assertions ciblées portent les discriminations clés : rigueur anti-marketing (deal B),
  conditions composées +2/+3 (deal D), écart au seuil (deal E · Chaînes de valeur),
  fidélité mot à mot des citations (tous).
- Codes retour : 0 si tout passe, 1 sinon — prêt pour un hook CI plus tard.

## Limites honnêtes
- Le harnais lit les `.md` du corpus ; l'ingestion PDF se teste séparément (mêmes contenus en `.pdf`).
- Un LLM n'est pas déterministe : un cas frontière peut osciller entre deux runs.
  Un cas qui échoue une fois sur trois est un vrai signal de fragilité du prompt, pas du bruit à ignorer.
- Si le contrat de `/api/analyze` a évolué depuis le starter, adapter la fonction `callAnalyze` (un seul endroit).
