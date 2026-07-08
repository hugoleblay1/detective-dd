# Détective DD

Aide à la Notation Développement Durable pour chargés d'affaires : grilles de critères par secteur, questions de due diligence, bibliothèque documentaire contextuelle, et moteur d'analyse d'écart (l'agent vérifie la couverture des exigences — **il ne propose jamais de note**).

Architecture produit : **un moteur générique + un contenu par client**. Chaque déploiement est une instance isolée (Docker) configurée par variables d'environnement et par son dossier `content/`.

## Démarrage rapide

```bash
nvm use                 # Node 24 (.nvmrc)
pnpm install
cp .env.example .env    # renseigner ANTHROPIC_API_KEY
docker compose up db -d # Postgres en conteneur
pnpm dev                # http://localhost:3000 — banc d'essai de l'API
```

`pnpm typecheck` avant de committer.

## Structure

```
content/proparco/        Grilles sectorielles (JSON) — le contenu client, séparé du moteur
docs/prototype-spec.html Prototype validé avec l'équipe IMP = spécification UX de référence
src/lib/grid.ts          Logique grille : non-applicabilité, logique OR des critères,
                         filtrage questions (dimension × critère × note visée), exigences
src/lib/llm/             Abstraction fournisseur LLM (anthropic | internal)
src/lib/gap/engine.ts    Moteur d'analyse d'écart — un appel LLM PAR dimension,
                         contrats zod (jamais d'appel global : troncature JSON)
src/app/api/analyze/     POST /api/analyze
scripts/indexer/         Indexeur de bibliothèque interne (cron sur le serveur cible)
```

## Profils de déploiement

| | Défaut produit | Profil « Proparco » |
|---|---|---|
| LLM | `LLM_PROVIDER=anthropic`, routage par tâche : analyse sur `LLM_MODEL` (Sonnet), extraction/indexation sur `LLM_MODEL_EXTRACTION` (Haiku) | `internal` — implémenter `InternalProvider` selon l'API du LLM interne |
| Hébergement | VM cloud (GCP…), `docker compose --profile prod up` | Serveur on-prem ; ajouter le CA d'entreprise dans l'image (voir Dockerfile, bloc Fortinet) |
| Bibliothèque | dossier local / bucket | partage réseau via `LIBRARY_ROOT` + cron indexeur |
| Contenu | `content/<client>/` | `content/proparco/` |

## Feuille de route V1.5 → V2

1. **Portage UI** : reconstruire l'interface de `docs/prototype-spec.html` en React (Parcourir les critères, Décrire mon dossier, Bibliothèque IMP). Toute la logique métier est déjà dans `src/lib/grid.ts`.
2. **Ingestion PDF** : extraction texte côté serveur pour les documents clients (le prototype ne lisait que du texte brut).
3. **Persistance** : qualifications de la bibliothèque + faits extraits en Postgres (schéma à créer ; le compose est prêt).
4. **Sources externes** : pré-extraction serveur des données pays (Aqueduct, ThinkHazard, ND-GAIN…) — le navigateur ne peut pas les lire, le serveur oui.
5. **Auth** : SSO du client (Entra ID chez Proparco) ; le « mode IMP » du prototype n'était qu'une séparation de rôles de démonstration.
6. **V2** : RAG sur la bibliothèque interne, avis consolidé au chargé d'affaires, secteurs supplémentaires (`content/` accueille déjà plusieurs grilles).

## Règles métier non négociables

- L'agent **ne note pas** : il évalue la couverture des exigences et liste ce qui manque.
- La grille Excel du client reste la source de vérité : publication → JSON dans `content/`.
- Un critère marqué non applicable dans la grille (« Non applicable », « le critère X prévaut », « se reporter aux critères… ») est **exclu** des parcours ; un niveau non applicable est masqué.
- Note validée sur **un seul** critère (+ prérequis de dimension) — logique OR.
- Citations exactes obligatoires dans l'analyse ; jamais de reformulation sans appui textuel.
