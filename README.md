# Dream Wall · Beyond the Star. Dream Begin.

A Neptune-themed dream wall for the final mission of a CLI workshop. It supports about 40 participants per session. Dreams appear automatically and are stored in PostgreSQL until the wall is reset.

## Screens

- `/` — Projector display. It shows up to six dreams per page on larger screens, fewer on narrow or short screens. New submissions are highlighted one at a time for 6.5 seconds before joining the paginated wall. When no arrival is highlighted, pages advance every 12 seconds if more than one page is available. The accepted text remains stored, but the projector may clip long dreams to fit the fixed card.
- `/admin` — Search dreams, hide or show them, and reset the wall to start a new round. Enter a round number in the round selection field to choose the next round, such as starting again at round 1 after testing. By default, the next round number is used. Type `RESET` before clearing the data.
- While automatic updates are enabled, every screen checks for new data every 2 seconds and reconnects automatically after a network interruption.
- The automatic-update control in `/admin` stops timed checks on every screen, including the projector. This setting persists after a page reload and does not stop dream submissions. Use the one-time refresh button to fetch data once. After re-enabling automatic updates, refresh the page or switch back to the projector tab so that display resumes polling. Opening a page or returning to its tab triggers one fetch even while polling is stopped. Resetting the wall does not enable automatic updates again.
- Use `/admin` to pause or resume playback on every screen. The setting persists after a page reload, and resetting the wall resumes playback. Pausing stops automatic page changes and the arrival timer, and pauses the background animation. The current highlighted dream stays on screen; incoming dreams wait in the queue until playback resumes. Dreams can still be submitted, and admins can still hide, show, or reset them.
- The public display has no admin controls or admin links. Page dots appear when multiple pages are available and let viewers select a page. Press `F` to enter or exit full-screen mode.
- The feedback QR visibility control in `/admin` controls the QR code on every screen. It is visible by default, and its setting persists after reloads and resets. Displays receive changes automatically every 2 seconds only while automatic updates are enabled. If polling is stopped, refresh the display or return to its tab to receive the latest setting. The QR code is captioned “Feedback” and is not a clickable link.

The `/admin` page requires a password. All data and control endpoints under `/api/admin` require a session cookie; the login and logout endpoints are the exceptions. Admin controls are labeled in Thai; this README describes them in English. The server-side password is set in `lib/admin-session.ts`, as requested by the project owner; it is never sent to the page's JavaScript. After login, a signed HttpOnly cookie keeps the session for 12 hours. A logout button is available. The projector and `POST /api/dreams` remain available without login.

## Run locally

Requires Bun 1.4.4 or later, Node.js 22.13 or later, and Docker.

```sh
bun install --frozen-lockfile
cp .env.example .env.local
docker compose up -d --wait
bun run db:setup
bun run dev
```

Open `http://localhost:3000` and `http://localhost:3000/admin`. The local database is stored in a Docker volume and persists across restarts. You can rerun `db:setup` without deleting existing data.

## Deploy to Vercel

1. Import this repository into Vercel, select the **Next.js** framework, keep the default build and output settings, and use Node.js 22.x or later.
2. Under **Storage / Marketplace**, add a **Neon Postgres** database for this project or use an existing PostgreSQL database. Choose a region close to Vercel Functions.
3. Set the **`DATABASE_URL`** environment variable to the database's pooled connection string, for example `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require`. If the integration provides a different variable name, add `DATABASE_URL` referencing that connection value.
4. **Prepare the tables once before use:** set the production `DATABASE_URL` in a secure shell or in an uncommitted `.env.local`, then run `bun run db:setup` with that connection string. This does not delete existing dreams. Restore `.env.local` to the local database afterward if you plan to continue development.
5. Deploy or redeploy after setting the environment variables. Open `/` and `/admin` to confirm the database connection works.
6. Disable **Vercel Deployment Protection / Vercel Authentication** for the deployment used in the workshop so participants can submit through the API without signing in to Vercel.

Use a separate database for **Preview** and **Production** so testing a reset in Preview cannot erase live workshop data. Do not use SQLite, local files, Function memory, or the Vercel filesystem to store dreams.

The build does not need a database connection, but the API returns `503` until `DATABASE_URL` is set and the tables are ready. Database credentials are not embedded in client-side code or sent to the browser.

## Workshop API

Send **`POST /api/dreams`** with `Content-Type: application/json`.

```json
{"dream":"I want to create a game that makes everyone smile."}
```

