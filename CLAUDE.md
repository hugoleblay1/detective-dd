# CLAUDE.md — Détective DD

Outil d'aide à la Notation Développement Durable pour investisseurs à impact.
Vision complète : `PRODUCT.md`. File de travail : `BACKLOG.md`. Spec UX de référence : `docs/prototype-spec.html` (prototype validé avec l'équipe IMP de Proparco — parité d'abord, nouveautés ensuite).

## Commandes

```bash
pnpm dev                  # serveur de dev (http://localhost:3000)
pnpm typecheck            # obligatoire avant tout commit
pnpm test                 # tests du cœur métier (grid.ts) — node:test via tsx
docker compose up db -d   # Postgres
pnpm indexer              # indexeur bibliothèque (LIBRARY_ROOT)
```

## Architecture — où vivent les choses

- `src/lib/grid.ts` — **unique source de la logique métier** (non-applicabilité, logique OR, filtrage questions par dimension × critère × note, exigences). L'UI ne réimplémente jamais ces règles ; toute évolution métier passe par ce module et ses tests.
- `src/lib/llm/` — abstraction fournisseur (anthropic | internal). Le moteur ne connaît que l'interface `LLMProvider`. Prévoir le routage par tâche (modèle léger pour extraction, supérieur pour analyse).
- `src/lib/gap/engine.ts` — analyse d'écart : **un appel LLM par dimension** (jamais d'appel global : troncature JSON), contrats zod, citations obligatoires.
- `content/<client>/` — grilles JSON par client + `definitions.json` (référentiel méthodologique : termes définis par le client, injectés dans les prompts des dimensions concernées et affichés dans le parcours des critères). Le moteur n'embarque aucune méthodologie en dur.
- `scripts/indexer/` — détection des documents de la bibliothèque interne ; la qualification (métadonnées) est faite par un expert dans l'appli.

## Règles métier non négociables

1. **L'agent ne propose JAMAIS de note.** Il évalue la couverture, cite, liste ce qui manque, guide sur la qualité du dossier. La note est une décision humaine.
2. **L'Excel du client est la source de vérité**, modulable par lui. Publication Excel → JSON dans `content/` ; jamais d'édition de la méthodologie dans l'appli (V1).
3. **Non-applicabilité** : un critère marqué non mobilisable dans la grille (« Non applicable », « le critère X prévaut », « se reporter aux critères… ») est exclu des parcours ; un niveau non applicable est masqué. Détection : `lvlNA`/`critExcluded` dans `grid.ts`.
4. **Logique OR** : une note se valide sur UN seul critère au niveau visé, plus le prérequis de la dimension (+2/+3).
5. **Citations exactes obligatoires** (≤ 15 mots, avec nom du document/source) ; aucune affirmation sans appui textuel ou donnée sourcée. En cas d'échec LLM : erreur explicite, jamais de repli silencieux.
6. **Confidentialité** : les documents internes d'un client ne transitent que par son infrastructure. En dev : corpus factice uniquement.

## Conventions

- TypeScript strict ; contrats d'API et de sorties LLM validés par zod.
- UI en français ; terminologie du domaine : CHAFF (chargé d'affaires), IMP (équipe impact), dimensions = Atténuation, Adaptation, Biodiversité (Planète), Social, Genre.
- Charte : bleu `#000191`, or `#FDC533` (= +2, la note qui qualifie), échelle rouge → vert.
- Tranches courtes : plan validé avant d'écrire, `pnpm typecheck` vert, commit par tranche.
- Secrets uniquement en `.env` (gitignoré) ; ne jamais écrire de clé dans un fichier versionné ni dans ce fichier.
