# Run Scryvant locally

Use Node.js 24 and npm. Install each existing package separately:

```sh
npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

Start MongoDB on localhost port 27017 and an SMTP catcher on port 1025. Copy `backend/.env.example` to `backend/.env`, supply a random session secret, and keep that file private. The example uses frontend port 5174 so it does not collide with the other local project on 5173.

Run the API from its directory so dotenv reads the intended file:

```sh
cd backend
npm run dev
```

In another terminal:

```sh
npm run dev --prefix frontend -- --port 5174 --strictPort
```

Open http://localhost:5174. Vite forwards `/api` to port 5000, keeping browser requests on one origin. Registration sends a code to your configured SMTP catcher. The guest preview is interactive but temporary; account sheets persist in MongoDB. Gemini requires both `GEMINI_API_KEY` and `GEMINI_MODEL`; manual play remains available without them.

For the packaged stack, set a random secret and start the optional app profile:

```sh
SESSION_SECRET="$(openssl rand -hex 32)" docker compose --profile app up --build
```

Its defaults are http://localhost:5174 for Scryvant, port 27018 for host access to MongoDB, port 1026 for SMTP, and http://localhost:8026 for the Mailpit inbox. The containers communicate on their internal service ports. Override `APP_PORT`, `MONGO_PORT`, `SMTP_PORT`, or `MAIL_UI_PORT` if a local service already uses one.

## Verify changes

```sh
npm run check:boundaries
npm run format:check
npm run lint --prefix backend
npm run lint --prefix frontend
npm run typecheck --prefix backend
npm test --prefix backend -- --runInBand
npm run build --prefix backend
npm run build --prefix frontend
npm --prefix frontend exec -- playwright test --config frontend/playwright.config.ts
```

The backend suite starts a temporary local `mongod`. Alternatively, set `TEST_MONGODB_URI`; the suite always chooses a random test database and drops only that database. Browser tests require Playwright Chromium. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when using an existing compatible browser executable.

## Preserve existing data

Before migration, stop writers and use MongoDB Database Tools to create a backup in a private directory:

```sh
mongodump --uri "$MONGODB_URI" --archive=backup.archive --gzip
```

From `backend`, run `npm run migrate` for a dry-run count. Review the count and backup before applying with `npm run migrate -- --apply`. A second applied run should report zero migrated records. This marks legacy characters for completion; it does not infer missing build choices. Their original fields and IDs remain intact. Existing JWT sessions are intentionally invalid after the authentication transition.

Verify restoration into a separate disposable database before relying on the backup:

```sh
mongorestore --uri mongodb://127.0.0.1:27017 --archive=backup.archive --gzip --nsFrom 'scryvant.*' --nsTo 'scryvant_restore_check.*'
```

Adjust the source namespace if your database has another name. Compare collection counts and sample IDs in the restored database, then test the migration there. Do not restore over the live database without a separate recovery decision. Backup/restore commands are instructions; restoration has not yet been exercised for this project.

## Current release boundary

The frontend, security foundation and deterministic rules core are implemented. This is not yet the complete release described in the plan. Full SRD class-feature automation, authenticated browser end-to-end testing, real Gemini verification and production packaging remain unfinished. See `security-review.md` for the evidence and remaining checks.
