# Maintenance Union Irbid — اتحاد الصيانة - إربد

Clean, isolated multi-showroom maintenance platform for Irbid.

## Production stack

- Frontend: Vite + vanilla ES modules
- Data/Auth: Supabase Postgres + Auth + Row Level Security
- Hosting target: Vercel
- CI: GitHub Actions
- Time zone: Asia/Amman

## Portals

| Path | Purpose |
| --- | --- |
| `/` | Customer booking |
| `/login` | Internal sign-in |
| `/admin` | General administration |
| `/showroom` | Showroom owner/manager |
| `/team` | Maintenance employee |

## Core business rules

1. Customer selects a showroom first.
2. Only that showroom's services and appointment capacity are used.
3. Selected showroom remains visible through booking.
4. Home maintenance requires an address; showroom maintenance does not request an unnecessary customer address.
5. Booking confirmation includes showroom, service, appointment, location and order number.
6. Capacity is enforced in PostgreSQL, not only in the browser.
7. Concurrent bookings for the same showroom/time are serialized with an advisory transaction lock.
8. General admins can work across the union.
9. Managers are restricted to showrooms where they have an active manager membership.
10. Employees can read assigned tasks and update only their own task workflow through a constrained RPC.
11. Anonymous customers cannot read booking/customer records.

## Security

- RLS is enabled on every exposed application table.
- Browser code contains only the Supabase publishable key.
- No service-role/secret/database password is committed.
- CSP, HSTS, X-Frame-Options, nosniff, referrer and permissions headers are defined in `vercel.json`.
- HTML derived from user/database strings is escaped before rendering.
- Public `SECURITY DEFINER` RPCs are deliberately narrow:
  - `get_available_slots`: calculates availability without exposing booking rows.
  - `create_booking`: creates a validated booking without granting direct anonymous INSERT on bookings.
  - `employee_update_booking`: lets an authenticated employee update only a booking assigned to that user.

See `docs/SECURITY.md`.

## QA

GitHub CI installs pinned direct dependencies, checks JavaScript syntax, builds the Vite production bundle, runs a production dependency audit, scans source for privileged Supabase secrets, verifies security headers and checks required routes.

Database tests additionally verify:
- admin sees cross-showroom data,
- manager sees only own-showroom bookings,
- employee sees only assigned work,
- unrelated authenticated user sees no bookings,
- manager cannot update another showroom booking,
- employee RPC cannot update an unassigned booking,
- three simultaneous requests against capacity 2 produce two bookings and reject the third.

See `docs/QA.md` and `docs/overnight-audit.txt`.

## Database migrations

The production Supabase project currently contains migrations 001–006. See `supabase/MIGRATIONS.md`.

## Local development

```bash
npm install
npm run dev
```

Production verification:

```bash
npm test
npm audit --omit=dev --audit-level=high
```

## Environment

The frontend uses:

```
VITE_SUPABASE_URL=https://gcrjwbmeuxaejndlsvrb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Only publishable keys belong in browser environments.

## Status

The application/database implementation is active and undergoing automated build, security, data-integrity and deployment validation. Do not treat a Vercel URL as client-ready until it is recorded as verified in `docs/CLIENT-HANDOFF.txt`.
