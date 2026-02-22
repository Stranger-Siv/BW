# Real-time (Pusher) – What’s implemented

All real-time updates use **Pusher**. Channels: **`site`**, **`tournament-{id}`**, **`tournaments`**.

---

## 1. Maintenance mode

| What | How it works |
|------|----------------|
| **Trigger** | When a super admin turns maintenance **on** or **off** in **Admin → Settings**, the server saves and broadcasts `maintenance_changed` with `{ maintenanceMode: true \| false }`. |
| **Who receives** | Every open tab (any user). |
| **Where it’s used** | **MaintenanceGate** (layout): shows or hides the full-page “Under maintenance” screen. **Admin Settings page**: the “Status: On/Off” and Turn on/Turn off buttons stay in sync if another tab changes maintenance. |
| **Events** | Channel: `site`. Event: `maintenance_changed`. Payload: `{ maintenanceMode: boolean }`. |

---

## 2. Announcement (banner)

| What | How it works |
|------|----------------|
| **Trigger** | When a super admin **saves** the announcement in **Admin → Settings** (message and/or “Show announcement” checkbox), the server saves and broadcasts `announcement_changed` with `{ message, active }`. |
| **Who receives** | Every open tab. |
| **Where it’s used** | **AnnouncementBanner** (layout): shows or hides the green top banner and updates the message. **Admin Settings page**: the announcement textarea and “Show announcement” checkbox stay in sync if another tab changes the announcement. |
| **Events** | Channel: `site`. Event: `announcement_changed`. Payload: `{ message: string, active: boolean }`. |

---

## Summary table

| Feature | Server triggers (API) | Client subscribes (component) | Real-time behaviour |
|--------|------------------------|--------------------------------|----------------------|
| Maintenance on/off | `PATCH /api/super-admin/settings` (when `maintenanceMode` is sent) | MaintenanceGate, Admin Settings page | Maintenance page and Settings status update without refresh. |
| Announcement set/clear/edit | `PATCH /api/super-admin/announcement` | AnnouncementBanner, Admin Settings page | Banner and Settings form update without refresh. |

---

## 3. Teams added or removed (tournament)

| What | How it works |
|------|----------------|
| **Trigger** | When a team is **added** (admin add-team, or public registration with `tournamentId`), or **removed** (admin disband), the server broadcasts `teams_changed` on channel `tournament-{tournamentId}` and `tournaments_changed` on channel `tournaments`. |
| **Who receives** | Any open tab subscribed to that tournament or to the list. |
| **Where it’s used** | **Admin dashboard**: teams list and tournament cards (counts) refetch. **Admin rounds page**: teams list and rounds refetch. **Public /tournaments**: tournament list (and registered counts) refetch. |
| **Events** | Channel `tournament-{id}`: event `teams_changed`. Channel `tournaments`: event `tournaments_changed`. |

**APIs that trigger:**  
- `POST /api/admin/tournaments/[id]/teams` (add team)  
- `DELETE /api/admin/team/[id]` (disband team)  
- `POST /api/register` (register with `tournamentId`: new team or update team)

---

## What is **not** real-time (no Pusher)

- Audit log
- User list (super-admin)
- Rounds/schedule edits (only team add/remove triggers refetch for rounds page)

To add real-time for those, add new events in `lib/pusher.ts`, trigger in the API routes, and subscribe with `usePusherChannel`.
