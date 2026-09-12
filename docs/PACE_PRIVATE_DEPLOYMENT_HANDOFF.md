# PACE private infrastructure and AI transition handoff

**Status: planning only.** The current live Fleetstep application remains on its existing Sites URL. Do not migrate, replace the live URL, change database credentials, or move fleet data until PACE authorizes a named target environment and a cutover window.

This document is for Curtis, Claude Code, Codex, and PACE IT/security. It explains how Fleetstep can move from managed services to PACE-controlled infrastructure without losing records, offline behavior, or the ability to roll back.

## Current architecture

- The existing public application is hosted through the repository's Sites binding. Keep it live as the rollback baseline during any transition.
- The application is a Vinext/Vite application with Cloudflare-compatible edge routes for Down Sheet and sweep photo scans.
- Shop Cloud uses the current Supabase project for shared records, while each device keeps an offline local cache and mutation queue.
- The photo scan routes currently call an external AI provider through a server-side `OPENROUTER_API_KEY`. The browser never receives that key.
- Existing LocalStorage keys, offline records, fleet identity, facility locations, repair history, and export/import recovery are product invariants. A hosting move must not rename or discard any of them.

## Two valid PACE targets

### A. PACE-controlled hosting plus self-hosted Supabase

PACE hosts the web application behind its reverse proxy and runs a production-hardened Supabase stack on PACE-managed Linux servers or virtual machines. This preserves the current database, Auth, Realtime, Storage, and API design while moving operational responsibility to PACE.

PACE IT owns network segmentation, TLS certificates, operating-system and container updates, database maintenance, monitoring, backups, disaster recovery, and incident response. The Supabase local-development stack must not be exposed as production; use the production self-hosting distribution instead.

### B. PACE-controlled hosting plus PACE database/API services

PACE hosts the application and supplies its own PostgreSQL, identity, storage, realtime, and API platform. Fleetstep receives a server-side data adapter so the user interface and offline queue speak to PACE's approved API rather than directly to Supabase.

This is more work than self-hosted Supabase, but may fit an established PACE platform or security standard.

## Mobile access is a first-class requirement

An on-premises server alone does not let buses and phones synchronize from the road. PACE must provide an approved route for managed phones, such as mobile VPN, zero-trust access, or a securely published gateway. The server must not be exposed publicly just to make the app work.

Decide whether Fleetstep will use an internal DNS name, a PACE-owned public domain protected by PACE controls, or an approved mobile gateway. A new domain is optional; it is not required for the migration.

## PACE-approved AI assistant shape

Keep AI separate from Fleetstep's user interface and database authority:

```text
Fleetstep phone or browser
  -> PACE backend and audit boundary
  -> PACE AI gateway
  -> approved model service
  -> structured recommendation for a person to review
```

The assistant may read an uploaded sheet or a selected bus history and return structured suggestions. It must not directly create, close, relocate, or delete fleet records. The person reviewing the result keeps final control.

PACE can choose one of these model paths:

1. **On-premises model and OCR:** images and prompts never leave PACE infrastructure. PACE provides the servers or GPU capacity and owns model updates and monitoring.
2. **Private enterprise AI service:** PACE uses its contracted Azure, AWS, Google, or other approved service through its identity, private network, data-retention, and auditing policies.
3. **Existing PACE AI platform:** Fleetstep calls only PACE's approved internal AI gateway.

The gateway must use service-to-service credentials, least-privilege roles, audit logs, request-size limits, a retention policy for uploaded images, and an explicit no-training/no-reuse policy that PACE approves. Do not put AI-provider credentials in the browser, LocalStorage, GitHub, documentation, or chat.

## Required engineering work before a cutover

1. Add server-side provider adapters for data sync and AI scanning. The browser calls Fleetstep, and Fleetstep calls the selected PACE service. No provider URL or secret is hard-coded in the client.
2. Maintain the existing offline queue, stable record IDs, idempotency, revisions, conflict rules, and audit history across both providers.
3. Add configuration validation and a health check that prove the selected backend is reachable without revealing secrets.
4. Package infrastructure configuration separately from application source. Secrets belong only in PACE's secret manager or the selected deployment environment.
5. Build an automated restore rehearsal for database data and stored attachments. A database restore alone is not enough when part photos or other storage objects exist.

## Safe migration sequence

1. **Discovery:** PACE IT confirms hosting, identity, network, backup, retention, support, and AI requirements.
2. **Parallel build:** Create the PACE environment without changing the live application or importing production writes.
3. **Dry run:** Use anonymized or approved test records. Test phone access, iPad access, offline writes, reconnection, concurrent edits, realtime updates, scans, exports, and restore.
4. **Pre-cutover backup:** Export the managed database, storage objects, configuration inventory, and the trusted current device backup. Verify each backup can be restored.
5. **Controlled cutover:** Announce a short write pause, drain queued writes, take one final export, import into PACE, validate record totals and samples, then switch the configured backend endpoint.
6. **Acceptance:** Curtis and PACE verify real phone and iPad workflows before declaring the new environment authoritative.
7. **Rollback window:** Keep the current managed environment read-only and available long enough to return safely if acceptance fails. Do not delete it during the migration.

## Decisions PACE must provide

- Named infrastructure owner, security owner, and 24/7 support path.
- Server or VM capacity, operating system standard, container platform, monitoring, backup destination, and disaster-recovery target.
- Mobile-access method and identity provider.
- Internal/public DNS and certificate ownership.
- Whether AI is on-premises, private enterprise cloud, or disabled.
- Data retention, audit, attachment, and export requirements.
- Approval process and maintenance windows.

## Claude Code instructions

- Treat this as an architecture handoff, not permission to migrate production.
- Do not change `.openai/hosting.json`, Sites access, Supabase credentials, the live URL, or PACE data without an explicit PACE-approved scope.
- Preserve every existing offline and record-preservation invariant.
- For preparatory work, prefer interfaces, test fixtures, configuration validation, documentation, and reversible feature flags.
- Report the exact migration assumption being made and stop when it requires PACE credentials, network access, a domain, or an account decision.