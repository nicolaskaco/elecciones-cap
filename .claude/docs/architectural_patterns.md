# Architectural Patterns

## 1. Server Actions for all DB mutations
All writes go through `'use server'` functions in `src/lib/actions/`.
- Every action calls `getRequiredPerfil()` or `requireAdmin()` first — auth is never assumed from the caller.
- Actions call `revalidatePath()` after mutations so the server re-renders the affected page.
- Pages receive data as props from `await action()` calls at the top — no client-side fetching for initial data.

Pattern: `src/lib/actions/electores.ts:10`, `src/lib/actions/import-electores.ts:13`

## 2. Role-aware Server Components
Pages fetch the `perfil` and branch on `perfil.rol === 'Admin'` to decide what data to fetch and what UI to pass down.
- The **server component** (page) handles auth + data fetching.
- The **client component** (data-table, form) receives `isAdmin` as a prop and conditionally renders buttons/columns.

Pattern: `src/app/(dashboard)/electores/page.tsx`, `src/app/(dashboard)/electores/data-table.tsx:14`

## 3. Inline Persona + Elector creation
`personas` and `electores` are always created together. Server actions insert `persona` first, get the returned `id`, then insert `elector` with `persona_id`. Delete logic checks if persona is orphaned before removing it.

Pattern: `src/lib/actions/electores.ts:52–80`, `src/lib/actions/electores.ts:106–117`

## 4. Supabase client split (server vs client)
- `src/lib/supabase/server.ts` — used in Server Components and Server Actions (reads cookies via `next/headers`)
- `src/lib/supabase/client.ts` — used in Client Components (browser session)
- `src/lib/supabase/middleware.ts` — used only in `src/middleware.ts` for session refresh

Never import the server client in a `'use client'` file and vice versa.

## 5. RLS as the enforcement layer
TypeScript role checks (`requireAdmin()`) are a UX guard. The real enforcement is Postgres RLS using the `get_user_rol()` SECURITY DEFINER function, which reads `perfiles.rol` for the authenticated user. Policies are defined in migrations, not in application code.

Pattern: `supabase/migrations/20260218000000_initial_schema.sql` (all policy blocks)

## 6. Single type file
All DB enums and row interfaces live in `src/types/database.ts`. When the schema changes, update this file and the migration together. No generated types — kept manual to stay simple.

## 7. shadcn/ui component convention
UI primitives in `src/components/ui/` are not modified. Composite components (e.g. `AppSidebar`, `ElectorFormDialog`) live in `src/components/` or co-located with the route in `src/app/`.

## 8. Excel import multi-step flow
`excel-import.tsx` manages a local `step` state machine: `upload → map → preview → done`.
- Parsing happens entirely client-side (SheetJS with `cellDates: true, raw: false`).
- `previewImport` server action is called after mapping to classify rows as new/update/error before the user confirms.
- `importElectores` does the actual upsert, matching by `cedula` or `nro_socio`.

Pattern: `src/app/(dashboard)/electores/import/excel-import.tsx`, `src/lib/actions/import-electores.ts`
