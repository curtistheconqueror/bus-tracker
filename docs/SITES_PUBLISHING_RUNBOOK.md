# Fleet Tracker Sites Publishing Runbook

This runbook is the durable recovery path for publishing the Pace South Bus Tracker. Use it together with `README.md`, `PROJECT_HANDOFF.md`, `CONTRIBUTING.md`, and `docs/RELEASES.md`.

**Start at `docs/PUBLISH_NEXT.md`.** It always describes the next unpublished release — the source commit, what changed, any migration, and what to check once live — and its `STATUS` line says whether anything is pending at all. This runbook covers how to publish; that file covers what.

## Fixed project identity

- Canonical computer checkout: `C:\Users\curti\pace-south-bus-tracker`
- Existing public site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site
- Existing project binding: `.openai/hosting.json`
- Private code backup: the existing `origin` remote
- Sites source repository: the existing `sites` remote

Never create a replacement Sites project, change the live URL, or use an older live checkout to overwrite newer work.

## What went wrong in the remote publishing session

The feature implementation and validation were not the main problem. The failure came from the publishing procedure:

1. The work lived in a separate remote checkout at `/workspace/sites/pace-south-bus-tracker`. Uncommitted changes in that temporary checkout were not automatically available to the canonical computer checkout or private GitHub repository.
2. Publishing depended on one opaque checkpoint command that combined the approval handoff with later lifecycle work. Its network connection disconnected after about 3.6 seconds, before a saved Sites version or production deployment existed.
3. Passing `--user-approval-provided` did not repair the broken network/approval transport. A command-line flag cannot make a disconnected approval handoff resumable.
4. Repeating the same checkpoint command repeated the same failure. The chat should have switched to the granular Sites lifecycle instead of treating the checkpoint wrapper as the only publishing route.
5. The handoff preserved a feature list, but a prose list is not a source checkpoint. Uncommitted remote work must be committed and pushed, or exported as a patch, before another chat can reliably publish it.

The recurring timeout did not indicate a failed build, a bad public-site configuration, or a partial production deployment. The unchanged latest Sites version proved that the attempts stopped before saving a new version.

## Required authority

Publishing is an external production change.

- Obtain explicit user approval for the exact release.
- Confirm whether the existing site is public, shared, or owner-only immediately before deployment.
- For this public site, use the public deployment operation only after approval.
- A prior successful build or commit is not publishing approval.

## Supported, resumable publishing lifecycle

### 1. Reconcile the exact source

1. Open the checkout that actually contains the completed work.
2. Read the four current guidance files named at the top of this runbook.
3. Inspect `git status`, recent commits, all relevant remotes, and the current branch.
4. Preserve uncommitted work. Do not reset, overwrite, or replace it with the live branch.
5. If work exists only in a remote `/workspace` checkout, commit it there and push it to the canonical repository or export a patch before the remote session ends.
6. The release source must resolve to one exact Git commit.

If two checkouts contain different work, reconcile them before publishing. A live deployment is not a substitute for source reconciliation.

### 2. Reuse completed validation when valid

If the exact source commit has already passed the documented gates and has not changed, reuse that validation. Otherwise run:

- `npm run lint`
- `npm test`
- `git diff --check`

Commit only the intended files. Do not repeat lengthy validation merely because a publishing transport failed.

### 3. Reuse the existing Sites binding

1. Read `.openai/hosting.json`.
2. Copy its opaque `project_id` exactly.
3. Call the Sites project inspection operation and confirm the existing URL, access mode, current owner/editor role, and latest version.
4. Do not call any create-site operation when `project_id` already exists.

### 4. Push the exact release commit

1. Request a short-lived source-repository write credential for the existing project.
2. Use it only as a per-command HTTP authorization header.
3. Push the exact validated commit to the existing Sites source branch.
4. Never place the token in a remote URL, Git configuration, documentation, chat output, or a commit.
5. Use the pushed full commit SHA for the saved version.

If the credential expires or a connection drops, request a new credential. Do not create a new repository or site.

### 5. Build and package once

Build the exact source when required, then package the successful build output with the official Sites plugin helper:

`scripts/package-site.sh PROJECT_DIR ARCHIVE_PATH`

The archive must contain the built output and hosting metadata, not a tarball of the source tree.

Environment notes:

- In a Linux remote checkout, use ordinary `/workspace/...` and `/tmp/...` paths.
- On this Windows computer, run the helper through Git Bash and pass MSYS paths such as `/c/Users/curti/...`.
- Do not pass a raw `C:` archive path to Unix `tar`; it may interpret the colon as a remote host.
- Avoid `cmd.exe` authentication quoting and repeated CRLF-normalization attempts.
- If normalization is genuinely necessary, use one temporary LF-normalized helper, run it once, and verify the archive.

