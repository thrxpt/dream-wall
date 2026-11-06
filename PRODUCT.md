# Dream Wall

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by the user; Next.js with PostgreSQL, targeting Vercel. Neon is the documented database option. Local development uses PostgreSQL in Docker. Deployment is prepared for the user, not performed on their behalf.

## Users
Open-house CLI workshop participants, approximately 40 per round, and workshop facilitators operating a shared projector.

## Product Purpose
Turn a student's dream.txt into a real contribution to a shared wall by accepting an unauthenticated JSON API request containing only {"dream":"..."}.

## Operating Context
Windows workshop computers; the user has already prepared CLI instructions. The projector must refresh automatically. Multiple workshop rounds require a clean reset.

## Capabilities and Constraints
- Anonymous dreams appear immediately, with a brief featured moment, then join a rotating wall.
- Persist dreams across reloads, process restarts, and deployments.
- Public wall and API; admin page intentionally has no login or password, as explicitly requested.
- Admin can hide and restore individual dreams.
- Confirmed reset permanently deletes all dreams, clears the display and animation queue, and starts the next round. No historical archive.
- Users with access to the admin URL can moderate and reset; this is an accepted product decision.
- Do not add CLI teaching material or a public submission form.

## Brand Commitments
Exact supplied event theme: “Beyond the Star. Dream Begin.” Space setting, Neptune represents the computer engineering department. Dark blue and cyan, large readable Thai type, gentle celebratory motion.

## Evidence on Hand
No official institutional logo or participant content supplied. Never invent either. Empty state must be honest; demonstration dreams are confined to tests.

## Product Principles
- Make successful CLI work visible to the whole room.
- Protect round boundaries against stale admin actions.
- Keep projector content legible from a distance.
- Keep setup and workshop operation straightforward.
