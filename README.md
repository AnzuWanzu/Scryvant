# Scryvant

Scryvant is an interactive SRD 5.2.1 character sheet presented as an arcane observatory. The current feature branch includes guided creation, deterministic server-side character calculations, level progression, play-state controls, an orbitable Three.js miniature, secure account sessions, legacy-character reconciliation, and a review-before-accept AI proposal boundary.

The frontend can be explored as a temporary guest sheet. Persistent characters require MongoDB, local email delivery, and a verified account. Gemini is optional and currently disabled by default; manual play does not depend on it.

See [local development](docs/local-development.md), the [security review](docs/security-review.md), [SRD attribution](docs/rules-attribution.md), and [asset credits](docs/asset-credits.md). The security review records the remaining release gaps, including incomplete SRD feature automation and the deferred real Gemini smoke test.
