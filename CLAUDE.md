# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Détective DD helps deal officers ("chargés d'affaires") at a development finance institution assess sustainable-development (DD) ratings for investments: sector-specific criteria grids, due-diligence questions, a contextual document library, and a gap-analysis engine.

**Non-negotiable rule: the agent never proposes a rating.** It only evaluates whether the grid's requirements are covered by the client's documents and lists what's missing. Don't build or suggest features that make the LLM output/suggest a note.

Product architecture: **one generic engine + per-client content**. Each deployment is an isolated instance (Docker) configured entirely via environment variables and its own `content/<client>/` folder — never hardcode client-specific behavior into `src/`.

## Commands

```bash
nvm use                 # Node 24 (.nvmrc)
pnpm install
cp .env.example .env    # set ANTHROPIC_API_KEY
docker compose up db -d # Postgres in a container
pnpm dev                # http://localhost:3000 — API test bench
pnpm typecheck           # tsc --noEmit — run before committing
pnpm build
pnpm indexer             # tsx scripts/indexer/index-share.ts — library indexer
```

There is no test suite or linter configured yet — `pnpm typecheck` is the only automated check before committing.

## Architecture

```
content/proparco/*.json   Sector grids — client content, kept separate from the engine
docs/prototype-spec.html  Team-validated prototype = reference UX spec (not yet ported to React)
src/lib/grid.ts           Grid logic: non-applicability, criteria OR-logic, question
                           filtering (dimension × criterion × target note), requirement text
src/lib/llm/              LLM provider abstraction (anthropic | internal)
src/lib/gap/engine.ts     Gap-analysis engine — ONE LLM call PER dimension, zod-validated
                           output contracts (never one global call — risks JSON truncation)
src/app/api/analyze/      POST /api/analyze — the only API route
scripts/indexer/          Internal library indexer (runs as a cron job on the target server)
```

### Grid model (`src/lib/grid.ts`)

- A `SectorGrid` has `subtypes`, each with `notation_dd.dimensions` (Atténuation, Adaptation, Social, Genre, Biodiversité) and `key_qs.questions`.
- A criterion level whose text matches "Non applicable" / "le critère X prévaut" / "se reporter aux critères…" (see `NA_RX`) is excluded from the flow — `critExcluded`/`lvlNA` implement this everywhere, don't re-derive it ad hoc.
- **OR logic**: a target note is validated if it's reached on a *single* criterion within a dimension (plus the dimension's prerequisite for `+2`/`+3`). See `critsForNote`/`exigence`.
- Questions are matched to dimension/criterion/note via `questionsFor` — the Social and Genre dimensions have special-cased matching rules (`qMatchesCrit`) because their `dimension` field encodes sub-criteria differently than the Planète dimensions.

### Gap engine (`src/lib/gap/engine.ts`)

- One `analyze()` call fans out to one LLM request per requested dimension (`req.targets`), run in parallel with `Promise.all`. This is deliberate — a single call across all dimensions risks truncated JSON.
- Prompts require exact quotes (≤12 words, with document name) for anything marked available (`disponibles`); the LLM must not paraphrase without textual support, and must not deduce coverage from a "neighboring" theme (`statut` is `repondu`/`partiel`/`manquant`).
- LLM output is parsed with `parseLLMJson` (finds the outermost `{...}`) and validated against the `BlockResult` zod schema. On failure, `engine` is set to `"erreur"` for that block rather than throwing for the whole request.

### LLM provider abstraction (`src/lib/llm/index.ts`)

- `getProvider()` picks a provider from `LLM_PROVIDER` env var: `anthropic` (default, calls the Anthropic Messages API directly with `LLM_MODEL`) or `internal` (stub `InternalProvider` — throws until a deployment implements it against a client's internal LLM endpoint).
- The gap engine only ever depends on the `LLMProvider.complete()` interface — adding a new provider means implementing this interface, not touching `engine.ts`.

## Deployment profiles

| | Product default | "Proparco" profile |
|---|---|---|
| LLM | `LLM_PROVIDER=anthropic` (Claude) | `internal` — implement `InternalProvider` per the internal LLM's API |
| Hosting | Cloud VM, `docker compose --profile prod up` | On-prem server; add the corporate CA to the image (see `Dockerfile`, Fortinet block) |
| Library | Local folder / bucket | Network share via `LIBRARY_ROOT` + indexer cron |
| Content | `content/<client>/` | `content/proparco/` |

## Roadmap (V1.5 → V2)

1. Port the UI from `docs/prototype-spec.html` to React (Browse criteria, Describe my deal, IMP library). All business logic already lives in `src/lib/grid.ts` — `src/app/page.tsx` is currently just a raw API test bench, not the real UI.
2. PDF ingestion: server-side text extraction for client documents (the prototype only read plain text).
3. Persistence: library qualifications + extracted facts in Postgres (schema not yet created; `docker-compose.yml` has the `db` service ready).
4. External sources: server-side pre-extraction of country data (Aqueduct, ThinkHazard, ND-GAIN…) — the browser can't fetch these directly, the server can.
5. Auth: client SSO (Entra ID for Proparco); the prototype's "IMP mode" was only a demo role split.
6. V2: RAG over the internal library, a consolidated opinion surfaced to the deal officer, additional sectors (`content/` is designed to hold multiple grids).

## Business rules (non-negotiable)

- The agent **never rates**: it evaluates requirement coverage and lists what's missing.
- The client's Excel grid is the source of truth: publishing it means turning it into JSON under `content/`.
- A criterion marked non-applicable in the grid is excluded from all flows; a non-applicable level is hidden.
- A note is validated on a **single** criterion (+ dimension prerequisite) — OR logic, not AND.
- Exact quotes are mandatory in the analysis output; never paraphrase without textual support.
