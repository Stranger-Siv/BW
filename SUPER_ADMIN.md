# Super Admin

## Roles

- **player** — Default. Can register, view tournaments, manage own teams.
- **admin** — Can access `/admin`: manage tournaments, rounds, teams, approve/reject registrations.
- **super_admin** — Can do everything admin can, plus:
  - **Manage users** at `/admin/users`: change any user’s role (player / admin / super_admin) and **ban** or **unban** accounts.
  - Only super admins can open "Manage users" and call the super-admin APIs.

Banned users are redirected to `/banned` and cannot use the app (ban is re-checked on each session).

---

## Creating the first super admin

There is no in-app way to promote the first super admin. Set it in the database:

**MongoDB (e.g. MongoDB Atlas or Compass):**

1. Find your user (e.g. by `email` or `googleId`).
2. Update the document:
   - Set `role` to `"super_admin"`.

Example (replace the query with your email):

```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "super_admin" } }
)
```

After that, that account will see **Manage users** on the Admin dashboard and can promote others to admin or super_admin and ban/unban users.

---

## Suggested features for super admin

Ideas you could add later (not implemented yet):

1. **Audit log** — Log who changed which user’s role or ban status (and when), so you can review actions.
2. **Ban reason & expiry** — Store optional reason and optional “banned until” date; show reason on `/banned`; auto-unban when expiry is past.
3. **Impersonate user** — “View as this user” (read-only) or “Sign in as” for support, with clear audit and safety checks.
4. **Bulk actions** — Select multiple users and bulk set role or ban/unban (e.g. after an event).
5. **User search & filters** — Search by email/name/IGN and filter by role/banned on the Manage users page.
6. **Export users** — Export user list (e.g. CSV) for reporting or backup.
7. **Global site settings** — Super-admin-only settings (e.g. maintenance mode, feature flags, max teams per tournament default).
8. **Promote/demote admins** — Restrict “who can create other admins” to super_admin only (already the case); optionally require a second super_admin to confirm demotion of the last super_admin.
9. **Rate limiting / abuse** — Per-user or per-IP rate limits; super_admin can view or adjust.
10. **Announcements** — Super-admin can post a site-wide announcement banner (e.g. “Registration closes tomorrow”).

If you want to implement any of these, we can do them step by step.
