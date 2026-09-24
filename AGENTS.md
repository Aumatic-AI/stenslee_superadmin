<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Stenslee Super Admin — Agent Reference

Platform-operator console for the Stenslee multi-tenant tattoo-studio SaaS.
This is a **separate Next.js project and separate git repository** from the
studio app (`../studio`) — the two share only the Supabase backend
(`supabase-schema.sql`, one level up). See `../README.md` for the overall
workspace layout.

## Who uses this

Not studio staff. This app is for the Stenslee team that runs the platform
itself: creating/suspending studio organizations, defining subscription
plans, granting per-org feature overrides, and browsing cross-tenant
sessions/customers for support. Auth is a separate `platform_admins` table,
completely distinct from studio's `staff` table.

## Stack

Same as studio: Next.js 16 (App Router) + React 19 + TypeScript strict mode,
Supabase (`@supabase/ssr`), Tailwind v4, same dark/gold/Cinzel theme.
Zustand is not currently used here — every page fetches its own data
client-side; add a store only if cross-page shared state actually shows up.

## Dev Environment

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npx tsc --noEmit -p .
npx eslint src middleware.ts
```

No automated test suite. Verify with tsc + eslint + build, then exercise the
flow in a browser — same discipline as the studio app.

## Auth Model

`platform_admins.id` is a foreign key to `auth.users(id)` (mirrors
`staff.id` in the studio schema). There is no self-serve signup — a
platform admin is created either via the Supabase Dashboard (Authentication
→ Users) plus a matching `platform_admins` row, or via **Settings → Add
Platform Admin** in this app, which calls `supabase.auth.signUp()` from a
*stateless* client (`persistSession: false`) specifically so it can't hijack
the acting admin's own session — `signUp()` normally signs the calling
browser in as the new user.

`is_platform_admin()` (Postgres function, mirrors `is_admin()`/
`is_designer()` in the studio schema) backs every RLS policy this app
relies on. Every read/write in this app's pages goes through the **browser**
Supabase client under this policy — never a service-role API route — both
because RLS already scopes a platform admin to full access, and because
this dev environment has a documented Node→Supabase fetch reliability issue
(see the studio AGENTS.md's "Known machine-specific issue"). If you add a
new table this app should manage, give it a
`for all using (is_platform_admin())` (or `for select` for read-only
cross-tenant views like Sessions/Customers) policy rather than routing
through a Node API.

## Route Map

| Route | Purpose |
|-------|---------|
| `/login` | Platform admin sign-in |
| `/dashboard` | Platform-wide KPIs, recent orgs, needs-attention list |
| `/organizations` | All studio tenants — search, status filter, create |
| `/organizations/[id]` | Org detail — tabbed: Analytics, Plans, **Permissions** (status + full override grid), Staff, Customers |
| `/plans` | Subscription tiers |
| `/plans/new`, `/plans/[id]` | Plan editor — pricing + full feature grid |
| `/sessions` | Cross-tenant session list (read-only) |
| `/customers` | Cross-tenant customer list — search, org filter, create, edit |
| `/designers` | Cross-tenant staff list (designers + admins) — search, org filter, create |
| `/settings` | Own profile, password change, platform admin roster |

## Key Files

- `src/lib/feature-registry.ts` — the 19-key feature registry with display
  metadata (label, description, category, toggle-vs-limit), mirrored from
  the studio app's `src/lib/permissions/feature-keys.ts`. If a feature key
  is ever added there, add it here too — this is the only other place the
  list is hand-maintained.
- `src/lib/feature-grid.ts` — shared helpers for turning `plan_features`/
  `organization_feature_overrides` rows into the grid-editor's in-memory
  shape and back.
- `src/features/plans/PlanFeatureEditor.tsx` — the reusable 19-key grid used
  by both the new-plan and edit-plan pages.
- `src/features/permissions/PermissionsMatrix.tsx` — the per-org override
  grid: each row shows the plan default badge next to a toggle (and a limit
  input, when relevant) that directly edits the *effective* value for this
  org. No separate "enable override first" step -- change a row and it's a
  pending edit; save it and it becomes an explicit override row, or gets
  deleted if you changed it back to match the plan.
- `src/components/ui/Tabs.tsx` — generic reusable tab bar (segmented-pill
  style). `/organizations/[id]` is its only consumer today; add a tab
  anywhere else in this app by passing another `{ key, label }`.
- `src/features/organizations/tabs/` — the five tabs
  `/organizations/[id]` is built from (Analytics, Plans, Permissions, Staff,
  Customers). The parent page keeps a tab mounted (hidden via CSS, not
  unmounted) once you've opened it once, specifically so switching away
  from Permissions mid-edit doesn't silently discard unsaved changes.
  `PermissionsTab.tsx` is the full former `/permissions` page's logic,
  now scoped to the org you're already looking at instead of a separate
  route with its own organization picker.
- `src/components/layout/AdminShell.tsx` — sidebar/top-bar/mobile-nav shell,
  gates on a live `platform_admins` row (not just a Supabase session) the
  same way studio's `AdminSidebarShell` gates on `staff`.
- `src/features/staff/AddStaffModal.tsx` — creates a `staff` row (designer
  or admin) for any organization. Used from both `/designers` (organization
  picker shown) and `/organizations/[id]`'s Staff tab (`fixedOrganizationId`
  passed, no picker). Same stateless-`signUp()` pattern as
  `AddPlatformAdminModal` in `src/features/settings/`.
- `src/features/customers/AddCustomerModal.tsx` — same `fixedOrganizationId`
  pattern as `AddStaffModal`, used from both `/customers` (picker shown)
  and `/organizations/[id]`'s Customers tab (no picker).
- `src/components/ui/Select.tsx` — the custom dropdown primitive (no native
  `<select>`) — used for the organization filter/picker on `/customers`,
  `/designers`, and both add-staff/add-customer modals.
- `src/lib/supabase-client.ts` / `src/lib/supabase-server.ts` — same
  cookie-based pattern as studio.

## Conventions carried over from studio

- Soft concepts don't apply here the same way (no soft-delete table yet in
  this app's own scope) — if you add one, follow studio's `deleted_at`
  convention rather than inventing a new one.
- Custom dropdowns/buttons only — no native `<select>`, matching studio's
  visual language. Copy `src/components/ui/FilterChips.tsx` for a small
  fixed-choice filter.
- Keep prompts/instructions terse if this app ever calls an LLM — not
  currently the case, but the studio app's "prompt-minimalism" lesson
  (`AGENTS.md`) generalizes.
