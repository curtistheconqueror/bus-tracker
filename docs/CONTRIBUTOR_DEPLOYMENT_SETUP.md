# Contributor and approval-gated deployment setup

## Purpose

Fleetstep is moving toward an agent-neutral contribution process: Claude Code and future Codex chats can contribute source through GitHub, while production deploys require Curtis's approval. The approved target is **Cloudflare Workers** for application hosting, with Supabase remaining the shared-data platform until PACE chooses otherwise.

This does not replace the current Sites deployment today. It prepares a safe successor. The existing public Sites URL remains the live and rollback baseline until a Cloudflare release passes its own acceptance checks.

## Why Cloudflare Workers

The current application already builds with the Cloudflare Vite plugin and uses Cloudflare-compatible edge routes for photo scanning. Workers can serve the frontend and those routes together while keeping runtime secrets server-side. Supabase remains responsible for database, realtime synchronization, authentication, and storage.

Supabase Edge Functions are useful for backend jobs and AI/API orchestration, but they are not the chosen home for the complete Fleetstep web application. They remain a future option for narrow backend work.

## Roles

| Role | May do | Must not do |
| --- | --- | --- |
| Curtis | Approve production deployment; own GitHub, Cloudflare, and Supabase access | Put secrets in source or chat |
| Claude Code / Codex contributor | Implement, test, commit, push branches, open pull requests, update `docs/PUBLISH_NEXT.md` | Deploy directly, alter production secrets, bypass protected branches |
| GitHub Actions production job | Deploy the exact approved commit after CI and Curtis approval | Run before approval or expose secrets to pull requests |
| PACE IT, if adopted | Own its infrastructure, identity, network, backups, and security policy | Depend on an agent-held secret or undocumented manual process |

## One-time account setup Curtis performs

1. Create or select the Cloudflare account that will own the `fleetstep-production` Worker. Do not attach a custom domain yet unless Curtis chooses one.
2. In GitHub, create a `production` environment for `curtistheconqueror/bus-tracker`.
3. Restrict that environment to the protected `main` branch and name Curtis as its required reviewer. Leave self-review allowed if Curtis will manually start a release and approve it himself.
4. Store these **environment** values, never repository files:
   - `CLOUDFLARE_API_TOKEN` — a least-privilege deploy token restricted to the Fleetstep Worker/account.
   - `CLOUDFLARE_ACCOUNT_ID` — the owning Cloudflare account identifier.
   - `CLOUDFLARE_WORKER_NAME` — `fleetstep-production` or the final PACE-approved name.
5. Store application runtime secrets in Cloudflare's Worker secret store, not GitHub source:
   - `OPENROUTER_API_KEY` while the current photo scanner remains enabled.
   - Any future provider credentials only after the provider is approved.
6. Add named human contributors in GitHub with the lowest practical role. Require pull requests and successful CI for `main`. Protect workflow and deployment configuration with Curtis review.

GitHub environment protection is the production lock: its secrets are unavailable until the required reviewer approves the job.

## Repository work still needed after the account setup

1. Add a source-controlled Worker configuration using the final Worker name and a tested compatibility date.
2. Add a deployment workflow that can only run from `main`, references the protected `production` environment, runs the existing CI gate, and deploys with the Cloudflare token only after approval.
3. Add a preview/staging workflow that has no production secret access.
4. Add a controlled first deployment that leaves the current Sites release untouched.
5. Test the new Worker on phone, iPad, desktop, offline/reconnect, Shop Cloud sync, Down Sheet scans, and sweep scans.
6. Only after acceptance, choose whether the existing live URL should remain, redirect, or be replaced with a custom domain.

No production workflow is committed before the GitHub environment and Cloudflare secrets exist. A workflow that merely names `production` can create an unprotected environment by accident; that would defeat Curtis's approval requirement.

## Release procedure once configured

1. Contributor pushes a tested pull request.
2. CI runs lint, production build, and regression tests.
3. A maintainer merges the approved pull request into `main`.
4. The production workflow waits at GitHub's `production` approval gate.
5. Curtis approves or rejects the exact deployment in GitHub.
6. The workflow deploys the exact reviewed commit and records the result.
7. Curtis verifies the live app. A failed acceptance test rolls back to the last approved Worker release.

## Non-negotiable safeguards

- Never place Cloudflare, Supabase, AI-provider, or PACE credentials in the repository, LocalStorage, build output, issue text, or chat.
- Do not give a contributor direct production-token access.
- Do not deploy unreviewed pull-request code with production secrets.
- Do not remove the current Sites project or its rollback records until the replacement has been accepted.
- Custom domains are branding and routing decisions, not a prerequisite for contributor access.