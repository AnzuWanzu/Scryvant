# Security review — 24 September 2026

This review covers the local `feature/character-product` implementation. It is not a penetration test or a statement about deployed infrastructure. The old campaign controller remains preserved future work and is not mounted by the new application.

## High severity

### SRY-001 — authentication lifecycle

- **Evidence:** Old login accepted accounts without verification and JWT cookies survived logout. The replacement lifecycle is in `backend/src/modules/identity/application/service.ts:94-102, 173-209`.
- **Remediation:** Accounts must be verified. Every request resolves a hashed opaque session and live account. Logout revokes its session; password reset invalidates all sessions through the account authentication version.
- **Regression coverage:** Real MongoDB and HTTP tests reject unverified login, captured logged-out cookies, reset sessions, and deleted accounts.

### SRY-002 — browser mutations lacked CSRF enforcement

- **Evidence:** The current middleware is in `backend/src/platform/http.ts:62-84`; cookie flags are centralized at lines 32-40.
- **Remediation:** Require an exact origin plus a random cookie/header token with constant-time comparison, accept JSON only, use POST logout, and set Secure cookies in production.
- **Regression coverage:** Missing tokens and foreign origins receive 403.

### SRY-003 — authorization was mixed into transport controllers

- **Evidence:** Owner-scoped application operations now start in `backend/src/modules/characters/application/service.ts:30-37, 88-123`; AI acceptance rechecks ownership and revision in `backend/src/modules/assistance/application/service.ts:46-52`.
- **Remediation:** Keep ownership in application operations and repository predicates, including optimistic revision checks.
- **Regression coverage:** A second account cannot read, update, or accept another account's character or proposal. Stale writes and duplicate proposal acceptance fail.

## Medium severity

### SRY-004 — UUIDs failed ObjectId validation

- **Evidence:** Route UUID validation is at `backend/src/platform/http.ts:158-177`.
- **Remediation:** Validate public UUIDs without converting them to database ObjectIds, preserving existing character IDs.
- **Regression coverage:** Create, fetch, update, and reload use a UUID through HTTP.

### SRY-005 — clients could submit derived character values

- **Evidence:** Strict creation and command parsing occurs at `backend/src/platform/http.ts:163-218`; derivation remains in the rules domain.
- **Remediation:** Calculate derived values server-side and expose explicit command operations instead of general model updates.
- **Regression coverage:** Unknown derived fields fail validation; rules tests exercise creation and levels 1–20 for each class. This does not establish complete class-feature coverage.

### SRY-006 — challenge and login throttling was incomplete

- **Evidence:** Challenge issuance and persistent limits are in `backend/src/modules/identity/application/service.ts:67-93, 122-171`; the HTTP IP bucket is at `backend/src/platform/http.ts:105-109`.
- **Remediation:** Use expiring hashed challenges, persistent rate buckets, resend cooldowns, single-use consumption, and enumeration-resistant send responses.
- **Regression coverage:** Wrong-code limits, cooldowns, and repeated reset rejection are tested.

### SRY-007 — AI output could become an unreviewed write

- **Evidence:** Proposal validation is at `backend/src/modules/assistance/application/service.ts:28-52`; the provider adapter applies a strict structured schema.
- **Remediation:** Allow only validated proposals, display them before acceptance, then recheck owner, revision, expiry, and domain rules.
- **Regression coverage:** Malformed output, unsupported commands, refusal, provider failures, and repeated acceptance are covered. The real provider test is deferred because Gemini is disabled.

### SRY-008 — legacy conversion could silently replace a build

- **Evidence:** The repeatable migration is at `backend/src/platform/migration.ts:3-18`; explicit reconstruction is at `backend/src/modules/characters/application/service.ts:48-86`.
- **Remediation:** Dry run by default, retain original fields, and require explicit reconciliation of every existing level.
- **Regression coverage:** Repeat migration modifies zero records; an eight-level record cannot complete with zero advancements; its ID, level, and archive are retained.

## Remaining release work

- Verify a real configured Gemini request. The user chose to keep Gemini disabled for now.
- Complete SRD feature mechanics and fixtures: lineage choices, expertise, fighting styles, subclass-specific choices, bonus spells, spellbooks, and high-level class exceptions still need dedicated coverage.
- Exercise the full browser account workflow against local email and MongoDB, including simultaneous tabs and expired challenges.
- Validate production reverse-proxy trust configuration before deployment. The API currently trusts no forwarded client IP; shared proxy IP throttling can affect unrelated users. Do not broadly enable trust proxy on an exposed API.
- Review operational secrets, TLS, database access, backup restoration, and dependency audits in the target release environment. No live hosting was performed.

Logs expose generic startup and request failures rather than credentials or provider bodies. Narratives render as React text, without executable HTML. The old unmounted backend utilities still produce four lint warnings and should be retired when campaign preservation no longer depends on them.
