# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **360Ghar Admin + Agent Portal** - a React-based admin dashboard for managing real estate operations. The project serves two user roles (admin/agent) and provides interfaces for managing properties, users, bookings, visits, analytics, and a full Property Management (PM) portal.

## Key Development Commands

```bash
# Development
npm run dev              # Start dev server on port 5173

# Build & Type Check
npm run build            # TypeScript compilation + Vite build
npm run typecheck        # TypeScript type checking only
npm run typecheck:tests  # Type-check the Vitest suite (tsconfig.test.json)
npm run preview          # Preview production build

# Tests (Vitest + Testing Library, jsdom)
npm run test             # Run the unit test suite once
npm run test:watch       # Watch mode
# Tests live in src/**/__tests__/ and ARE covered by typecheck:tests + eslint.
# Config: vitest.config.ts + vitest.setup.ts (jest-dom + a jest→vi shim).

# Setup
npm install              # Install dependencies
cp .env.example .env     # Copy environment variables
npx getdesign@latest add cohere  # Install Cohere design specification
```

CI (`.github/workflows/ci.yml`) runs typecheck, test typecheck, lint, tests and the
production build on every push/PR; the pre-commit hook runs the same gates. The production
build injects a CSP meta tag (`script-src 'self'`) — keep bootstrap/theme scripts in
`public/` instead of inline `<script>` blocks.

## Architecture Overview

### Core Stack
- **React 18** with TypeScript using **Vite** as build tool
- **Redux Toolkit** + **RTK Query** for state management and API calls
- **React Router v6** for client-side routing
- **Tailwind CSS** for styling with **Shadcn UI** component library (fully implemented)
- **Cohere Design System** tokens mapped via CSS custom properties in `src/index.css`
- **Zod** + **React Hook Form** for form validation (schemas centralized per feature in `validations.ts` files)
- **Recharts** for data visualization
- **Leaflet** for map integration

### Authentication Flow
- Supabase-native authentication (phone/password) with SDK-managed session lifecycle
- Role-based access control (admin/agent roles) determined by `user.agent_id` field
- Protected routes via `PrivateRoute` component
- Role-specific routes via `RoleBasedRoute` component
- Access token is sourced from active Supabase session for API requests with 401/403 handling
- `fetchUserProfileWithToken` centralized in `src/lib/auth.ts` (do not copy-paste)

### Project Structure
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

### API Integration Pattern
The project uses a centralized API setup:
- Base API configuration in `src/store/api.ts` with automatic auth and `refetchOnReconnect: true`
- Feature-specific API slices extend the base API using `api.injectEndpoints()`
- **All 14 API modules must be imported in `src/store/index.ts`** for endpoint registration
- RTK Query handles data fetching, caching, and tag-based invalidation
- Use typed tag objects `{type: 'X', id: 'LIST'}` instead of bare string tags `['X']`
- All API responses are type-safe through TypeScript generics

### Type Organization
- Core domain types in `src/types/api.ts` (User, Property, Visit, Booking, Agent, etc.)
- PM-specific types in `src/types/pm.ts` (prefixed with `Pm` — e.g., `PmPropertyCreate`, `PmProperty`, `PmPropertyImage`)
- No duplicate types across files — each type defined once
- Orphaned types removed from deleted modules

### Validation Pattern
- Zod schemas centralized per feature in `src/features/<domain>/validations.ts`
- Follow the `src/lib/blogValidation.ts` pattern: named schema exports + inferred type exports
- Form components import from validation files, not inline `z.object()`

### Key Implementation Patterns

#### Page Organization
- Pages use a mode prop for different views (e.g., PropertiesPage supports 'create', 'edit', 'view')
- List components include search, filtering, pagination, and CRUD operations
- Form components use React Hook Form + Zod validation with Shadcn UI components
- Components exceeding 300 lines should be decomposed into sub-components

#### Select Component Usage
- Important: Select.Item cannot have empty string values. Use value="all" with conversion logic
- Pattern: `value={status} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}`

#### Null Safety in Lists
- Always use optional chaining for API responses: `data?.items?.length`
- Pattern: `{!isFetching && (!data?.items || data.items.length === 0) && (...)}`

#### Empty / Loading / Error States
- Use `<EmptyState>` from `@/components/ui/empty-state` for empty results
- Use `<LoadingState>` from `@/components/ui/loading-state` for loading
- Use `<ErrorState onRetry={refetch}>` from `@/components/ui/error-state` for failed queries
- Do not create inline "no data" divs, raw `<Loader2>` spinners, or `window.location.reload()` retries

#### Server Validation & Forms
- Display formatted values with `@/lib/format` (currency/number/percent/date/relative time) — never hand-roll `toLocaleString`/`new Date().toLocaleString()`
- In a form's mutation `catch`, call `applyServerValidation(error, form.setError)` (from `@/lib/formErrors`) to map FastAPI 422 field errors onto inputs, then render `<FormRootError form={form} />` (from `@/components/ui/form-root-error`) at the top of the form for the catch-all message. Keep a toast for visibility.

#### Global navigation
- `<CommandPalette>` (`@/components/common/CommandPalette`) is mounted in `TopBar`; ⌘K / Ctrl-K opens it. Add new top-level routes there too.

#### State Management
- Auth state managed through Redux slice; cached user profile is persisted in localStorage
- API state managed through RTK Query with automatic caching
- Notification state integrates with server-side `notificationsApi` via RTK Query
- Toast notifications implemented using custom hook pattern

#### Design System
- Cohere design tokens mapped to CSS custom properties in `src/index.css`
- Cohere semantic colors available: `cohere-coral`, `cohere-action-blue`, `cohere-deep-green`, `cohere-dark-navy`, `cohere-form-focus`
- Cohere border radius tokens: `rounded-cohere-xs` (4px) through `rounded-cohere-pill` (32px)
- Primary CTAs use pill shape (`rounded-cohere-pill`), near-black on light surfaces
- UI surfaces stay flat — no heavy drop shadows. Depth from surface alternation and thin borders.

## Key Conventions

### Component Development
- Feature-based organization: pages contain their own components in subdirectories
- Shadcn UI components are fully integrated and ready to use
- Follow established patterns for lists, forms, and detail views
- Components >300 lines should be split into focused sub-components

### State Management
- Use RTK Query for all API interactions (no direct fetch/axios calls except in `lib/auth.ts`)
- Use Redux slices only for complex client state
- Implement proper tag-based cache invalidation for mutations using typed `{type, id}` objects
- Use optimistic updates (`onQueryStarted`) for status changes in PM mutations

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:3600/api/v1
VITE_SUPABASE_URL=                 # Required for direct Supabase auth/session handling
VITE_SUPABASE_PUBLISHABLE_KEY=     # Required publishable key
```

### Type Safety
- Strict TypeScript mode enabled
- Define types in `src/types/` directory (one file per domain)
- No duplicate type definitions across files
- Use Zod schemas from feature `validations.ts` files for form validation
- RTK Query provides full type safety for API responses

## Important Notes

- The backend API must be running and CORS configured to allow the dev server origin
- Admin users have access to all features, agents are restricted to their assigned properties/users
- All Shadcn UI components are installed and ready to use
- The application includes comprehensive error handling and loading states
- The `axios` package has been removed — RTK Query (`fetchBaseQuery`) is the only HTTP client
