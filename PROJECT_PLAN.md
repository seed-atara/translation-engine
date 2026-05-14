# Lingua — Project Plan

## Vision

An AI-native marketing translation platform that replaces headcount-heavy translation workflows. A 5-agent Claude pipeline handles 95% of the work; human editors review, approve, and teach the system. Every correction makes future translations better.

**Target user**: Marketing professionals at agencies managing multi-market clients. Time-poor, cost-constrained, demanding quality that reads as native.

---

## Architecture Decisions

### Why Claude Managed Agents (not a framework like LangChain)
The Anthropic SDK's native multi-agent pattern (sequential message API calls with structured JSON handoffs) is more reliable, cheaper, and easier to debug than orchestration frameworks. Each agent is a pure function: `(Anthropic client, PipelineContext) → TypedOutput`. No hidden state, no framework magic.

### Why Railway Postgres (not Supabase)
Railway provides Postgres as a first-class plugin, co-located with the app. No additional service, no separate auth layer, no extra cost tier. Prisma handles schema and migrations. The only reason to add Supabase would be if real-time subscriptions across clients became critical — not required at launch.

### Why Railway Volumes for file storage (not S3)
For MVP at agency scale (tens to hundreds of clients), Railway Volumes are sufficient and eliminate operational overhead. Documents (brand guidelines, reference PDFs) are uploaded once, stored in Railway Volumes, then sent to the Anthropic Files API. The `anthropicFileId` is persisted in Postgres. If storage needs exceed Railway Volumes' limits, swap the upload layer to Cloudflare R2 with no changes to the rest of the stack.

### Model routing rationale
- **Opus 4.7** → Technical docs, whitepapers, content with reference materials. Highest accuracy, worth the cost for complex content.
- **Sonnet 4.6** → Standard marketing copy (majority of jobs). Best quality/cost balance.
- **Haiku 4.5** → Safety checking and QA scoring. These are verification tasks, not generation — Haiku is 5x cheaper and sufficient.

### Learning system design
Translation memory is stored as weighted records. Each time an editor corrects a translation, a `TranslationMemory` row is created or its `weight` incremented. Before each CoreAgent call, the top-5 weighted memories for the same `clientId × targetLang` pair are injected as few-shot examples. This gives the system a compounding advantage: clients with more correction history get better first-pass translations.

---

## Phases

### Phase 1 · Foundation (Days 1–5)
**Goal**: Running app with auth, multi-tenant data, and basic client CRUD.

Tasks:
- [ ] `npx create-next-app@latest` with TypeScript + Tailwind + App Router
- [ ] Install dependencies (Prisma, Anthropic SDK, NextAuth, Radix, Geist)
- [ ] Railway Postgres provisioning + `DATABASE_URL` env var
- [ ] Prisma schema push + generate
- [ ] NextAuth.js v5 setup (email/password; magic link for editors)
- [ ] `Agency`, `User`, `Client` CRUD with server actions
- [ ] Dashboard page: client list, empty state design
- [ ] Client config page: ToV JSON editor, language selector, audience profile form

**Deliverable**: Login → create agency → onboard first client → see dashboard.

---

### Phase 2 · Agent Pipeline (Days 5–10)
**Goal**: Working end-to-end translation with all 5 agents and streaming UI.

Tasks:
- [ ] Implement all 5 agents (idiom → cultural → core → safety → QA)
- [ ] Pipeline orchestrator with async generator + SSE streaming
- [ ] `TranslationWorkspace` component with live agent progress UI
- [ ] Files API integration: document upload → `ClientDocument` → injected into CoreAgent
- [ ] Prompt caching on system prompts (cache_control headers)
- [ ] Translation result persisted to `TranslationJob` + `TranslationSegment`
- [ ] Per-segment confidence colour coding in output panel
- [ ] Cultural adaptations + safety flag UI components

**Deliverable**: Paste copy → watch 5 agents run → receive translation with confidence score and reviewer notes.

---

### Phase 3 · Asana Integration (Days 10–14)
**Goal**: Translations push to Asana; editor corrections feed back as learning.

Tasks:
- [ ] Asana OAuth flow (token exchange + storage in `AsanaConfig`)
- [ ] Custom field creation: source lang, target lang, confidence score, content type
- [ ] "Push to Asana" button in workspace → creates task with formatted content
- [ ] Webhook registration per client (`AsanaConfig.webhookGid`)
- [ ] Webhook handler at `/api/asana/webhook?clientId=` with HMAC validation
- [ ] Correction parsing from Asana story text (CORRECTION: format)
- [ ] `TranslationMemory` creation on each correction received

**Deliverable**: Click "Send to Asana" → task appears in client's Asana project → editor adds correction comment → memory updated automatically.

