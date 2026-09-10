# Cloudflare staging runbook

## Current boundary

The existing public Sites URL remains the live Fleetstep application. Cloudflare is a separate staging path until Curtis accepts it.

| Item | Current value |
| --- | --- |
| Worker | `fleetstep` |
| Staging URL | `https://fleetstep.fleetstep-dev.workers.dev` |
| GitHub workflow | `Deploy Cloudflare staging` |
| Allowed source | `main` only |
| Trigger | A Curtis-approved one-file release gate |

## Release agent procedure

1. Confirm Curtis explicitly approved the staging release in chat.
2. Confirm `main` contains the reviewed contribution and CI is green.
3. Create or update `.github/release-gates/cloudflare-staging.json` with `approval: "CURTIS_APPROVED"` and the exact current `main` commit as `approvedSourceCommit`.
4. Commit and push **only** that release-gate file. The workflow verifies that it names its parent source and that no feature change rode along with the approval.
5. The workflow installs the locked dependencies, runs lint and the full test suite, then deploys the generated Worker and client assets to the existing `fleetstep` Worker.
6. Verify the staging URL on phone and iPad. Do not describe it as live production and do not alter the current Sites deployment.

Release-capable agents may create a release gate only after Curtis explicitly approves in chat. The gate lets them deploy without handling a Cloudflare token; it is not a replacement for future PACE-managed production controls.

## Credentials and secrets

GitHub's `production` environment contains the deploy-only `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Neither belongs in source, a terminal transcript, or chat.

The photo-scan routes additionally require `OPENROUTER_API_KEY` as a **Cloudflare Worker secret**. Do not add that secret until Curtis approves a staging scan test. Without it, the staging scanner should fail safely instead of exposing a key.

## Future production cutover

Before a custom domain or production Worker is introduced, create a distinct Cloudflare `production` Worker and separate least-privilege token. Run acceptance tests for core fleet operations, Shop Cloud synchronization, reconnect behavior, Down Sheet scans, and sweep scans. Only then decide whether to retain, redirect, or retire the current Sites URL.