### 6. Save exactly one Sites version

Call the Sites save-version operation with:

- the existing `project_id`;
- the full pushed `commit_sha`; and
- the build archive.

Saving creates a version checkpoint but does not publish it. Retain the returned version ID and user-facing version number.

Do not keep saving duplicate versions when deployment has not yet been attempted.

### 7. Deploy the saved version

1. Inspect the site access mode again if it was not just confirmed.
2. For a public or shared site, use the public deployment operation only after explicit approval.
3. Pass the exact saved version ID.
4. Retain the returned deployment ID.

Do not run a legacy checkpoint wrapper as a substitute for save and deploy.

### 8. Poll the same deployment

Use the deployment-status operation with the exact deployment ID until it reports `succeeded` or `failed`.

- `pending`, `building`, and `publishing` are normal intermediate states.
- Do not create another version or deployment merely because the first status call is not terminal.
- On failure, report the returned failure message and retain the version/deployment identifiers for recovery.

### 9. Verify and record the release

After success:

1. Confirm that the existing project reports the expected latest version.
2. Confirm the production URL responds and still exposes Fleet Tracker, Down Sheet, and Defect Log.
3. Open the existing live-site tab rather than creating a second user-facing site.
4. Update `docs/RELEASES.md`, `PROJECT_HANDOFF.md`, and the README release reference.
5. Create the next `sites-vNN` rollback tag.
6. Push `main` and the rollback tag to the existing private GitHub origin.
7. Refresh the local `sites/main` tracking reference.
8. Remove only the temporary build archive.

## Recovery matrix

| Observed state | Correct next action |
| --- | --- |
| Connection failed and latest Sites version is unchanged | No version was saved. Reconfirm the exact commit, obtain a fresh credential if needed, then resume at push/package/save. |
| A version ID exists but no deployment ID exists | Deploy that saved version. Do not save another copy. |
| A deployment ID exists with pending/building/publishing status | Poll that same deployment ID. |
| Deployment status is failed | Use the returned failure message; fix only the identified issue, then save a new version only if source or build output changed. |
| Source credential expired | Request a new short-lived credential for the same project. |
| Sites push succeeded but local `sites/main` looks old | Fetch the existing Sites remote to refresh the tracking reference. |
| Windows packaging says `Cannot connect to C:` | Rerun once with Git Bash `/c/...` paths. |
| Completed work exists only as uncommitted files in `/workspace` | Commit and push it, or export a patch. Do not publish an older checkout. |
| Explicit production approval is absent | Stop after validation or saving a non-live checkpoint and ask the user. |

## Actions that are never acceptable

- Creating a replacement site because publishing timed out
- Replacing completed source with the older live version
- Force-pushing or rewriting published history
- Persisting a Sites credential
- Repeatedly retrying the same disconnected checkpoint wrapper
- Saving multiple duplicate versions instead of checking version/deployment state
- Rebuilding completed features from a prose handoff when a commit or patch can be recovered
- Publishing uncommitted or unvalidated source
- Treating LocalStorage fleet exports as source code

## Ready-to-paste prompt for a future computer chat

> Open `C:\Users\curti\pace-south-bus-tracker`. Fully read `README.md`, `PROJECT_HANDOFF.md`, `CONTRIBUTING.md`, `docs/RELEASES.md`, and `docs/SITES_PUBLISHING_RUNBOOK.md`. Inspect Git status, recent commits, `origin/main`, and `sites/main`. Preserve every uncommitted change and reconcile any newer remote checkout before publishing. I explicitly approve publishing the current validated release to the existing public Fleet Tracker site. Reuse the `.openai/hosting.json` project binding and never create a replacement site. Use the granular Sites lifecycle: obtain a short-lived source credential, push the exact validated commit, package the successful build with the official Sites helper, save one version, deploy that saved version, and poll its deployment ID until terminal. If an earlier attempt disconnected, inspect whether a version ID or deployment ID exists and resume from that state; do not repeat a legacy checkpoint wrapper or create duplicate versions. After success, verify the live version and URL, update release documentation, create the rollback tag, and synchronize the existing private GitHub repository.

## Ready-to-paste prompt for a remote iPad chat

> Work only in the current `/workspace/sites/pace-south-bus-tracker` checkout. Before editing, inspect Git status and read the project handoff and publishing runbook. Do not overwrite uncommitted work with the older live source. When the requested work is complete, validate it and commit the exact source before the remote session ends. Push that commit to the existing repository or provide an exportable patch and commit SHA. If I approve production, use the existing `.openai/hosting.json` project and the granular Sites save/deploy/status lifecycle. If publishing disconnects, preserve the source commit and any returned version or deployment IDs so another chat can resume without rebuilding.

