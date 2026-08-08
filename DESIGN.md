---
version: alpha
name: 360Ghar Command Center
description: Dark-first command-center UI for the 360Ghar Admin + Agent Portal. Built on shadcn/ui tokens (CSS custom properties) with a retained light variant, glass surfaces, and ReactBits motion. Dark is the default surface; light remains available via the theme toggle.
colors:
  background: "#08080d"
  foreground: "#eaeaef"
  card: "#101013"
  popover: "#121216"
  primary: "#f4f4f8"
  primary-foreground: "#0d0d12"
  secondary: "#1c1c22"
  muted: "#19191f"
  muted-foreground: "#9797a6"
  accent: "#202027"
  destructive: "#f2514c"
  border: "#25252c"
  ring: "#4f8df5"
  glass-bg: "#17171c"
  glass-border: "#2e2e38"
  coral: "#ff7a5c"
  action-blue: "#4f8df5"
  deep-green: "#14453d"
  dark-navy: "#102333"
  form-focus: "#a477bc"
  light-background: "#ffffff"
  light-foreground: "#212121"
  light-primary: "#17171c"
  light-border: "#e5e7eb"
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  heading:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.71
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 8px
  lg: 8px
  cohere-xs: 4px
  cohere-sm: 8px
  cohere-md: 16px
  cohere-lg: 22px
  cohere-xl: 30px
  cohere-pill: 32px
  full: 9999px
spacing:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section: 80px
  base: 8px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.cohere-pill}"
    padding: 12px 24px
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    borderColor: "{colors.border}"
  glass-panel:
    backgroundColor: "{colors.glass-bg}"
    borderColor: "{colors.glass-border}"
    rounded: "{rounded.cohere-md}"
  kpi-stat:
    typography: "{typography.display}"
    textColor: "{colors.foreground}"
  page-title:
    typography: "{typography.heading}"
    textColor: "{colors.foreground}"
---

# 360Ghar Command Center — Design System

> **Origin note:** this file supersedes the earlier Cohere design specification that was
> installed via `npx getdesign@latest add cohere`. The Cohere spec remains recoverable by
> re-running that command or from git history (commit `193f7b4`). This document describes the
> design system **as implemented** in this repository and is the authoritative source for
> anyone (human or AI agent) styling or building UI here.

## Overview

The 360Ghar Admin + Agent Portal is a **command center**: a dense, dark, glassy operations
console for managing a real-estate platform (properties, users, bookings, visits, PM,
blog, flatmates moderation). The UI ships **dark by default** — near-black space surfaces
(`--background: hsl(240 14% 4%)`) with off-white ink, thin hairlines, and a restrained
blue/coral accent pair. A **light variant** remains fully supported through the theme toggle
(next-themes, class strategy; `public/theme.js` sets the theme pre-paint so there is never a
flash of the wrong theme).

Visual personality: *measured enterprise, subtly futuristic*. Depth comes from surface
alternation and glass, not heavy shadows. Motion is deliberate and informative: scroll
reveals (FadeContent), animated KPI counts (CountUp), split-text headlines (SplitText),
3D tilt cards (TiltedCard), and a WebGL particle ambient background on the auth screens and
dashboard hero. **Every animation degrades gracefully under `prefers-reduced-motion`** — the
final state renders instantly and no canvases mount.

## Colors

The palette is rooted in high-contrast neutrals with a single dominant accent (action blue)
and a warm coral used for editorial/warning markers (Cohere lineage: coral taxonomy chips,
blue links, deep green/navy reserved for brand moments).

### Dark (default)

| Token | Value | Role |
|---|---|---|
| `--background` | `hsl(240 14% 4%)` `#08080d` | Page canvas — deep space |
| `--foreground` | `hsl(240 12% 93%)` `#eaeaef` | Off-white primary ink |
| `--card` | `hsl(240 12% 7%)` `#101013` | Card surface (glass base) |
| `--popover` | `hsl(240 12% 8%)` `#121216` | Menus, dropdowns, dialogs |
| `--primary` | `hsl(240 12% 96%)` `#f4f4f8` | White pill CTA fill |
| `--primary-foreground` | `hsl(240 14% 6%)` `#0d0d12` | Near-black text on white CTA |
| `--secondary` / `--muted` | `hsl(240 10% 12%)` / `hsl(240 10% 11%)` | Raised/inset neutral surfaces |
| `--muted-foreground` | `hsl(240 8% 62%)` `#9797a6` | Metadata, captions, placeholders |
| `--accent` | `hsl(240 10% 14%)` | Hover/selected surface |
| `--destructive` | `hsl(6 92% 62%)` `#f2514c` | Destructive actions (bright on dark) |
| `--border` / `--input` | `hsl(240 10% 16%)` | Hairlines, input outlines |
| `--ring` | `hsl(218 77% 62%)` `#4f8df5` | Focus ring (action blue) |
| `--glass-bg` | `hsl(240 12% 10%)` `#17171c` | Glass panel fill |
| `--glass-border` | `hsl(240 10% 20%)` `#2e2e38` | Glass panel edge |

