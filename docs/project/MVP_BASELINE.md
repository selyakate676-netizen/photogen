# PhotoGen MVP Baseline

## P0 MARKETING ATTRIBUTION — FROZEN

Status: **FROZEN / CI READY / NOT YET DEPLOYED**

Canonical source:

- Branch: `feature/p0-marketing-attribution`
- Implementation SHA: `edee269ea3d1966e90c6cd3f7b2290d5f3a510f5`
- Successful DB CI run: `35113665036`

The code and CI baseline are complete and frozen. Production integration, migration,
deployment, and production verification have not been performed.

### Traffic attribution

The implemented attribution whitelist supports:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `yclid`
- privacy-safe external referrer data

### Attribution model

FIRST TOUCH:

- records the first tagged acquisition touch;
- is immutable after capture;
- is not erased by direct or internal navigation.

LAST TOUCH:

- updates on a new tagged acquisition visit;
- is not erased by a later direct or internal visit.

### Consent

- Analytics and attribution are not persisted before consent.
- The initial landing attribution candidate can survive navigation while consent is delayed.
- Rejecting consent removes the temporary attribution candidate.

### Photoshoot snapshot

At photoshoot creation, `attribution_snapshot` is saved when attribution is available.

The snapshot:

- is nullable;
- is backward compatible;
- is immutable after photoshoot creation;
- contains first-touch and last-touch attribution;
- does not invalidate historical photoshoots without attribution.

### Analytics lifecycle

`generation_completed` and `generation_failed` are emitted only from confirmed
lifecycle/database terminal statuses.

Persistent deduplication is implemented for terminal analytics events. Internal identifiers
may be used locally for deduplication, but are not sent to Yandex Metrika.

### Privacy contract

The following data must not be sent to Yandex Metrika:

- email;
- name;
- authenticated user ID;
- Persona ID;
- photoshoot ID;
- photographs;
- storage paths;
- signed URLs;
- prompts;
- prediction IDs.

This whitelist is part of the frozen contract and must not be weakened without a separate,
explicit decision.

### Database security contract

The ephemeral database CI verifies:

- malformed attribution snapshots are rejected;
- the legacy create-photoshoot RPC ACL;
- the attribution-enabled create-photoshoot RPC ACL;
- PUBLIC privileges;
- anon privileges;
- authenticated privileges;
- service-role privileges;
- `SECURITY DEFINER` configuration;
- fixed `search_path`;
- correct function ownership.

Successful DB CI run `35113665036`:

- Crystal wallet/refund: 41/41 PASS;
- photoshoot lifecycle: 18/18 PASS;
- marketing attribution: 9/9 PASS;
- RPC ACL hardening: 51/51 PASS.

Additional verification at the canonical implementation SHA:

- Node tests: 137/137 PASS;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS;
- `git diff --check`: PASS.

### Production rollout boundary

Current status:

- CODE/CI: **DONE / FROZEN**
- PRODUCTION: **NOT DEPLOYED YET**

Separate future tasks remain:

1. integrate over the latest production `main`;
2. perform a controlled production migration;
3. merge and deploy;
4. run a production UTM smoke test;
5. verify `attribution_snapshot` on a real test order.

### Payment boundary

Analytics hooks currently cover the existing mock-payment flow. Authoritative production
`payment_completed`, `payment_failed`, payment amount, currency, and revenue attribution
must be connected to the real payment lifecycle after production acquiring is integrated.

Mock payment is not authoritative revenue attribution.

Status: **REAL PAYMENT ATTRIBUTION — PENDING PAYMENT INTEGRATION**

### Freeze rule

P0 Marketing Attribution must not be changed as part of unrelated work. Photo Pack, UI,
Persona, Facekeep, payment, and legal tasks must not rewrite:

- `marketingAttribution.ts`;
- first-touch or last-touch semantics;
- the `attribution_snapshot` contract;
- attribution ACL or security;
- the analytics privacy whitelist;
- terminal-event deduplication.

The attribution baseline may be unfrozen only for:

- a confirmed bug;
- a security issue;
- a production regression;
- required real-payment integration;
- a separate explicit product decision.

Do not perform opportunistic cleanup or refactoring of this layer.
