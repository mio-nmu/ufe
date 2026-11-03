# ufeedu

Monorepo for the UFE basketball team platform.

- `fd/` — frontend: Next.js 16 + React 19 + Tailwind CSS 4
- `bd/` — backend: Express 5 + TypeScript + MongoDB (Prisma) + Cloudinary

Requires Node 22 (`.nvmrc`) and a MongoDB Atlas database (any replica-set MongoDB works). No Docker needed.

## Quick start

```bash
cd bd
cp .env.example .env
npm install
npm run db:migrate      # push Prisma schema to MongoDB
npm run db:seed         # staff accounts only — no demo data
npm run dev             # http://localhost:4010

cd ../fd
cp .env.example .env.local
npm install
npm run dev             # http://localhost:3000
```

## Commands

Run from `bd/` or `fd/`:

| Command                                      | What it does                                |
| -------------------------------------------- | ------------------------------------------- |
| `npm run dev` / `build` / `start`            | Dev server, production build, run the build |
| `npm run lint` / `type-check`                | ESLint / TypeScript                         |
| `npm test` / `npm run test:e2e`              | Vitest units; e2e: Vitest (bd), Playwright (fd) |
| `npm run verify`                             | Format + lint + types + tests + build       |

Backend-only (`bd/`): `db:migrate` / `db:deploy` (push schema), `db:generate` (regenerate client), `db:seed` (bootstrap staff logins).

E2E tests (`bd`) need no database setup: they start a throwaway in-memory MongoDB replica set (`mongodb-memory-server`) and delete it afterwards. The first run downloads a `mongod` binary into `node_modules/.cache`.

## Configuration

`bd/.env` (copy from `.env.example`):

- `DATABASE_URL` — MongoDB connection string (e.g. your Atlas cluster). E2E tests ignore it and use an in-memory database.
- `STORAGE_PROVIDER=cloudinary` + the four `CLOUDINARY_*` values — enables media uploads (Cloudinary dashboard → Settings → API Keys; the API secret is server-only). Left unset, media endpoints return 503.
- `STAFF_PASSWORD` — shared password for the seeded admin logins; rotate for production.

`fd/.env.local` (copy from `fd/.env.example`):

- `NEXT_PUBLIC_API_URL` — the public URL of the deployed backend, without a trailing
  slash (for example, `https://api.example.com`). This must be set in the frontend
  deployment environment; production builds fail clearly when it is missing instead
  of trying to call `localhost`.

For a Vercel deployment, deploy `bd/` as its own project and set its backend
environment variables (`DATABASE_URL`, JWT secrets, `CORS_ORIGIN`, and the other
values in `bd/.env.example`). Deploy `fd/` as a separate project with
`NEXT_PUBLIC_API_URL` set to the backend's public URL. Set `CORS_ORIGIN` on the
backend to the exact frontend origin, including its scheme.
Production auth cookies are configured for credentialed requests between these
separate frontend and backend origins; both deployments must use HTTPS.

**Admin access:** log in as `manager` / `editor` / `edumanager` (all ADMIN, same admin side), or `POST /api/v1/user/auth/pin` with `ADMIN_PIN_CODE` (4–8 digits; empty disables; production refuses the default `1234`). Both issue the same JWT session.

**Content & media:** editable page copy is stored as one JSON section per `page/section` — public at `GET /api/v1/content/site-content/:page`, written with `PUT /api/v1/content/site-content/:page/:section` (allow-listed in `SITE_CONTENT_PAGES`). Media uploads are format-verified and capped by `MAX_UPLOAD_MB`; deleting a media row also deletes the Cloudinary asset. The admin UI uploads browser → Cloudinary **directly** with server-signed params (`POST /api/v1/admin/media/direct-params`, then `/register` with the resulting `publicId`) because Vercel caps function request bodies at 4.5 MB — larger images can never travel through bd. The proxied multipart `POST /api/v1/admin/media` remains for self-hosted deployments under that cap.

## CMS architecture & update flow

The admin CMS and the public site form one loop, kept fresh through on-demand
cache revalidation (the update-propagation bridge):

```
1. Admin edits in fd /admin/content (games, news, players, executives,
   staff, albums, videos, shop, contact inbox, page copy) and saves.
2. fd admin browser ── POST/PATCH/DELETE bd /api/v1/content/* (Bearer JWT).
3. bd persists (Mongo via Prisma) → toast → admin list refetch.
4. fd admin browser ── POST fd /api/revalidate { tag }  (same Bearer token)
5. fd route handler app/api/revalidate/route.ts:
     verifies the token against bd GET /api/v1/user/auth/me
     (fail closed — bd down ⇒ no purge; ADMIN role required);
     checks tag ∈ ALLOWED_TAGS (fd/lib/cache-tags.ts);
     revalidateTag(tag, { expire: 0 }) ⇒ tagged ISR data-cache entries drop NOW.
6. Next public request refetches fresh data from bd and re-renders.
```

The backend never calls the frontend — the admin browser is the only party
that knows "a write just succeeded" AND "which frontend host it is viewing".
If the purge call fails, the 60s fetch-revalidate window is the safety net.

Key pieces (keep them in sync when extending):

| Concern | Where |
| --- | --- |
| Tag registry (single shared surface) | `fd/lib/cache-tags.ts` ↔ `fd/app/api/revalidate/route.ts` |
| Tagged public fetchers + static fallbacks | `fd/lib/content.ts` |
| Admin mutation tail: toast → refetch → `revalidatePublicTag(tag)` | `fd/components/admin/content/resource-panel.tsx`, `content-manager.tsx`, `fd/lib/admin/revalidate.ts` |
| Copy blobs allow-list (page/section) | `bd/src/config/constants.ts` `SITE_CONTENT_PAGES` |
| JSON-editor defaults prefill | `fd/lib/site-content-defaults.ts` |
| Public GET browser/CDN cache header | `bd/src/middleware/publicReadCache.ts` |

**Adding a new managed resource:** add the bd route + admin tab (tag defaults
to the tab `key`), add the tag to `ALLOWED_TAGS` if it is new, and use it on
the public fetcher. A tag that is fetched but missing from `ALLOWED_TAGS`
(or vice versa) is the classic bug — edits appear only after the 60s window.

**Static fallbacks:** every public fetcher degrades to the bundled defaults
(`fd/content/site.ts`, `fd/content/pages.ts`) when bd is unreachable, so the
site never goes down with the API. The home, history, players, staff and
contact pages are CMS-backed with those same fallbacks; the JSON editor
prefills each section's default so admins never edit blind.

## Author

**Mio** — [evymii](https://github.com/evymii)
# ufe
