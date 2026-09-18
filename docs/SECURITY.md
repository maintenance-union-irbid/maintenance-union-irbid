# Security Model

## Trust boundaries

Customer browser requests are untrusted. Authorization is enforced in PostgreSQL with Row Level Security and constrained RPC functions.

## Roles

- General admin: `profiles.global_role = 'admin'`
- Showroom manager: active `showroom_memberships(role='manager')`
- Maintenance employee: active `showroom_memberships(role='employee')`
- Customer: anonymous or authenticated booking requester

## Tenant isolation

`showroom_id` is the tenant boundary for services, availability, closures, memberships and bookings.

Managers never receive a policy that permits booking access outside their active showroom membership.

Employees receive SELECT access only to rows whose `assigned_employee_id = auth.uid()`. Task status/notes updates are performed via `employee_update_booking`, which also rechecks assignment.

## Booking confidentiality

Anonymous users:
- may read active showroom/service/availability information,
- may call `get_available_slots`,
- may call `create_booking`,
- may not SELECT booking rows or customer PII.

This is why the public booking RPCs use SECURITY DEFINER. The Supabase advisor warns on SECURITY DEFINER API functions generically; these RPCs are intentionally exposed and constrained rather than opening the underlying booking table.

## Overbooking

`validate_booking_integrity()` obtains a PostgreSQL advisory transaction lock derived from showroom + scheduled timestamp before counting active bookings. This serializes simultaneous requests for the same slot.

The concurrency test sends three simultaneous booking attempts into a slot with capacity 2. Expected and observed result: two succeed, the third is rejected as fully booked.

## Secrets

Allowed in browser/repository:
- Supabase project URL
- Supabase publishable key

Forbidden:
- service_role key
- sb_secret keys
- database passwords
- access tokens

GitHub CI scans for privileged Supabase secret patterns.

## HTTP headers

Vercel configuration defines:
- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy

## Remaining platform-level controls

Controls that live outside application code (for example Supabase account/Auth dashboard protections) are checked by the recurring audit where the connector exposes them. Any platform setting that cannot be changed through the connector must be listed as a blocker instead of being silently claimed as complete.