Cohere semantic accents (dark): `--cohere-coral` `#ff7a5c`, `--cohere-action-blue` `#4f8df5`,
`--cohere-deep-green` `#14453d`, `--cohere-dark-navy` `#102333`, `--cohere-form-focus` `#a477bc`,
`--cohere-hairline` `hsl(240 8% 20%)`.

### Light (retained variant)

`--background` `#ffffff` (canvas white), `--foreground` `#212121` (ink), `--primary` `#17171c`
(near-black pill CTA), `--secondary`/`--muted` `#eeece7` (soft stone), `--muted-foreground`
`#93939f`, `--border` `#e5e7eb`, `--ring` `#4c6ee6`, `--destructive` `#b30000`, `--glass-bg`
`hsl(240 10% 98%)`, `--glass-border` `hsl(240 8% 88%)`. All components read from the same
CSS variables, so the variant switch is automatic (`:root` vs `.dark` in `src/index.css`).

## Typography

Two-family split: **Space Grotesk** for display/headlines (technical, geometric, slightly
monospaced in spirit), **Inter** for body and UI copy. Loaded via Google Fonts in
`src/index.css` (`Inter` 100–900, `Space Grotesk` 400–700).

| Role | Font | Size | Weight | Line height | Notes |
|---|---|---:|---:|---:|---|
| Display (KPIs, hero numbers) | Space Grotesk | 24–30px | 600 | 1.2 | CountUp-animated stats |
| Heading (page titles) | Space Grotesk | 24px | 600 | 1.3 | PageHeader titles (SplitText on some pages) |
| Body | Inter | 16px | 400 | 1.5 | Default copy |
| Body small | Inter | 14px | 400 | 1.4 | Table cells, forms |
| Button | Inter | 14px | 500 | 1.71 | Pill CTAs |
| Caption / meta | Inter | 12px | 400 | 1.4 | Muted metadata, mono-ish labels |

## Layout

- **Shell**: fixed left sidebar (desktop) / bottom nav with `safe-area-inset-bottom`
  padding (mobile), sticky TopBar with global search, notifications, theme toggle, and the
  ⌘K command palette. Content scrolls inside `#main-content` — **this element is the scroll
  container for scroll-triggered animations** (SplitText/FadeContent resolve it).
