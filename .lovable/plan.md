# Offload Plan — Reduce Main Supabase Pressure

Current main DB hot spots (by size + traffic):

| Table | Size | Why it costs |
|---|---|---|
| `translations` | **15 MB / 36k rows** | Read on every page load for i18n (10 languages) — biggest egress driver |
| `verify_tokens` | 832 kB / 1.6k rows | Written + read on every key-verify flow |
| `hwid_key_ip_log` | 312 kB / 1.4k rows | Append-only log on every HWID claim |
| `notifications` | 1.4 MB | Broadcast inserts, less hot |

## What I'll move to the external Supabase

**Phase 1 — Translations (biggest win)**
1. Create `translations` table + RLS on external Supabase (mirror schema).
2. One-time copy all 36k rows from main → external via edge function.
3. New file `src/integrations/supabase/external-client.ts` (publishable anon key only — safe in client).
4. Switch `useTranslation` hook to read from external client.
5. Result: ~15 MB / per-pageview egress moves off main DB entirely.

**Phase 2 — Verify flow logs**
6. Create `verify_tokens` + `hwid_key_ip_log` on external Supabase.
7. Update verify edge functions (`generate-key`, `verify-token`, HWID claim) to use a service-role client pointing at external.
8. Old rows on main DB stay until purged (no migration needed — these are ephemeral).
9. Result: write traffic + storage growth for the verify pipeline moves off main.

## What stays on main DB

Anything tied to auth.users FKs, RLS using `has_role`, or PayPal/purchases — moving those needs auth replication. Out of scope.

## Technical details

- External creds parsed from existing `Supa_url_external` secret (already verified working).
- Client file hardcodes external `SUPABASE_URL_2` + `SUPABASE_ANON_KEY_2` (publishable).
- Edge functions read full blob from `Supa_url_external` and use `SUPABASE_SERVICE_ROLE_KEY_2` for writes.
- `i18n_translations` realtime stays on main — translations are append-mostly, polling/cache is fine.

## Rollback

If external goes down, flip a single import in `external-client.ts` back to the main `supabase` client and translations resume from main DB.

Approve to start with Phase 1 (translations).
