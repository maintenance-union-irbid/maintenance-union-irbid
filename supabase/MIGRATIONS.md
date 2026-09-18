# Supabase migrations

Production project: `gcrjwbmeuxaejndlsvrb`

Applied migrations:

1. `001_core_multi_showroom_schema`
   - multi-showroom relational model
   - booking validation
   - slot availability
   - RLS and authorization helpers
   - concurrency/overbooking protection

2. `002_seed_demo_showroom`
   - demo Irbid showroom
   - demo services
   - Sunday–Thursday availability

3. `003_security_and_policy_cleanup`
   - revoke internal SECURITY DEFINER execution
   - policy split/cleanup
   - composite FK index

4. `004_admin_and_staff_management`
   - admin showroom management
   - manager employee-membership management

5. `005_enable_pg_net_for_bootstrap`
   - temporary bootstrap experiment

6. `006_profile_relations_and_remove_temporary_pg_net`
   - explicit profile relationships for PostgREST embedding
   - removed temporary pg_net extension/schema

The recurring audit compares live schema/advisor output against application expectations after material changes.

7. `007_secure_initial_admin_bootstrap`
   - one-time hashed setup token stored only in private schema
   - authenticated user may claim first general-admin role once
   - plaintext setup code is never committed or stored in the database

8. `008_harden_public_booking_rpc`
   - phone normalization for validation/rate controls
   - duplicate booking prevention
   - per-phone hourly booking-attempt ceiling
   - name/phone/address length validation
   - phone-level advisory lock for race-safe rate/duplicate checks
