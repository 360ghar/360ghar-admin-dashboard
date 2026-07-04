# Repository Guidelines

> **Canonical guide: [CLAUDE.md](./CLAUDE.md).** Read it first for stack, structure, commands, and conventions.

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
- `npm run lint` / `npm run lint:fix` – run ESLint / apply auto-fixes.
- `npx getdesign@latest add cohere` – install Cohere design specification (DESIGN.md).

## Coding Style & Naming Conventions
- Use TypeScript everywhere; prefer functional React components (`.tsx`) with explicit prop types.
- Indent with 2 spaces; keep imports ordered: React/TS, third-party, then local (`@/*` alias or relative).
- Components and pages use PascalCase (`PropertyList.tsx`); hooks use `useX` naming.
- Reuse Tailwind + Shadcn UI patterns instead of custom CSS where possible.
- Use Cohere design tokens (CSS custom properties) for colors, radius, and spacing consistency.
- Run `npm run lint` and `npm run typecheck` before opening a PR.

## Type & API Conventions
- **No duplicate types.** Each type is defined once. PM types are prefixed with `Pm` (e.g., `PmPropertyCreate`) and live in `pmApi.ts` until extracted.
- **Types in `src/types/<domain>.ts`.** Use `src/types/api.ts` for core domain types, feature-specific types in their respective API or types files.
- **Zod schemas in `validations.ts`.** Each feature that has forms should have a `validations.ts` file exporting named schemas and inferred types. Do not define `z.object()` inline in components.
- **All API modules must be imported in `src/store/index.ts`.** Missing imports cause hooks to fail at runtime.
- **Use typed tag objects** `{type: 'X', id: 'LIST'}` instead of bare string tags `['X']` for RTK Query cache invalidation.
- **Add `providesTags`** to every query endpoint and `invalidatesTags` to every mutation that changes cached data.
- **No legacy endpoints.** Removed duplicate and deprecated endpoints. Use the modern equivalents.

## Component Conventions
- **Components over 300 lines should be split** into focused sub-components (`*Table`, `*Filters`, `*DetailDialog`, `*FormDialog`).
- **Use `<EmptyState>`** from `@/components/ui/empty-state` for all "no data" patterns — no inline "no X found" divs.
- **Use `<LoadingState>`** from `@/components/ui/loading-state` for all loading patterns — no raw `<Loader2>` spinners.
- **Use `<ResponsiveDataTable>`** for lists that need mobile card views. Use `<DataTable>` for desktop-only tables.

## Design System
- **Cohere design tokens** are mapped in `src/index.css` as CSS custom properties.
- Available Cohere colors: `cohere-coral`, `cohere-action-blue`, `cohere-deep-green`, `cohere-dark-navy`, `cohere-form-focus`.
- Available Cohere radius: `rounded-cohere-xs` (4px) through `rounded-cohere-pill` (32px).
- Primary CTAs use pill shape, near-black on light surfaces. UI surfaces stay flat.
- See `DESIGN.md` for full Cohere design specification.

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
- Ensure the backend API and CORS are configured to allow the Vite dev origin.
- Keep auth/session flows Supabase-native (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`); backend `/api/v1/auth/*` endpoints are deprecated/removed.
