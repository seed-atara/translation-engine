# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Lingua — AI Translation Engine

Agency-grade multi-language translation platform for marketing agencies. Translates anything from ad copy to technical whitepapers using a 5-stage Claude multi-agent pipeline, with cultural intelligence, brand safety, and an editorial review workflow via Asana.

## Commands

```bash
npm run dev              # Next.js dev server with Turbopack (localhost:3000)
npm run build            # Production build
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm run db:push          # Push Prisma schema changes (dev only, no migration history)
npm run db:migrate:dev   # Create + apply migration with history (development)
npm run db:migrate       # Apply pending migrations (production/Railway)
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed demo agency + client data
npm run db:generate      # Regenerate Prisma client after schema changes
```

**Railway CLI** (needed for production):
```bash
railway up                              # Deploy to Railway
railway run npm run db:migrate          # Run migrations in Railway environment
railway variables pull                  # Sync env vars from Railway to .env.local
```

## Architecture Overview

### Multi-Agent Translation Pipeline

The core system is a **sequential 5-agent pipeline** that processes each translation job. Lives in `lib/pipeline/translation-pipeline.ts` and is an async generator that emits `PipelineEvent` objects — consumed by the SSE streaming endpoint at `app/api/translate/stream/route.ts`.

```
Source Copy
    │
    ▼
[1] IdiomAgent     (Sonnet 4.6)
    Strips idioms and normalizes to literal language
    │
    ▼
[2] CulturalAgent  (Sonnet 4.6)
    Cultural context, trends, register for target locale
    │
    ▼
[3] CoreAgent      (Opus 4.7 for technical/complex, Sonnet 4.6 for standard)
    Translation with full context injection + prompt-cached client docs
    │
    ▼
[4] SafetyAgent    (Haiku 4.5)
    Brand safety filter — flags and replaces offensive equivalents
    │
    ▼
[5] QAAgent        (Haiku 4.5)
    Per-segment confidence scoring + reviewer notes
    │
    ▼
PipelineResult → DB persist → Asana task creation
```

Each agent receives a typed `PipelineContext` (see `lib/pipeline/types.ts`) and returns a Zod-validated JSON object. Agents communicate via **structured JSON handoffs only** — no raw conversation history is passed between agents, which prevents exponential token accumulation.

**Model routing** (`lib/pipeline/model-router.ts`): Routes to Opus 4.7 when `contentType` is `WHITEPAPER` or `TECHNICAL_DOC`, or when the job has reference document `file_id`s attached. All other jobs use Sonnet 4.6. Haiku 4.5 for Safety + QA always.

**Prompt caching**: Client brand guidelines and tone-of-voice documents are sent as cacheable prefixes in CoreAgent. Cache TTL is 1 hour — sufficient for batch translation sessions.

**Translation memory**: Before CoreAgent runs, `lib/db/queries/translation-memory.ts` loads the 5 most recent editor-approved corrections for the same `clientId` + `targetLang` pair. These are injected as few-shot examples into the CoreAgent system prompt.

### Data Model (Prisma / Railway Postgres)

Key relationships:
- `Agency` → many `Client`s (multi-tenant: each client is an isolated instance)
- `Client` → `ClientDocument[]` (brand docs stored via Anthropic Files API, `file_id` saved in DB)
- `Client` → `TranslationJob[]` → `TranslationSegment[]` (per-segment scoring)
- `EditorCorrection` → `TranslationMemory` (learning system: corrections become few-shot examples)
- `Client` → `AsanaConfig` (one Asana project per client)

`TranslationMemory.weight` increments each time the same correction pattern recurs — used to rank few-shot examples by relevance.

### Asana Integration (`lib/asana/client.ts`)

- **OAuth** for client-facing use; Personal Access Token for internal agency setup
- Creates one Asana task per `TranslationJob` with custom fields: source lang, target lang, confidence score, content type
- Translated content in task description; source text as attachment
- **Webhooks** at `app/api/asana/webhook/route.ts` receive `STORY_ADDED` events (editor comments = corrections). Validated via `X-Hook-Secret` header + HMAC. Corrections are parsed and stored as `EditorCorrection` → `TranslationMemory`.

### App Router Structure

```
app/
├── (auth)/login/               # Auth pages
├── (dashboard)/
│   ├── page.tsx                # Main dashboard: clients, recent jobs, metrics
│   ├── clients/[id]/           # Client config: ToV, audience, document uploads, Asana
│   ├── translate/[clientId]/   # Translation workspace (source → live agent progress → output)
│   ├── review/[jobId]/         # Editor review: inline diff, approve/reject, corrections
│   └── analytics/              # Learning trends, confidence over time, correction patterns
└── api/
    ├── translate/stream/       # SSE endpoint: streams PipelineEvent from async generator
    ├── asana/webhook/          # Asana webhook receiver + HMAC validation
    ├── corrections/            # Direct correction intake from review UI
    └── upload/                 # Document upload → Anthropic Files API → ClientDocument
```

### UI Design System

Dark-first premium design. Colors defined in `tailwind.config.ts` and `app/globals.css`:
- Background: `zinc-950` (#0A0A0B)
- Surface: `zinc-900` (#111113)
- Accent: `indigo-500` (#6366F1)
- Typography: Geist Sans + Geist Mono

Key custom components (not from shadcn):
- `AgentProgress` — animated pipeline stage tracker, shown during translation
- `ConfidenceScore` — color-graded segment-level score bar (green → amber → red)
- `CulturalInsight` — expandable callout showing what cultural adaptations were made
- `SafetyFlag` — warning badge with offensive text + clean replacement
- `TranslationDiff` — inline diff view for editor corrections

shadcn/ui components are in `components/ui/`. Add new ones with: `npx shadcn@latest add <component>`.

## Environment Variables

See `.env.example`. Critical vars:
- `DATABASE_URL` — Railway Postgres connection string
- `ANTHROPIC_API_KEY` — for all 5 agents + Files API
- `ASANA_CLIENT_ID` + `ASANA_CLIENT_SECRET` — OAuth
- `ASANA_WEBHOOK_SECRET` — per-client, stored in `AsanaConfig`
- `NEXTAUTH_SECRET` — NextAuth.js session signing

## Key Patterns

**Never** accumulate full conversation history across agents — always extract a typed JSON result and pass only that to the next agent.

**Always** use Zod schemas for agent output validation (see `lib/pipeline/types.ts`). If an agent returns malformed JSON, the pipeline catches and retries once with an explicit correction instruction before failing the job.

**Files API** (`lib/files/client.ts`): Documents are uploaded once and stored by `anthropicFileId` in `ClientDocument`. When building the CoreAgent request, include document file_ids in the `files` parameter. Requires header `anthropic-beta: files-api-2025-04-14`.

**Streaming**: The translate endpoint is a ReadableStream/SSE. The frontend uses a custom `useTranslationStream` hook that consumes `PipelineEvent` objects and updates React state per agent stage.
