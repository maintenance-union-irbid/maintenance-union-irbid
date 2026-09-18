# Initial system setup

The production database and application are already isolated and configured. Account enrollment uses Supabase Auth.

## First general administrator

1. Open `/login`.
2. Create a normal Supabase Auth account.
3. Complete email confirmation if the project requests it.
4. Sign in.
5. In the signed-in account panel, enter the one-time initial-admin setup code supplied separately to the system owner.
6. The database atomically verifies the hashed code, confirms no admin already exists, promotes the current profile and permanently consumes the code.

The plaintext setup code is not committed to GitHub and is not stored in Supabase.

## Showroom manager and employee accounts

1. Each person creates a normal account from `/login`.
2. The general admin opens `/admin`.
3. Select the user, showroom and role.
4. Save the membership.
5. The manager can then manage showroom data, services, availability/capacity, closure dates, employees and task assignment.
6. The employee sees only tasks assigned to their authenticated user.

## Important

Do not create shared production passwords or bypass Supabase Auth. Demo/test accounts should be separate from real staff accounts and should be removed or rotated after client acceptance testing.