No name, participant ID, or API key is required. Use the prepared Windows command and replace the URL with `https://YOUR-PROJECT.vercel.app/api/dreams`.

The API returns `201 Created` when the dream is stored successfully:

```json
{
  "ok": true,
  "message": "ความฝันของคุณเดินทางถึงดาวเนปจูนแล้ว",
  "id": "UUID",
  "round": 1
}
```

The `message` value above is in Thai and means “Your dream has made its way to Neptune.”

`dream` must be a non-empty string. Thai text, emoji, and multiple lines are supported. If the dream exceeds **500 Unicode code points**, the system stores the first 497 Unicode code points followed by `...`, for a maximum of 500 code points. The limit is applied after trimming leading and trailing whitespace and normalizing to NFC. Request bodies are limited to 8 KiB. Dreams are always displayed as text; HTML is not processed. CLI requests do not need an `Origin` header.

For `POST /api/dreams`, errors are returned as `{"error":"..."}`: `400` for invalid data, `403` when the `Origin` header does not match the API origin, `413` for an oversized request body, `415` for an unsupported content type, and `503` when the database is not ready or cannot be reached.

| Method | Endpoint | Data |
| --- | --- | --- |
| GET | `/api/dreams` | `{round, generation, revision, paused, pollingEnabled, feedbackVisible, dreams}` — dreams currently visible on the display |
| GET | `/api/admin/dreams` | `{round, generation, revision, paused, pollingEnabled, feedbackVisible, dreams}` — includes hidden dreams |
| PATCH | `/api/admin/dreams/:id` | `{"hidden":true,"round":1,"generation":1}` to hide a dream; use `false` to show it again |
| PATCH | `/api/admin/playback` | `{"paused":true,"round":1,"generation":1}` to pause every screen; use `false` to resume playback |
| PATCH | `/api/admin/polling` | `{"enabled":false,"round":1,"generation":1}` to stop automatic checks on every screen; use `true` to turn them back on |
| PATCH | `/api/admin/feedback` | `{"visible":false,"round":1,"generation":1}` to hide the feedback QR code on every screen; use `true` to show it |
| POST | `/api/admin/reset` | `{"confirm":"RESET","round":1,"generation":1,"nextRound":1}` to clear all dreams and start the selected round; omit `nextRound` to increment the round number |

The `round` and `generation` values in admin requests must come from the current snapshot. `generation` changes on every reset, even when the same round number is reused, so stale requests cannot clear or modify data in a new round. Round numbers must be positive integers no greater than 2147483647. When upgrading from an earlier version, run `bun run db:setup` against the database in use before deploying to add the `generation`, `paused`, `polling_enabled`, and `feedback_visible` columns while preserving existing data. Refresh the admin page after deployment.

Create an admin session with `POST /api/admin/session` and JSON `{"password":"your configured password"}`. Protected admin endpoints return `401` without a session cookie. Log out with `DELETE /api/admin/session` and JSON `{}`. The browser handles the cookie automatically after login.

Every edit locks the round state in a PostgreSQL transaction. A repeated reset or an edit from an admin page left open on an old round returns `409` without deleting data from the new round. A dream submitted while a reset is in progress is assigned according to the transaction that commits: it is cleared if saved before the reset, or belongs to the new round if saved afterward. The dream submission API keeps the required `{"dream":"..."}` payload, so the sender does not specify a round.

## Tests

```sh
bun run test
bun run build
```

API and browser tests use a separate local database. Its name must end in `_test`, and its host must be `localhost` or `127.0.0.1` to protect production data.

```sh
docker compose exec -T db createdb -U dreamwall dreamwall_test
```

Create an uncommitted `.env.test` file with:

```dotenv
TEST_DATABASE_URL=postgresql://dreamwall:dreamwall@localhost:54329/dreamwall_test
```

```sh
bun run test:integration
bunx playwright install chromium
bun run test:e2e
```

The API tests prepare the test database tables and cover 40 simultaneous participants, hide/show behavior, input validation, repeated resets, and submissions racing with a reset. Browser tests open two displays and verify that old queued dreams do not reappear after a reset. They also cover the mobile layout, HTML injection, and keyboard focus in the confirmation dialog.

Test servers use ports 3099 and 3100 and shut down automatically. Layout review screenshots are stored in `.impeccable/review/` and are not committed.

## Assets

The Neptune image is from NASA/JPL's Voyager 2 mission (PIA01492); see [public/images/README.md](public/images/README.md) for its source. Manrope and Noto Sans Thai are served by the app, so it does not need to fetch Google Fonts.
