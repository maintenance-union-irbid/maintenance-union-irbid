# QA Matrix

## Database/RLS — executed

| Test | Expected | Result |
| --- | --- | --- |
| General admin SELECT two-showroom test data | 2 bookings | PASS |
| Showroom manager SELECT | only own-showroom booking | PASS |
| Assigned employee SELECT | assigned booking only | PASS |
| Unrelated authenticated user SELECT | 0 bookings | PASS |
| Manager updates own-showroom booking | 1 row | PASS |
| Manager attempts other-showroom update | 0 rows | PASS |
| Assigned employee RPC status/note update | succeeds | PASS |
| Employee RPC on unassigned booking | rejected | PASS |
| 3 simultaneous bookings, capacity=2 | 2 success / 1 rejection | PASS |
| Temporary QA data cleanup | 0 test rows/users/showrooms remain | PASS |

## Supabase advisors

Security advisor is rerun after schema/security changes. Remaining SECURITY DEFINER notices correspond to intentionally exposed constrained RPC functions and are documented in SECURITY.md.

Performance advisor currently reports only fresh/unused index information, not a schema correctness error.

## GitHub CI

CI checks:
- dependency install,
- JavaScript syntax,
- Vite production build,
- production dependency audit at high severity threshold,
- absence of service-role/secret patterns,
- CSP + HSTS presence,
- required portal route strings,
- build output existence.

## Deployment acceptance

A client-ready release requires all of:
1. production Vercel deployment reaches READY,
2. public root route returns HTML,
3. /login, /admin, /showroom and /team resolve correctly,
4. customer showroom/service/slot flow succeeds,
5. a real Auth admin login is tested,
6. a real manager login is tested,
7. a real employee login sees an assigned task and can update notes/status,
8. verified URLs and credentials are written to CLIENT-HANDOFF.txt.

Until all eight pass, CLIENT-HANDOFF must not claim production readiness.
