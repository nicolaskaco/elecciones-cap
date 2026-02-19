# Elecciones Peñarol — CLAUDE.md

## Project Overview
Campaign management system for Peñarol club elections. Manages voters (electores), call flows, email campaigns, expenses, and events. Two roles: **Admin** (full access) and **Voluntario** (sees only assigned voters).

## Tech Stack
- **Framework**: Next.js 14 (App Router, `force-dynamic` on dashboard)
- **Language**: TypeScript strict mode
- **Database/Auth**: Supabase (Postgres + Row Level Security + Auth)
- **UI**: shadcn/ui + Tailwind CSS + Sonner toasts
- **Forms**: react-hook-form + Zod
- **Email**: Resend
- **Excel import**: SheetJS (xlsx)

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/(dashboard)/` | Protected routes — layout guards via `getRequiredPerfil()` |
| `src/app/login/` | Public auth pages |
| `src/lib/actions/` | Next.js Server Actions (DB mutations) |
| `src/lib/supabase/` | Supabase client helpers (server, client, middleware) |
| `src/lib/validations/` | Zod schemas |
| `src/components/ui/` | shadcn/ui primitives (do not edit) |
| `src/types/database.ts` | Single source of truth for all DB types and enums |
| `supabase/migrations/` | SQL migrations — run in Supabase SQL Editor in order |

## Essential Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build + type check + lint
npx tsc --noEmit   # Type check only
```

No test suite yet. Build (`npm run build`) is the verification step.

## Auth & Role Guard Pattern
- `src/middleware.ts` — refreshes Supabase session on every request
- `src/lib/auth.ts:8` — `getRequiredPerfil()` redirects to `/login` if unauthenticated
- `src/lib/auth.ts:31` — `requireAdmin()` redirects to `/` if not Admin
- Dashboard layout (`src/app/(dashboard)/layout.tsx:1`) calls `getRequiredPerfil()` — all child pages inherit auth

## Database
- Enums and interfaces: `src/types/database.ts`
- RLS enforces role access at the DB level — Supabase `get_user_rol()` function reads from `perfiles`
- Migrations must be run manually in Supabase SQL Editor

## Adding New Features or Fixing Bugs

**IMPORTANT**: When you work on a new feature or bug, create a git branch first.
Then work on changes in that branch for the remainder of the session.

## Additional Documentation
- `.claude/docs/architectural_patterns.md` — Server Actions, role guards, RLS, component patterns