- **Grid**: 8px spacing rhythm (`xs 6 / sm 8 / md 12 / lg 16 / xl 24 / xxl 32`), content
  container `max-width: 1400px` centered with 2rem padding. KPI rows use responsive grids
  (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`).
- **Lists**: `<ResponsiveDataTable>` renders a real table on desktop and **card view on
  mobile** — every list page must pass `mobileCardRender` (or the default card renderer
  handles all-but-actions cells) so action buttons survive the mobile breakpoint.
- **Forms**: two-column rows on desktop, stacked single column on mobile; Zod + RHF
  validation with server-error mapping.

## Elevation & Depth

Mostly **flat** — hierarchy comes from surface alternation and 1px hairlines, never drop
shadows. The exceptions, all defined in `src/index.css`:

- **`.card-glow`** — the single shared card elevation: a faint 1px inset top highlight
  (`hsl(0 0% 100% / 0.04)`) plus a soft blue-tinted ambient shadow
  (`0 12px 32px -16px hsl(218 77% 62% / 0.14)` and `0 4px 16px -8px rgb(0 0 0 / 0.45)`).
  Used on glass/hero cards. Never stack it with an additional 1px ring.
- **Glass surfaces** — `background: hsl(var(--glass-bg) / 0.6)` + `backdrop-blur` +
  `border: 1px solid hsl(var(--glass-border) / 0.6)` (see `glass-panel` token). Used for
  auth cards, floating headers, and overlays.
- Thin custom scrollbars (`scrollbar-width: thin`, muted-foreground thumb).

## Shapes

Base radius `--radius: 0.5rem` drives shadcn (`lg` 8px, `md` 6px, `sm` 4px). The Cohere
scale remains available: `rounded-cohere-xs` 4px, `-sm` 8px, `-md` 16px, `-lg` 22px,
`-xl` 30px, `-pill` 32px, `full` 9999px. **Primary CTAs are pills** (`rounded-cohere-pill`);
cards are 8–16px; media/hero cards 22px.

## Components

### shadcn/ui primitives

Button, Card, Dialog, DropdownMenu, Sheet, Tabs, Table, Input, Select, Badge, Skeleton,
Toast, etc. (new-york style) — all mapped to the CSS-var tokens above. `sheet.tsx` and all
motion usage import from **`motion/react`** (motion.dev), never `framer-motion`.

### Glass & card patterns

- `AuthBrandingPanel` / `AuthCardLayout` — glass panels with the ambient WebGL background
  behind the auth screens (login, signup, forgot password).
- Error pages (`AccessDeniedPage`, `NotFoundPage`) — glass panel + `GlitchText` headline
  with a static fallback under reduced motion.
- `ProfilePage` — glass cells; avatars use `ring-2 ring-background` instead of shadows.

### ReactBits motion catalog

Vendored from [reactbits.dev](https://reactbits.dev) (MIT, `DavidHDev/react-bits`) into
`src/components/reactbits/` — **every file carries the MIT attribution header; never remove
it.** Import only from `@/components/reactbits/<Name>`.

| Component | Usage sites | Treatment |
|---|---|---|
| `FadeContent` (21) | Most list/detail pages (blogs, bookings, visits, properties, users, PM dashboard/audit, swipes, flatmates, forms) | Scroll-triggered fade/slide reveal; reduced-motion → render final state immediately |
| `CountUp` (8) | `StatCard`, `AgentStats`, `AgentProfilePage`, `PropertyQuickStats`, `UsersPage`, `PmExpensesPage`, `PmReportsPage`, `PmOwnerDetailPage`, `PmRentLedgerPage`, `PmPropertyDetailPage` | KPI count-up; pass `format` for `formatCurrency`/`formatNumber`; reduced-motion → final value, no recount |
| `SplitText` (4) | `PageHeader` (top-of-page titles), `BlogDetail`, `AuthBrandingPanel`, `AuthCardLayout` | Word-split headline animation; resolves the `#main-content` scroller; carries `aria-label={text}` |
| `TiltedCard` (4) | `BookingCard`, `VisitCard`, `ModerationListingCard`, `PropertyDetail` | Subtle 3D tilt on hover; mouse handlers gated by reduced motion |
| `ShinyText` (3) | `AuthBrandingPanel`, `AuthCardLayout`, `EmptyState` | Shimmering accent label |
| `GlitchText` (2) | `AccessDeniedPage`, `NotFoundPage` | Glitch headline; static fallback under reduced motion |
| `ambient-background` (2) | `AuthBrandingPanel`, `DashboardPage` | Lazy WebGL particle canvas; probes WebGL2/WebGL support and falls back to a static gradient (no canvas, no rAF) when unsupported or reduced motion |
| `BlurText` (1) | `SwipeCard` | Blur-in text with `aria-label` |
| `Magnet` (1) | `QuickActions` | Magnetic hover on quick-action tiles |
| `GradientText` (1) | `SidebarContent` | Brand wordmark gradient |

The remaining ~25 vendored files (`Aurora`, `Beams`, `AnimatedList`, `Carousel`, `Dock`,
`MagicBento`, `Orb`, `Particles`, `Threads`, `Topography`, `ProfileCard`, `Stepper`,
`BounceCards`, `CardSwap`, `GlareHover`, `TextLoop`, `RotatingText`, `MaskedHeading`,
`DecryptedText`, `SpotlightCard`, `AnimatedContent`, `Counter`, `Noise`, `ClickSpark`,
`BorderGlow`, `Folder`) are kept for future use with attribution but are **not imported —
zero bundle impact** (verified against `dist/`). Prefer these before writing new
animations; if a new one is needed, vendor it from reactbits.dev and keep the MIT header.

### Motion & accessibility rules (non-negotiable)

1. **Reduced motion**: every animated component must render its final state when
   `prefers-reduced-motion` is set (`CountUp`, `FadeContent`, `TiltedCard`,
   `ambient-background`, `GlitchText` handle this internally). A global CSS guard in
   `index.css` collapses durations to 0.01ms as a backstop.
2. **Text animations**: `SplitText` and `BlurText` always receive `aria-label={text}` so
   screen readers announce the full string, never per-character.
3. **Scroll triggers**: scroll-triggered effects must target the app's real scroller —
   `document.getElementById('main-content')` — not `window`.
4. **WebGL**: capability-check before mounting WebGL canvases; static gradient fallback.
5. **Attribution**: vendored files keep their MIT headers; no new `framer-motion` imports —
   use `motion/react`.

## Per-page treatment map

| Area | Treatment |
|---|---|
| Auth (login/signup/forgot) | Glass panels + ambient background + SplitText/ShinyText branding |
| Shell (TopBar/Sidebar/BottomNav) | Glass TopBar, GradientText wordmark, ⌘K palette |
| Dashboard | ambient hero + CountUp KPIs (`StatCard`) + FadeContent quick actions |
| Agents, Users, Blog, Bookings, Visits, Properties, Flatmates, Swipes | FadeContent page reveals; CountUp stats; TiltedCard list cards; BlurText swipe cards; SplitText detail titles |
| PM portal | FadeContent on dashboards; CountUp on money/stats pages (currency-formatted) |
| Error pages | GlitchText headlines on glass panels |

## Do's and Don'ts

- Do design dark-first; verify the light variant still reads correctly via the toggle.
- Do use `CountUp` for KPI numbers (with `format`), `FadeContent` for scroll reveals, and
  `SplitText` for page titles — that is the house motion vocabulary.
- Do keep surfaces flat: 1px hairlines and `.card-glow` instead of heavy shadows.
- Do use coral and action blue sparingly (accents), never as broad surface fills.
- Do pass `mobileCardRender` to `<ResponsiveDataTable>` so mobile card views keep actions.
- Don't import `framer-motion` (migrate to `motion/react`).
- Don't strip MIT headers from `src/components/reactbits/*`.
- Don't add animated components without a reduced-motion path.
- Don't use gradients as generic UI fills — reserve them for media/hero moments.
- Don't mix radius scales in one view (8px cards + 22px media is the intended pairing).
