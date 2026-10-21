# Portal state and request handling

Use this guide when you add or change a portal feature. The route audits are in [NON_PM_STATE_CHECKLIST.md](./NON_PM_STATE_CHECKLIST.md) and [PM_STATE_CHECKLIST.md](./PM_STATE_CHECKLIST.md).

## State owners

| State | Owner | Rule |
| --- | --- | --- |
| Login session and token | Supabase Auth | Do not copy the token to browser storage outside the Supabase client. |
| Server records and request status | RTK Query | Use the shared `api` instance and endpoint tags. Do not persist the API slice. |
| Verified staff profile | Auth slice | The backend profile must match the current Supabase user ID and have an active admin or agent role. |
| Owner selection | PM slice | Keep the selected owner until the user changes it or an authoritative access check rejects it. Search results do not grant or revoke access. |
| Filters and view preferences | Local component state and guarded storage | Scope personal values to the account. Scope owner-specific values to the owner when needed. |
| Form input | React Hook Form | Keep dirty values during a background refresh. Do not store sensitive drafts. |

## Request and cache policy

The shared API calls `setupListeners(store.dispatch)` and enables focus and reconnect refetch. It also refetches a mounted query when its last result is at least 60 seconds old. Query cache retention is not a freshness check. The RTK Query default retention is 60 seconds after the last subscriber leaves; the system stats and PM dashboard endpoints retain data for 300 seconds. Active queries refetch on focus or reconnect. A mutation invalidates its affected list, detail, dashboard, report, or related tags. Add an invalidation test when a mutation changes records shown in another feature.

GET requests have a 15 second timeout and a bounded retry for network errors and server errors. Authentication and permission errors do not retry. Mutations do not retry automatically because a timeout does not prove that a payment, upload, or delete failed on the server. The user must start another attempt. There is no offline mutation queue.

Use `currentData` for a list or detail view that can change account, owner, or query parameters. This keeps rows from an old scope out of the next scope. Show a layout skeleton when the current scope has no usable data. During a background request for the same scope, keep visible data and show progress. If that request fails, label the visible data as stale and offer Retry. A request error must not appear as an empty list or a zero metric.

## Session boundary

On sign-in or session restoration, verify the backend profile against the Supabase account ID. A 401, 403, 404, inactive staff account, or mismatched profile closes access. A temporary backend or network failure keeps a pending Supabase session, but protected routes stay closed until verification succeeds. Once verified, the staff profile is checked again after token refresh, on focus when the last check is at least 60 seconds old, and after a resource 403. A temporary recheck failure keeps the established session; an authoritative denial clears access. A resource 403 alone does not revoke the session because it may deny only one resource. The 24 hour cached profile contains only the account ID, backend ID, and display name. It is a display hint and never grants a role.

Logout, account change, and permission change reset the RTK Query cache and the selected PM owner. Session version checks stop an old in-flight response or retry from entering a new session. A 401 clears the active session once. Account and owner scope keys prevent saved filters and rows from crossing users.

## Browser storage

Use `readJSON`, `readVersionedJSON`, `writeJSON`, `writeVersionedJSON`, `removeStored`, and `scopedStorageKey` from `src/lib/storage.ts`. These functions handle blocked or full storage. Validate every restored value. Remove invalid or expired values. Do not read the old global `user`, `pm_selected_owner`, or `notifications_local` keys.

| Stored value | Scope and format | Content limit |
| --- | --- | --- |
| Theme | Browser preference through the existing theme provider | Theme name only. |
| Sidebar | Existing guarded preference key | Collapsed or expanded state only. |
| Page size, filters, table view, visible columns | Versioned account key or validated account key | Allowed sizes, filter primitives, view name, and column booleans only. |
| PM owner selection | Versioned account key | Owner ID and label only; backend still checks access. |
| Cached profile | Versioned account key, 24 hour expiry | ID, account ID, display name only. |
| Local notifications | Versioned account key, 7 day expiry | Safe local categories and display text; no arbitrary payload or transaction data. |

Do not add KYC files, financial records, signed URLs, API responses, request bodies, or extra token copies to custom browser storage. Use a version change and a validator when a preference format changes. The precedence is: explicit route URL state, then a valid saved preference, then a code default. Search terms that can contain personal data must stay out of shareable URLs. The existing list filters use local state and account-scoped storage; only the explicit booking and visit view mode uses a route query parameter.

## Page state checklist

For each list and detail route, check these conditions before review:

1. Initial load has a skeleton with similar size to the loaded content. A background refresh leaves current-scope data visible and shows progress.
2. Empty data, filtered no-results, missing record, and permission denial have different text and the correct create, clear, return, or retry action.
3. A request failure shows `ErrorState` and Retry. Partial dashboard failures keep successful widgets visible and mark unknown values as unknown.
4. A mutation shows progress, blocks duplicate submission, maps server validation with `applyServerValidation`, and keeps form values after failure.
5. The error boundary can reset after navigation. The dashboard shell stays visible while a lazy route loads.

## Tables and forms

Give each table a stable record ID. Control selection in the page, and clear it when the account, owner, query, or page changes. Keep every permitted action on mobile cards. The main lists save visible-column choices per account; action and selection columns always stay visible. The API sorts a cursor-paged list; avoid a header sort that changes only the current page. Label a CSV export as **current page** unless it fetches every page. The dashboard scroller stores scroll position by account, path, and search. A new route starts at the top; a revisited route restores its prior position. Preserve list filters in account-scoped storage so returning from a detail view restores the list context.

Use `ConfirmAlertDialog` for destructive actions. Its async handler must reject on failure so the dialog stays open with the error. For a partial bulk failure, retain only failed IDs for the next attempt. Upload flows must validate files before transfer and preserve successful uploads when a later step fails. Image uploads show status per file, allow failed files to retry, and abort active requests on cancellation. A server may still finish an upload before cancellation reaches it; any URL already returned remains in the form. Image reordering supports drag and arrow keys, and removing the primary image selects a remaining image. Use React Hook Form and feature Zod schemas for substantial forms. A detail refetch must not reset a dirty form; reset when the record identity changes. Guard browser exit, links, history navigation, programmatic routing, and logout while there are unsaved changes. There is no persistent form-draft feature because sensitive fields are not approved for it.

Wait for image uploads before submitting a property or blog form. Lock editable controls while the save request is pending. Property saves send the ordered `image_urls` list with the primary image first. Keep floor-plan images out of that list because the backend preserves them separately.

## Add a feature

1. Register endpoints on the shared API and define list, detail, and related invalidation tags.
2. Define the account and owner scope of queries, selection, filters, and any saved preference.
3. Add loading, refresh, empty, error, permission, missing-record, and mutation states.
4. Add stable table IDs or a validated form, then test scope changes and failed mutations.
5. Update the route checklist and run type checks, lint, unit tests, build, and browser checks when the feature affects navigation or key workflows.
