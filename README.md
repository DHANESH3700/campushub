# CampusHub: Smart College Management Platform

CampusHub is a full-stack college management system for students, faculty, administrators, placement officers, and campus staff. It covers academics, campus services, career workflows, notifications, and an installable Progressive Web App.

This is a working Node.js + Express + MongoDB application with a vanilla HTML/CSS/JavaScript frontend. Features are backed by database models and HTTP APIs, not static screens alone.

## Features and roles

- **Student:** profile, dashboard, attendance, timetable, marks, assignments, leave, issues, document requests, events, resources, placements, scholarships, clubs, achievements, digital ID, library/hostel/transport, notifications.
- **Faculty:** class attendance, marks, assignments, resources, leave review (own department), issues, announcements/events, clubs, reports.
- **Administrator:** users, departments, academic setup, all workflows, settings, analytics, audit logs.
- **Placement officer:** companies, jobs/internships, application status, interviews.
- **Staff:** library, hostel, transport, and document processing (by `staffArea`).

See [docs/FEATURE_CHECKLIST.md](docs/FEATURE_CHECKLIST.md) for implemented vs pending items.

## Architecture

```
campushub/
  server.js                 HTTP bootstrap
  src/app.js                Express app, security, static frontend
  src/config/               Constants and MongoDB
  src/models/               Mongoose schemas
  src/routes/               API router
  src/controllers/          Request handlers
  src/middleware/           Auth, uploads, validation, errors
  src/services/             Email, notifications, files, reminders, assistant
  src/scripts/seed.js       Demo data
  public/                   PWA frontend
  tests/                    Node.js automated tests
  uploads/                  Local private files (not public URLs)
```

The API lives at `/api`. The frontend is a hash-routed SPA served from `public/`. Protected files are streamed from `/api/files/:id` with a `Authorization: Bearer` header (tokens are never placed in download URLs).

## Requirements

- Node.js 20 or later
- MongoDB 6+ (local or hosted, for example MongoDB Atlas)

## Installation

```bash
cd campushub
copy .env.example .env
npm install
```

On macOS/Linux use `cp .env.example .env`. Set `MONGODB_URI` and a long `JWT_SECRET` in `.env`.

## Database and demo accounts

Start MongoDB, then:

```bash
npm run seed
npm run dev
```

Open http://localhost:5000

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@campushub.edu | Admin@12345 |
| Faculty | faculty@campushub.edu | Admin@12345 |
| Student | student@campushub.edu | Admin@12345 |
| Placement | placement@campushub.edu | Admin@12345 |
| Library staff | library@campushub.edu | Admin@12345 |

`npm run seed` **drops the CampusHub database**. Use it only on a development database.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch-mode API + static app |
| `npm start` | Production-style start |
| `npm run seed` | Reset and load demo data |
| `npm test` | Automated API tests (in-memory MongoDB) |

## Email setup

CampusHub reads:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

If SMTP is not configured, emails are written to the server log. That is enough for local development. Use a transactional provider (Amazon SES, Mailgun, Brevo, Gmail SMTP with an app password) in production. Credentials stay on the server only.

Used for verification, password reset, leave/issue/document updates, events, assignments, attendance warnings, placements, and scholarships.

## File storage

Default: disk folder from `UPLOAD_DIR` (default `uploads/`). Files are not served as static public assets.

- Type and size limits are enforced (see `ALLOWED_MIME` and `MAX_FILE_SIZE_MB`).
- Paths are resolved under the upload root to block directory traversal.
- Authorization is checked before streaming.

For S3 or an S3-compatible service, set `STORAGE_PROVIDER=s3`, `S3_BUCKET`, and `S3_REGION`. Credentials may come from the AWS SDK credential chain (recommended IAM role) or the paired `S3_ACCESS_KEY` and `S3_SECRET_KEY` values. Set `S3_ENDPOINT` for a compatible service. Grant only object `PutObject`, `GetObject`, and `DeleteObject` permissions for the bucket prefix used by this app, and keep bucket public access blocked. New uploads are private objects; authenticated file downloads retain the app's existing authorization checks. Leave `STORAGE_PROVIDER=local` to keep using disk.

## PWA

- `public/manifest.json` and `public/sw.js`
- Installable on supported mobile and desktop browsers over HTTPS (or localhost)
- Static assets may be cached; **API responses, JWTs, and private files are not cached**
- Offline page explains that live academic data is unavailable offline