---

### Phase 4 · Review Interface (Days 14–18)
**Goal**: In-app editorial review as alternative/complement to Asana.

Tasks:
- [ ] `/review/[jobId]` page: side-by-side source + translated with segment-level diff
- [ ] Inline editing: click segment to edit, confirm/cancel
- [ ] Correction type selector per edit (language / cultural / tone / terminology / safety)
- [ ] "Approve" + "Reject" job actions with status updates
- [ ] Correction submitted to `/api/corrections` → `TranslationMemory` update
- [ ] "Approved jobs" list with memory learning metrics
- [ ] Email notification to editor when new job awaits review

**Deliverable**: Editors can review, edit, approve, and teach the system without leaving the app.

---

### Phase 5 · Analytics + Learning Dashboard (Days 18–21)
**Goal**: Visibility into translation quality trends and learning progress.

Tasks:
- [ ] Analytics page: confidence scores over time per client (line chart)
- [ ] Correction frequency by type (stacked bar)
- [ ] Translation memory size per client (shows system learning)
- [ ] `humanReviewRequired` rate declining over time (key metric)
- [ ] Cost estimator: tokens used per job, rolling monthly cost per client
- [ ] Export: download translation history as CSV

**Deliverable**: Account managers can show clients their translation quality trajectory and ROI.

---

### Phase 6 · Production Hardening (Days 21–28)
**Goal**: Production-ready, secure, monitored.

Tasks:
- [ ] Rate limiting on translate endpoint (per client, per API key)
- [ ] Job queue for high-volume clients (Railway background worker or simple DB queue)
- [ ] Retry logic: automatic 1x retry on Anthropic overload errors
- [ ] Error boundaries + toast notifications throughout UI
- [ ] Anthropic API key rotation support (multiple keys with round-robin)
- [ ] Application-layer encryption for `AsanaConfig.accessToken`
- [ ] Railway Volumes backup strategy for uploaded documents
- [ ] `railway.toml` healthcheck + restart policy
- [ ] Monitoring: structured JSON logging, Railway Metrics dashboard
- [ ] Staging environment on Railway (separate service + DB)

---

## Key Metrics

| Metric | Target | Where tracked |
|--------|--------|---------------|
| Average confidence score at first pass | > 0.75 | Analytics dashboard |
| Human review time per job | < 10 minutes | Not automated — qualitative |
| Translation memory size after 3 months | > 50 entries per client per language | Analytics dashboard |
| `humanReviewRequired` rate after 6 months | < 30% | Analytics dashboard |
| Cost per 1000-word translation | < £0.50 | Cost estimator |
| Pipeline P95 latency | < 45 seconds | Railway Metrics |

---

## Open Questions / Future Work

1. **DOCX/PPTX input**: Clients may want to upload full documents, not paste text. Evaluate `mammoth` (DOCX) + slide extraction libraries. Segments the document, runs translation per section, reassembles.

2. **Translation versioning**: Should we keep multiple draft translations per job (e.g., formal vs informal register) for editor choice? Adds complexity but useful for long-copy work.

3. **Batch mode**: Agency clients processing 50+ copy variants per campaign need a batch UI — upload a CSV, get back a CSV. Low priority for MVP.

4. **Glossary management**: Explicit client glossary UI where account managers define canonical translations for brand terms (e.g., product names). Currently handled via uploaded GLOSSARY documents — a structured glossary table would be more ergonomic.

5. **Multi-model comparison**: Some clients may want to see DeepL + Claude side-by-side. Out of scope for MVP but a differentiator for high-value contracts.

---

## Tech Stack Reference

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 15 (App Router) | Server components, server actions, streaming |
| Language | TypeScript strict | End-to-end type safety |
| Styling | Tailwind CSS + shadcn/ui | Speed + design consistency |
| Database | Railway Postgres + Prisma | Co-located, simple, typed |
| AI | Anthropic SDK (Claude 4.x) | Best-in-class translation quality |
| Auth | NextAuth.js v5 | Battle-tested, flexible providers |
| Hosting | Railway | Developer-friendly, affordable SaaS platform |
| File storage | Railway Volumes + Anthropic Files API | Sufficient for MVP, swappable |
| Integrations | Asana REST API | Required by brief |
| Monitoring | Railway Metrics + structured logging | Built-in, no extra services |

---

## Estimated Costs (per month at 10 clients)

| Item | Estimate |
|------|----------|
| Railway app + Postgres | ~$40 |
| Railway Volumes (50GB) | ~$5 |
| Anthropic API (500 jobs × avg 3000 tokens) | ~$35–80 |
| **Total** | **~$80–125/month** |

Revenue at £200/month/client × 10 = £2,000/month. Healthy margins at this scale.
