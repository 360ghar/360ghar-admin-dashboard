# Repository Guidelines

## Project Overview
This is the **360Ghar Admin + Agent Portal**: a React-based admin dashboard for managing real estate operations. The project serves two user roles (admin/agent) and provides interfaces for managing properties, users, bookings, visits, analytics, and a full Property Management (PM) portal.

## Project Structure & Module Organization
- React + TypeScript SPA under `src/`.
- `src/features/<domain>/` holds feature code with `api/`, `components/`, `pages/`, `slices/`, `validations.ts`, and `constants.ts` subdirectories.
- `src/components/` holds shared UI (`ui/`), layout, common, map, and media components.
- `src/store/api.ts` is the base RTK Query API; all 14 feature API modules inject endpoints via `api.injectEndpoints()`.
- `src/store/index.ts` registers all API modules — every new API module MUST be imported here.
- `src/hooks/`, `src/lib/`, and `src/types/` hold shared hooks, utilities, and type definitions.
- `src/lib/config.ts` is the single source of truth for `API_BASE_URL`.
- `src/lib/auth.ts` centralizes `fetchUserProfileWithToken` — do not copy-paste this function.

## Build, Test, and Development Commands
- `npm install` – install dependencies.
- `npm run dev` – start Vite dev server (default `http://localhost:5173`).
- `npm run build` – TypeScript project build (`tsc -b && vite build`).
- `npm run preview` – preview the production build locally.
- `npm run typecheck` – project-wide TypeScript type checking.
- `npm run typecheck:tests` – type-check the Vitest suite (`tsconfig.test.json`).
- `npm run test` – run the unit test suite once (Vitest + Testing Library, jsdom). `npm run test:watch` – watch mode.
- Tests live in `src/**/__tests__/` and are covered by `typecheck:tests` + eslint. Vitest also runs `src/features/pm/validations.test.ts`; `typecheck:tests` does not type-check it (eslint does). Config: `vitest.config.ts` + `vitest.setup.ts` (jest-dom + a jest→vi shim).
- `npm run api:sync` – copy `../360ghar-backend/docs/openapi.json` to `openapi/openapi.json` (override with `BACKEND_DIR=...`).
- `npm run api:types` – regenerate `src/lib/api/schema.gen.ts` (never hand-edit it; ESLint ignores it).
- `cp .env.example .env` – copy environment variables.
- CI (`.github/workflows/ci.yml`) runs typecheck, test typecheck, lint, tests and the production build on every pull request and on pushes to `main`. The pre-commit hook runs typecheck, test typecheck, lint and tests (not the build). The production build injects a CSP meta tag (`script-src 'self'`) — keep bootstrap/theme scripts in `public/` instead of inline `<script>` blocks.
- `npm run lint` / `npm run lint:fix` – run ESLint / apply auto-fixes.
- `npx getdesign@latest add cohere` – regenerate the legacy Cohere spec (repo `DESIGN.md` is now the project's own "Command Center" design doc)

## Core Stack
- **React 18** with TypeScript using **Vite** as build tool.
- **Redux Toolkit** + **RTK Query** for state management and API calls.
- **React Router v6** for client-side routing.
- **Tailwind CSS** with the **Shadcn UI** component library (fully implemented; all components are installed and ready to use).
- **"Command Center" design system** tokens mapped via CSS custom properties in `src/index.css` (dark-first glass UI; Cohere-inspired accents; light variant retained). See `DESIGN.md` — the authoritative design doc for humans and agents.
- **ReactBits** motion components vendored into `src/components/reactbits/` (MIT-attributed) — FadeContent, CountUp, SplitText, TiltedCard, GlitchText, ambient-background, etc.
- **Theming**: next-themes (`class` strategy) + `public/theme.js` pre-paint script (dark default, no flash).
- **Zod** + **React Hook Form** for form validation (schemas centralized per feature in `validations.ts` files).
- **Recharts** for data visualization; **Leaflet** for map integration.
- The `axios` package has been removed — RTK Query (`fetchBaseQuery`) is the only HTTP client.

## Authentication Flow
- Supabase-native authentication (phone/password) with SDK-managed session lifecycle.
- Role-based access control uses the explicit `user.role` from the API (`admin`/`agent`). `user.agent_id` only links the user to an agent record and scopes data; do not use it for authorization. Admin users have access to all features; agents are restricted to their assigned properties/users.
- Protected routes via `PrivateRoute` component; role-specific routes via `RoleBasedRoute` component.
- Access token is sourced from the active Supabase session for API requests with 401/403 handling.
- `fetchUserProfileWithToken` is centralized in `src/lib/auth.ts` (do not copy-paste).
- Browser storage is scoped per account (`scopedStorageKey`) and versioned. Sign-out (`clearCredentials`, see `src/store/index.ts`) removes the profile hint, the PM owner selection and every saved list filter; the RTK Query cache is reset. On a 401, the request retries with the current token if the token changed in flight; if the same token failed, it forces one Supabase refresh and retries (at most two retries). It signs out only when the final 401 used the current active token and a non-anonymous session exists. A GET 503 waits for `Retry-After` before it retries.
- Auth state is managed through a Redux slice; the cached user profile is persisted in localStorage.

## Project Tree
```
src/
├── components/
│   ├── common/         # Shared components (ErrorBoundary, PageLoading)
│   ├── layout/         # Dashboard layout (Sidebar, TopBar, DashboardLayout, BottomNav)
│   ├── ui/             # Shadcn UI components + EmptyState, LoadingState, DataTable
│   ├── media/          # Media handling utilities (ImageUpload)
│   └── map/            # Map components (LocationPicker, MapPreview)
├── features/
│   ├── auth/           # Login, signup, auth slice, validations
│   ├── agents/         # Agent management
│   ├── blog/           # Blog/posts/categories/tags
│   ├── bookings/       # Booking management
│   ├── core/           # Dashboard (real composed data: lib/dashboard.ts + hooks/useDashboardData.ts),
│   │                   #   notifications composer, bug reports, pages, FAQs, app updates
│   ├── flatmates/      # Flatmates moderation
│   ├── pm/             # Property Management portal (17 pages, 53+ endpoints)
│   ├── properties/     # Property CRUD, search
│   ├── swipes/         # Swipe UI
│   ├── users/          # User management
│   └── visits/         # Visit scheduling & management
├── store/
│   ├── api.ts          # Base RTK Query API with auth + tagTypes
│   └── index.ts        # Store config (all 14 API modules registered)
├── hooks/              # Custom React hooks
├── lib/
│   ├── config.ts       # Centralized API_BASE_URL (single source of truth)
│   ├── auth.ts         # fetchUserProfileWithToken utility
│   ├── errors.ts       # Error handling (400-504 status codes), getErrorMessage
│   ├── formErrors.ts   # applyServerValidation: map FastAPI 422/400 errors onto RHF fields
│   ├── format.ts       # formatCurrency/Number/Percent/Compact/Date(Time)/RelativeTime (en-IN/INR)
│   ├── dateTime.ts     # server timestamp parsing + API input conversion
│   ├── supabase.ts     # Supabase client
│   └── utils.ts        # cn(), handleAsync(), handleAsyncEvent()
└── types/
    ├── api.ts          # Core domain types (User, Property, Visit, Booking, etc.)
    ├── blog.ts         # Blog-specific types
    └── index.ts        # Barrel re-export
```

## Coding Style & Naming Conventions
- Use TypeScript everywhere; prefer functional React components (`.tsx`) with explicit prop types.
- Indent with 2 spaces; keep imports ordered: React/TS, third-party, then local (`@/*` alias or relative).
- Components and pages use PascalCase (`PropertyList.tsx`); hooks use `useX` naming.
- Reuse Tailwind + Shadcn UI patterns instead of custom CSS where possible.
- Use Cohere design tokens (CSS custom properties) for colors, radius, and spacing consistency.
- Run `npm run lint` and `npm run typecheck` before opening a PR.
- Strict TypeScript mode is enabled. Feature-based organization: pages contain their own components in subdirectories. Follow established patterns for lists, forms, and detail views.
- Pages use a mode prop for different views (e.g., PropertiesPage supports 'create', 'edit', 'view'). List components include search, filtering, pagination, and CRUD operations. Form components use React Hook Form + Zod validation with Shadcn UI components.
- **Select.Item cannot have empty string values.** Use `value="all"` with conversion logic: `value={status} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}`.
- **Null safety in lists:** always use optional chaining for API responses (`data?.items?.length`). Pattern: `{!isFetching && (!data?.items || data.items.length === 0) && (...)}`.
- Display formatted values with `@/lib/format` (currency/number/percent/date/relative time) — never hand-roll `toLocaleString`/`new Date().toLocaleString()`.
- `<CommandPalette>` (`@/components/common/CommandPalette`) is mounted in `TopBar`; ⌘K / Ctrl-K opens it. Add new top-level routes there too.
- Toast notifications use a custom hook pattern.

## Type & API Conventions
- **No duplicate types.** Each type is defined once. PM types live in `src/types/pm.ts` as aliases of the generated components and keep the generated name (e.g., `Lease`, `LeaseStatus`). Only names that clash with a core type in `src/types/api.ts` get a `Pm` prefix (e.g., `PmProperty`, `PmPropertyCreate`).
- **Types in `src/types/<domain>.ts`.** Use `src/types/api.ts` for core domain types, feature-specific types in their respective API or types files.
- **Zod schemas in `validations.ts`.** Each feature that has forms should have a `validations.ts` file exporting named schemas and inferred types. Do not define `z.object()` inline in components.
- **All API modules must be imported in `src/store/index.ts`.** Missing imports cause hooks to fail at runtime.
- **Use typed tag objects** `{type: 'X', id: 'LIST'}` instead of bare string tags `['X']` for RTK Query cache invalidation.
- **Add `providesTags`** to every query endpoint and `invalidatesTags` to every mutation that changes cached data.
- **No legacy endpoints.** Removed duplicate and deprecated endpoints. Use the modern equivalents.
- **Generated types:** core domain types in `src/types/api.ts` (User, Property, Visit, Booking, Agent, etc.) are aliases of the generated components in `src/lib/api/schema.gen.ts`. Only UI-only shapes (filters, view models) and the unauthenticated `/health` root are hand-written. List query types come from `QueryOf<path>`, so an undeclared query key fails the type check. PM-specific types in `src/types/pm.ts` are aliases of the generated components (e.g., `PmProperty`, `PmPropertyCreate`, `Lease`); no hand-written wire types. Define types in `src/types/` (one file per domain). Orphaned types are removed from deleted modules.
- **Wire rules:** errors are read only from `{ error: { code, message, details } }` (`@/lib/errors`); lists are `CursorPage` and a read that needs every row uses `fetchAllPages` (`@/store/fetchAllPages`); `limit` is at most 100; a PATCH-style write sends only changed keys; send `null` to clear a field only where the endpoint schema permits null (for example, PM rejects null for `management_status`, `payment_due_day` and `grace_period_days`, so omit those keys instead).
- **Zod pattern:** follow `src/lib/blogValidation.ts` (named schema exports + inferred type exports). Form components import from validation files, not inline `z.object()`.
- **RTK Query:** base API in `src/store/api.ts` with automatic auth and `refetchOnReconnect: true`; feature API slices extend it using `api.injectEndpoints()`. Use RTK Query for all API interactions (no direct fetch/axios calls except in `lib/auth.ts`). Use Redux slices only for complex client state. Use optimistic updates (`onQueryStarted`) for status changes in PM mutations. Notification state integrates with server-side `notificationsApi` via RTK Query. All API responses are type-safe through TypeScript generics. RTK Query handles data fetching, automatic caching, and tag-based invalidation.

## Component Conventions
- **Components over 300 lines should be split** into focused sub-components (`*Table`, `*Filters`, `*DetailDialog`, `*FormDialog`).
- **Use `<EmptyState>`** from `@/components/ui/empty-state` for all "no data" patterns — no inline "no X found" divs.
- **Use `<LoadingState>`** from `@/components/ui/loading-state` for all loading patterns — no raw `<Loader2>` spinners.
- **Use `<ErrorState onRetry={refetch}>`** from `@/components/ui/error-state` for failed queries. Do not create inline "no data" divs, raw `<Loader2>` spinners, or `window.location.reload()` retries.
- **Server validation in forms:** in a form's mutation `catch`, call `applyServerValidation(error, form.setError)` (from `@/lib/formErrors`) to map FastAPI 422 field errors onto inputs, then render `<FormRootError form={form} />` (from `@/components/ui/form-root-error`) at the top of the form for the catch-all message. Keep a toast for visibility.
- **Use `<ResponsiveDataTable>`** for lists that need mobile card views (pass `mobileCardRender` so actions survive the mobile breakpoint). Use `<DataTable>` for desktop-only tables.
- **Components over 300 lines** are decomposed into sub-components (see above); lists and forms follow the established patterns.
- **ReactBits motion**: import from `@/components/reactbits/<Name>` only (FadeContent, CountUp, SplitText, TiltedCard, GlitchText, ambient-background, ...). Keep MIT headers, honor `prefers-reduced-motion` (final state must render), give `SplitText`/`BlurText` an `aria-label`, and never import `framer-motion` (use `motion/react`).

## Design System
- **"Command Center"**: dark-first glass UI; all tokens are CSS custom properties in `src/index.css` (dark is the shipped default via `public/theme.js` + next-themes; light variant retained via the toggle).
- Available Cohere accents: `cohere-coral`, `cohere-action-blue`, `cohere-deep-green`, `cohere-dark-navy`, `cohere-form-focus`; glass tokens: `--glass-bg`, `--glass-border`, `.card-glow`.
- Available Cohere radius: `rounded-cohere-xs` (4px) through `rounded-cohere-pill` (32px).
- Primary CTAs use pill shape; UI surfaces stay flat (thin borders + `.card-glow`, no heavy shadows).
- Dark-first: `:root` is light, `.dark` is the shipped default via `public/theme.js` + next-themes. Verify every change in both variants with the theme toggle.
- Tokens also include the shadcn base (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`). Radius: shadcn `--radius: 0.5rem` plus the Cohere scale.
- Primary CTAs use `rounded-cohere-pill`; on dark surfaces the pill is white (`--primary`), on light it is near-black.
- UI surfaces stay flat — no heavy drop shadows. Depth from surface alternation, thin borders, `.card-glow` (single shared elevation) and glass panels.
- ReactBits house vocabulary: `FadeContent` (page/list reveals), `CountUp` (KPIs — pass `format` from `@/lib/format`), `SplitText` (page titles), `TiltedCard` (list cards), `GlitchText` (error pages), `ambient-background` (auth screens only, lazy). Never remove the MIT attribution header. Every animation must render its final state under `prefers-reduced-motion` (CountUp/FadeContent/TiltedCard/GlitchText/ambient-background handle this internally). `SplitText`/`BlurText` must receive `aria-label={text}`; scroll-triggered effects resolve the app scroller (`document.getElementById('main-content')`), not `window`. WebGL canvases (`ambient-background`) require a capability probe with a static-gradient fallback. Use `motion/react` (motion.dev) for shadcn-level motion.
- See `DESIGN.md` for the full "Command Center" specification (tokens, ReactBits catalog, motion/a11y rules, per-page treatment map).

## Error Handling
- `src/lib/errors.ts` provides `getErrorMessage()` and `isApiError()` covering HTTP 400-504.
- Use `getErrorMessage(error, fallback)` in catch blocks — do not write ad-hoc status code mapping.

## Testing Guidelines
- Existing examples live under `src/hooks/__tests__` and use React Testing Library.
- Name tests `*.test.ts` / `*.test.tsx` and colocate them in `__tests__` folders near the code.
- Focus on unit tests for hooks, utilities, and Redux logic; mock network interactions rather than calling real APIs.
- Aim to cover new logic you introduce; keep tests deterministic and fast.

## Commit & Pull Request Guidelines
- Use clear, imperative commit messages, e.g., `fix: register missing API modules in store/index.ts`.
- Keep commits focused; avoid mixing refactors and feature work in a single commit.
- PRs should describe what changed, why, and any API or schema impact.
- Include screenshots or GIFs for visible UI changes and reference related issues or tickets.
- Call out breaking changes and required environment/config updates in the PR description.

## Security & Configuration Tips
- Copy `.env.example` to `.env` for local setup; never commit secrets or `.env` files.
- Exposed config must be prefixed with `VITE_` (e.g., `VITE_API_BASE_URL`).
- Environment variables:
  ```env
  VITE_API_BASE_URL=https://api.360ghar.com/api/v1   # Required for production/preview builds
  VITE_SUPABASE_URL=                 # Required for direct Supabase auth/session handling
  VITE_SUPABASE_PUBLISHABLE_KEY=     # Required publishable key
  DEV_API_PROXY_TARGET=              # Dev-only: Vite proxy target (default https://api.360ghar.com)
  ```
  In dev, `API_BASE_URL` is the same-origin `/api/v1` and Vite proxies `/api`, `/health`, `/config` to `DEV_API_PROXY_TARGET` (see `vite.config.ts`) — no CORS and no dependency on the dev port. Production builds use the absolute `VITE_API_BASE_URL`.
- Keep auth/session flows Supabase-native (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`); backend `/api/v1/auth/*` endpoints are deprecated/removed.
- The backend API must be reachable at `DEV_API_PROXY_TARGET` in dev. Backend CORS applies only to deployed origins that call `VITE_API_BASE_URL` directly.
- The application includes comprehensive error handling and loading states.
