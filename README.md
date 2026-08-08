# 360Ghar Admin + Agent Portal

A comprehensive Admin + Agent dashboard for the 360Ghar real estate and short stays booking platform. Built with React, TypeScript, and modern UI libraries, this portal allows Admins to manage the entire system while Agents act as sub-admins managing their assigned users and properties.

## Goal
Admins can manage the full platform (properties, users, bookings, reports, settings). Agents act as sub-admins, with full permissions to manage the properties and users assigned to them (add/edit/delete/update). The frontend integrates with an existing FastAPI backend and Supabase for authentication and row-level security (RLS). File storage is handled by Cloudinary via the backend API.

## Tech Stack & Project Setup

**Framework**: React 18+ (using Vite for faster setup)
**UI Library**: Shadcn/ui (built on Radix UI and Tailwind CSS)
**Design System**: "Command Center" theme — dark-first glass UI, CSS custom property tokens (`src/index.css`), light variant retained
**Motion & Effects**: ReactBits (vendored from reactbits.dev, MIT) — FadeContent, CountUp, SplitText, TiltedCard, ambient background, etc.
**Theming**: next-themes (`class` strategy) with a pre-paint `public/theme.js` — dark by default, no flash-of-wrong-theme
**State Management**: Redux Toolkit (RTK) with RTK Query for efficient data fetching, caching, and state management
**Routing**: React Router DOM v6+
**Styling**: Tailwind CSS for utility-first, responsive design
**HTTP Client**: RTK Query (`fetchBaseQuery`) — the only HTTP client
**Authentication**: Supabase Auth (JWT via Bearer token)
**Type Safety**: TypeScript
**Form Handling**: React Hook Form + Zod for validation
**Icons**: Lucide React
**Charts**: Recharts for data visualization
**Map Integration**: Leaflet for property locations

### Installation & Setup

1. **Clone and Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your values:
   # VITE_API_BASE_URL=https://api.360ghar.com/api/v1
   # VITE_SUPABASE_URL=your-supabase-url
   # VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