## Notifications and reminders

- In-app notifications with read/unread
- Email when SMTP is configured
- Duplicate suppression via `dedupeKey`
- A reminder job runs every six hours (disabled during tests) for assignment/placement/scholarship deadlines and attendance warnings
- Optional browser push: generate VAPID keys with `npx web-push generate-vapid-keys`, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`, then let each user enable browser notifications on the Notifications page over HTTPS (or localhost). Push is opt-in and expired subscriptions are removed after delivery failures.

Attendance reports support CSV (default) and PDF with `/api/attendance/report?format=pdf`. Admin audit reports support JSON (default), CSV, and PDF with `/api/audit?format=pdf`.

## Assistant

`POST /api/assistant` is rule-based and permission-aware. It does not invent marks. `OPENAI_API_KEY` is optional and must remain a server secret. It is unused unless you extend `assistantService.js`.

## Testing

```bash
npm test
```

Coverage includes unauthenticated access, JWT failures, registration/login, admin privilege checks, department isolation on leave, unpublished marks, overlapping leave, placement duplicates, event registration, private file access, PDF formats, opt-in push subscriptions, and mocked S3 upload/download.

Manual checks: log in as each demo role, submit a leave request, mark attendance, upload a resource, apply to a job, install the PWA on a phone, and confirm files download only while logged in.

API testing with Postman: import requests against `/api/health`, `/api/auth/login`, then authenticated module URLs listed in `src/routes/index.js`.

## Deployment

Low-cost example:

1. **MongoDB Atlas** — free/shared cluster; enable backups on a paid tier. Storage and connection limits apply; it is not guaranteed free forever.
2. **Backend** — Render, Railway, or Fly.io. Set all `.env` values. Add a persistent disk **or** object storage for `uploads/`.
3. **Frontend** — served by the same Express app, or copy `public/` to any static host and point it at the API (`API` is same-origin by default).
4. Configure `APP_URL`, `FRONTEND_ORIGIN`, `CORS`, and HTTPS at the platform.
5. Health check: `GET /api/health`.
6. Rollback: redeploy the previous git commit and restore a MongoDB snapshot.

Pricing and quotas change; read the current provider docs before you assume a free tier.

### Recovery

- Database: restore from Atlas snapshots or `mongodump`/`mongorestore`
- Files: restore the volume or bucket
- Secrets: rotate `JWT_SECRET` (this signs out all users) and SMTP credentials if leaked

## Security

- Passwords hashed with bcrypt; never stored in plaintext
- JWT in `Authorization` headers only
- Role checks on every mutating academic/career route
- Rate limits on `/api` and stricter limits on login/forgot-password
- Helmet security headers
- Central error handler hides stack traces in production
- Audit log for administrative actions

Never commit `.env` or real SMTP, JWT, VAPID, or S3 credentials.

## Known limitations

- No live GPS for transport (by design).
- Charts on the admin dashboard need Chart.js loaded from jsDelivr; an offline admin session will still show tables.
- First `npm test` may download a MongoDB binary for `mongodb-memory-server`.

## Deploy to Render

This repository includes a Render configuration for a free Node deployment.

1. Push this repo to GitHub.
2. Sign in to Render and click New + > Blueprint.
3. Connect the GitHub repository.
4. Render will create the web service and a MongoDB database automatically.
5. Update `APP_URL` and `FRONTEND_ORIGIN` in the Render dashboard if your app name changes.
6. Set a strong `JWT_SECRET` if it was not generated automatically.

The app uses a MongoDB connection string from the managed database created by Render. For a production-ready setup, also configure SMTP and any optional push keys under the service Environment Variables.

## Deploy to Vercel

This app can also be deployed to Vercel with a serverless wrapper.

1. Import this repository into Vercel.
2. Set the framework preset to "Other".
3. Add the required environment variables from `.env.example`.
4. Set `MONGODB_URI` to a MongoDB Atlas or hosted MongoDB connection string.
5. Deploy the project.

Note: Vercel is a good fit for the frontend and API, but background jobs such as reminder scheduling may not run reliably in a serverless environment. For production, a persistent Node host such as Render, Railway, or a VM is more robust.

## License

Educational project source. Adapt it to your institution’s policies before production use.
