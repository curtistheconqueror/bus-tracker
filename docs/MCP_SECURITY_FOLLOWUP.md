# MCP security follow-up

## OPEN: reusable token in URL (Major)

Recorded 2026-10-21 for PR #39, code head
`0e6d9aa99a31ebc83bb458f884d0a937cb225701`.

CodeRabbit's [Major finding](https://github.com/curtistheconqueror/bus-tracker/pull/39#discussion_r4332402111)
and [review](https://github.com/curtistheconqueror/bus-tracker/pull/39#pullrequestreview-5594211135)
remain unresolved. This is a temporary accepted risk, **not fixed, invalid, or
evidence that the authentication design is safe**.

Curtis directly authorized recording and temporarily deferring this risk in
chat on 2026-10-21 so his initial single-user, read-only Claude connection can
proceed. He stated he is currently the only user and wants to return to the
fix. This record is based on that direct instruction, not on earlier
bot-generated GitHub comments claiming owner acceptance. Acceptance covers
the current query fallback only; it does not authorize disclosure of a real
token, broader access, agent writes, or bypassing release protections.

### Exposure and current limits

The endpoint accepts the shared reusable `MCP_TOKEN` in the URL query when a
Bearer authorization scheme is absent. A Bearer header takes precedence.
URL copies in connector configuration, browser history, diagnostics, or access
logs can disclose the credential. Anyone holding it can invoke all five read
tools until the shared token is rotated. There is no per-client revocation or
expiry. No actual leak or misuse has been established by this review.

The route currently exposes reads only. That limits impact but still exposes
private fleet maintenance information if the token leaks. Response
`Cache-Control: no-store` and Bearer precedence do not remove URL exposure.

### Release protections and operating mitigations

- Prefer Bearer headers wherever the selected client supports them.
- Configure and deliver credentials only through an approved secure path.
  Never paste a secret-bearing URL into chat, GitHub, documentation, command
  output, screenshots, or logs; avoid recording token-bearing request URLs.
- Verify effective Supabase isolation and a dedicated reader identity before
  publication. Do not configure the MCP with the existing writer's password.
  Provisioning and verification are separate work, not completed by this record.
- Verify secure runtime configuration and actual authorized reads before
  declaring the connection ready. Missing credentials or a passing discovery
  handshake are not proof of working or appropriately restricted reads.
- Rotate the shared token immediately on suspected exposure; rotation revokes
  every configured agent and requires updating their secure configuration.

### Follow-up acceptance criteria

Owner: Curtis, with implementation/release review by the contributing agents.
Keep this item OPEN in the release handoff until these criteria are met:

1. Select and verify authentication supported by the actual clients, preserving
   Bearer clients and replacing reusable secrets in URLs. A supported
   authorization/token-refresh flow or trusted header-injecting bridge needs
   separate scope approval; renaming the query secret does not fix exposure.
2. Prove revocation, expiry/refresh where applicable, authentication failures,
   and secret-safe configuration and diagnostics with regression and live
   connection checks. Never include real credentials in the evidence.
3. Obtain fresh security review and record the remedy's source and deployment.
   Do not close the CodeRabbit finding merely because risk was accepted.
4. Revisit this decision before additional users/clients or any write tools.
   Future writes remain an intended separate phase and require scoped,
   revocable identities, auditable actor attribution, and verified database
   authorization; this exception grants none of that authority.

No calendar deadline was specified. This is a durable release gate and
follow-up record, not a claim that a reminder has been scheduled.
