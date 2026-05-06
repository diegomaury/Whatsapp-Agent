# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

No test suite is configured.

## Environment Variables

Copy `.env.example` to `.env.local`. Required vars:

| Variable | Purpose |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Meta permanent system-user token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Any string — must match Meta webhook config |
| `OPENROUTER_API_KEY` | OpenRouter key |
| `AI_MODEL` | OpenRouter model ID (default: `anthropic/claude-sonnet-4-20250514`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-side realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

## Architecture

### Data flow
```
WhatsApp user → Meta Graph API → POST /api/webhook
  → store message in Supabase
  → if conversation.mode == 'agent': call OpenRouter → send reply via Meta → store reply
  → if conversation.mode == 'human': store only, dashboard user replies manually
```

### Key files

- [src/app/api/webhook/route.ts](src/app/api/webhook/route.ts) — GET (Meta verification) + POST (incoming messages). Handles deduplication via `whatsapp_msg_id` unique constraint (catches PostgreSQL error `23505`).
- [src/app/api/conversations/[id]/send/route.ts](src/app/api/conversations/%5Bid%5D/send/route.ts) — manual send from dashboard; calls Meta API and stores with `role: 'assistant'`.
- [src/lib/supabase.ts](src/lib/supabase.ts) — Supabase client is a `Proxy` for lazy initialization (avoids reading env vars at build time). API routes use service role key; the dashboard (`page.tsx`) creates a separate anon-key client for Realtime.
- [src/lib/ai.ts](src/lib/ai.ts) — OpenAI SDK pointed at OpenRouter (`baseURL: https://openrouter.ai/api/v1`). Passes last 20 messages as context plus the system prompt.
- [src/lib/system-prompt.ts](src/lib/system-prompt.ts) — `DENTIST_SYSTEM_PROMPT`. Edit this to change the AI persona and domain.
- [src/lib/whatsapp.ts](src/lib/whatsapp.ts) — single `sendWhatsAppMessage(to, body)` function hitting Meta Graph API v22.0.
- [src/app/page.tsx](src/app/page.tsx) — entire dashboard in one client component. Uses Supabase Realtime (`postgres_changes`) for live updates on both `messages` and `conversations` tables.

### Database schema

Two tables (see [supabase-schema.sql](supabase-schema.sql)):

- `conversations` — one row per phone number; `mode` is `'agent'` | `'human'`, `updated_at` drives sidebar sort order.
- `messages` — `role` is `'user'` | `'assistant'`; `whatsapp_msg_id` has a unique constraint for dedup.

Realtime must be enabled on both tables: `alter publication supabase_realtime add table messages/conversations`.

### Next.js route handler pattern (v16)

Dynamic route params are a `Promise` — always `await params`:
```ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
```