3. **Install Cohere Design Specification**:
   ```bash
   npx getdesign@latest add cohere
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

### Project Structure
- `src/features/<domain>/`: Feature modules (api, components, pages, slices, validations)
- `src/components/layout/`: Sidebar, TopBar, DashboardLayout, BottomNav
- `src/components/ui/`: Shadcn UI components + EmptyState, LoadingState, DataTable
- `src/store/api.ts`: Base RTK Query API with auth
- `src/store/index.ts`: Store config (all 14 API modules registered)
- `src/types/`: TypeScript interfaces (api.ts, blog.ts)
- `src/lib/`: Utilities (config.ts, auth.ts, errors.ts, supabase.ts, utils.ts)
- `src/hooks/`: Custom React hooks

## Authentication & Authorization

### Login Flow
- User enters phone and password at `/login`
- Frontend signs in directly with Supabase Auth SDK
- Backend receives `Authorization: Bearer <supabase_access_token>` on protected routes
- User profile is loaded from backend `/users/profile/` after successful Supabase session
- Role inferred from `user.agent_id` (null = Admin, present = Agent)
- Redirect to dashboard on success

### Protected Routes
- `PrivateRoute`: Checks authentication status
- `RoleBasedRoute`: Enforces role-based access (admin/agent)
- Access denied redirects to `/access-denied`

### API Integration
- RTK Query handles authenticated requests with Bearer token headers
- Supabase SDK manages session persistence and refresh
- Auth slice manages user state derived from active Supabase session
- Logout signs out Supabase session, clears credentials, and redirects to login

## Core Features

### Dashboard
**Agent Dashboard**: Properties managed, active users, upcoming visits, pending bookings, satisfaction score
**Admin Dashboard**: System health metrics, user growth, booking trends, agent workload distribution

### Property Management
- **List View**: Search, filters, pagination
- **CRUD Operations**: Create/edit/delete properties
- **Features**: Media uploads, location picker, amenities selection
- **Role-Based**: Agents see only their assigned users' properties

### PM Portal (Property Management)
- **Dashboard**: Revenue, occupancy, activity feed
- **Owners & Properties**: Manage owners, properties, management settings
- **Leases & Rent**: Lease lifecycle, rent ledger, payment tracking
- **Operations**: Expenses, maintenance requests, documents, inspections
- **Applications**: Rental application forms and inbox
- **Reports**: Rent roll, income, expense, P&L, occupancy, maintenance reports
- **Settings**: Payment defaults, late fee policy, notification preferences

### User Management
- **List View**: Search and filter users
- **Profile Management**: View/edit user details
- **Agent Assignment**: Admins can assign/reassign agents to users
- **Role-Based**: Agents see only their assigned users

### Visit Management
- **Scheduling**: Create visits for users and properties
- **Actions**: Reschedule, cancel, mark as completed
- **Filtering**: By date, property, user, status

### Booking Management
- **List View**: Comprehensive booking overview
- **Actions**: Cancel, process payments, add reviews
- **Status Tracking**: Pending, confirmed, completed

### Agent Management (Admin Only)
- **CRUD Operations**: Create, edit, deactivate agents
- **Performance Stats**: KPIs, satisfaction scores, workload metrics
- **Assignment**: Manage user-agent relationships

### Flatmates Moderation (Admin Only)
- **Listing Queue**: Approve/reject/pause flatmate listings
- **Report Queue**: Review and action user reports

### Blog & Content (Admin Only)
- **Posts**: Create/edit blog posts with categories and tags
- **Categories & Tags**: Manage content taxonomy

### Analytics & Reporting (Admin Only)
- **System Metrics**: User growth, property trends, revenue
- **Agent Performance**: Leaderboards, completion rates
- **Charts**: Visual representations of key data

## Backend Integration

### Required Endpoints
- **Auth**: No backend login endpoint; clients authenticate directly with Supabase Auth SDK
- **Properties**: `GET/POST/PUT/DELETE /properties/`, `GET /properties/{id}/`, `POST /properties/search/`
- **Users**: `GET /users/`, `GET /users/{id}/`, `PUT /users/{id}/`, `POST /users/{id}/assign-agent/`
- **Visits**: `GET /visits/`, `POST /visits/schedule/`, `GET /visits/{id}/`, `POST /visits/{id}/reschedule`, `POST /visits/{id}/cancel`, `POST /visits/{id}/complete`
- **Bookings**: `GET /bookings/`, `GET /bookings/{id}/`, `POST /bookings/`, `POST /bookings/cancel/`, `POST /bookings/payment/`, `POST /bookings/review/`
- **Agents**: `GET /agents/`, `POST /agents/`, `GET/PUT /agents/{id}/`, `GET /agents/{id}/stats/`
- **Analytics**: `GET /agents/system/stats/`, `GET /agents/system/workload/`
- **Amenities**: `GET /amenities/`
- **Upload**: `POST /upload/`
- **Notifications**: `GET /notifications/`, `POST /notifications/{id}/opened/`, `POST /notifications/send/`
- **PM**: `GET/POST /pm/properties/`, `GET/POST /pm/leases/`, `GET/POST /pm/expenses/`, `GET/POST /pm/maintenance/`, `GET/POST /pm/documents/`, `GET/POST /pm/inspections/`, `GET /pm/reports/*`, `GET/POST /pm/applications/`, `GET/POST /pm/owners/`
- **Blog**: `GET/POST/PUT/DELETE /blog/posts/`, `GET/POST /blog/categories/`, `GET/POST /blog/tags/`
- **Flatmates**: `GET/PUT /flatmates/listings/`, `GET/PUT /flatmates/reports/`
- **Swipes**: `GET /swipes/`, `POST /swipes/`, `POST /swipes/undo/`
- **Core**: `POST /bugs/`, `GET/POST /pages/`, `GET/POST /app-updates/`

### Assumptions
- Backend enforces role-based access control
- Agents can only access data for their assigned users/properties
- CORS configured for frontend origin
- Supabase handles authentication; file storage is via Cloudinary through the backend API
- Row-level security (RLS) implemented in database

## Design System

The portal uses the **"Command Center"** design system — a dark-first, glassy operations
console look implemented with shadcn/ui tokens mapped to CSS custom properties in
`src/index.css` (Cohere-inspired accents; dark is the **default** surface, a full light
variant remains available via the theme toggle in the top bar).

- **Theme**: next-themes `class` strategy; `public/theme.js` applies the saved/preferred
  theme before React mounts (external file so the production CSP stays `script-src 'self'`).
- **Tokens**: `--background`/`--foreground`/`--card`/`--popover`/`--primary`/`--muted`/
  `--accent`/`--destructive`/`--border`/`--ring` (per-variant), Cohere accents
  (`cohere-coral`, `cohere-action-blue`, ...), and command-center glass tokens
  (`--glass-bg`, `--glass-border`, `.card-glow`).
- **Typography**: Space Grotesk (display) + Inter (body), loaded via Google Fonts.
- **Motion**: ReactBits components vendored into `src/components/reactbits/` (MIT
  attribution headers; ~10 used across pages: FadeContent, CountUp, SplitText, TiltedCard,
  ShinyText, GlitchText, ambient-background, BlurText, Magnet, GradientText). All animation
  respects `prefers-reduced-motion` (final state renders instantly; no WebGL canvas under
  reduced motion or without WebGL support).
- **A11y**: SplitText/BlurText carry `aria-label`; scroll-triggered effects target the
  `#main-content` scroller; motion imports use `motion/react` (no `framer-motion`).

See `DESIGN.md` for the full specification (tokens, component catalog, per-page treatment
map, do's and don'ts).

## Development Notes
- All API calls use RTK Query (no axios or direct fetch except in `lib/auth.ts`)
- TypeScript for type safety across the application
- Progressive enhancement with Shadcn UI components
- Responsive design with Tailwind CSS
- Form validation with Zod schemas (centralized per feature in `validations.ts`)
- Toast notifications for user feedback
- Empty/Loading states use `<EmptyState>` and `<LoadingState>` components
