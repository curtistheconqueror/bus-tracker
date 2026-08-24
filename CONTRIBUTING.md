# Contributing

## Working agreement

- Read PROJECT_HANDOFF.md before changing domain behavior.
- Keep changes narrow and preserve unrelated local work.
- Use descriptive commits that explain the product outcome.
- Do not rewrite published history or force-push main.
- Do not commit API keys, runtime credentials, fleet backups, photographs, or employee-sensitive information.
- Do not change .openai/hosting.json unless the requested hosting capability requires it.

## Development workflow

1. Inspect git status and the relevant feature files.
2. Update domain helpers before duplicating rules inside UI components.
3. Add or extend regression coverage in tests/rendered-html.test.mjs.
4. Run npm test.
5. Run npm run lint.
6. Run git diff --check.
7. Review the final diff and commit only intended files.

## Product invariants

- The map owns physical location.
- Down Sheet and Defect Log edits do not move buses implicitly.
- Fleet IDs and fleet numbers remain unique.
- Capacity-sensitive changes are atomic.
- Storage migrations remain backward compatible.
- Status color follows the saved status and destination-aware rules.
- UI filters and badges never change underlying repair or membership data.
- Offline behavior remains functional while the shared backend is introduced.

## Releases

A successful local build is not permission to publish. Save and deploy only through the existing Sites project after explicit user approval. Record the resulting Sites version and commit in docs/RELEASES.md.
