**Attendance Tracker** — a small Next.js app to manage timetables and track student attendance using Prisma and NextAuth.

**Quick Start**
- **Install**: `npm install`
- **Environment**: create a `.env` with the variables below.
- **Database migrate & generate**: `npx prisma migrate dev --name init` then `npx prisma generate` (client is generated to `app/generated/prisma`).
- **Run**: `npm run dev` and open `http://localhost:3000`.

**Environment Variables**
- **Required**: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — put these in a `.env` at the repo root.
- **Prisma**: the project loads `.env` in `prisma.config.ts` so `DATABASE_URL` must be resolvable for migrations.

**Project Layout (important files)**
- **Prisma schema**: [prisma/schema.prisma](prisma/schema.prisma)
- **Generated client**: [app/generated/prisma/client.ts](app/generated/prisma/client.ts)
- **Onboarding API**: [app/api/onboarding/route.ts](app/api/onboarding/route.ts)
- **Attendance API (GET)**: [app/api/attendance/route.ts](app/api/attendance/route.ts)
- **Attendance UI**: [app/components/AttendanceCard.tsx](app/components/AttendanceCard.tsx)
- **Auth config**: [lib/auth.ts](lib/auth.ts)

**API Endpoints (summary)**
- `GET /api/attendance` — returns the dashboard data for the signed-in user (requires session).
- `POST /api/attendance/mark` — mark attendance for a subject (client used optimistic updates).
- `POST /api/onboarding` — save a user's timetable (uses Prisma transaction for atomicity).
- `POST /api/register` — create a new user.
- `GET|POST /api/auth/[...nextauth]` — authentication endpoints (NextAuth).

**Notes & Troubleshooting**
- If Prisma migration complains about `DATABASE_URL`, ensure `.env` exists and `prisma.config.ts` loads env vars (this repo includes `import "dotenv/config"` in that file).
- Dev server logs: `.next/dev/logs/next-development.log`.
- When calling APIs from the terminal you will get `401` unless you have a session cookie; test authenticated endpoints from the browser or with a cookie-aware client.
- The onboarding save uses a transaction callback; in runtimes that don't expose model delegates to the callback we fall back to robust alternatives. Check `app/api/onboarding/route.ts` for implementation details.

**Development tips**
- Pretty-print JSON responses in dev: `curl -s http://localhost:3000/api/attendance | jq .` or `| python -m json.tool`.
- If UI components don't stretch to full height, check `app/dashboard/page.tsx` layout wrappers and the card's `h-full` / `flex` utilities.

**Contributing**
- Open issues or PRs on the `main` branch. Keep changes small and focused.

**License**
- MIT (or change to your preferred license).

If you want, I can add a short `docker-compose` recipe for running Postgres locally, or a seed script to populate sample users and timetable data.
