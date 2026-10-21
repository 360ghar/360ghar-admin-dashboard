# Non-PM route state checklist

This checklist covers every non-PM route declared in `src/App.tsx`. A route with no read request has no loading or empty data state. For data routes, the review checks initial loading, request failure with retry, empty data, and background refresh.

| Route | State and remaining gap |
| --- | --- |
| `/`, `/agents/dashboard`, `/visits/manage`, `/bookings/manage` | Redirects. The destination route owns its data states. |
| `/login`, `/signup`, `/auth/callback`, `/forgot-password` | Auth forms and callback handle loading and failures, retain entered values, and restore the requested route after login. Focused tests pass. A live OAuth browser smoke check remains. |
| `/access-denied`, `*` | Static error pages; no read request. |
| `/profile` | Uses verified session data. Save and upload errors are shown. |
| `/users/preferences` | Profile request has loading and error/retry states. |
| `/users/profile` | Profile request has loading and error/retry states. Assigned-agent lookup failures show retry; 404 means no agent is assigned. |
| `/dashboard` | Independent KPI, trend, property, and activity panels handle loading and partial errors. |
| `/properties` | List has loading, error/retry, empty, and current-query data handling. |
| `/properties/new`, `/properties/:id` | Form has mutation errors; edit uses current-query data and refresh error. Amenity lookup failures show retry. |
| `/properties/:id/view` | Detail has loading, error/retry, and missing-property states. |
| `/users`, `/users/:id` | List and detail have loading, error/retry, and empty states. The list scopes its cursor to the account and role; failed count requests show `—` instead of zero. |
| `/agents/me` | Profile and performance metrics each show loading and error/retry states. |
| `/visits` | List and manage view use account-scoped cursors and current-query data with loading, error/retry, and empty states. Manage view only retries its active query; failed counts show `—`. |
| `/visits/new` | User and property lookup failures show retry controls. An empty property result is explained. |
| `/visits/:id` | Detail has loading, error/retry, and missing-visit states. |
| `/bookings` | List has loading, error/retry, and empty states; count errors show `—`. Manage view uses current-query data and mutation tags; failed counts show `—`. |
| `/bookings/:id` | Detail has loading, error/retry, and missing-booking states. |
| `/swipes` | Recommendation deck has loading, error/retry, and empty states. Swipe invalidation refreshes property search without refreshing the active deck. |
| `/agents` | List uses current-query data with loading, error/retry, and empty states. Auto-assign shows lookup errors with retry. Workload and agent lookups follow `next_cursor` through every page. |
| `/agents/new`, `/agents/:id`, `/agents/:id/stats` | Form and stats detail have loading and error/retry states; create has mutation error. |
| `/analytics` | KPI and workload requests have separate loading and error/retry states; empty workload is explained. |
| `/flatmates/moderation`, `/flatmates/reports` | Queues use current-query data and have loading, error/retry, and empty states. |
| `/bug-reports` | List uses current-query data with loading, error/retry, and empty states. Failed count requests show `—`. |
| `/blogs` | List uses current-query data with loading, error/retry, and empty states. Background failure keeps the current page and shows retry. |
| `/blogs/new` | Editor shows category/tag lookup errors with retry; create error is shown. |
| `/blogs/:identifier` | Detail keeps current-query content during refresh and shows a refresh error/retry. Initial loading and missing-post states are distinct. |
| `/blogs/:identifier/edit` | Edit has loading, error/retry, and missing-post states. Category/tag lookup failures show retry. |
| `/blogs/categories`, `/blogs/tags` | Lists keep data during background refresh; request errors show retry and empty data is distinct. |
| `/pages`, `/faqs`, `/app-updates` | Paginated lists use current-query data with loading, error/retry, and empty states. |
| `/notifications` | Composer mutation errors are shown. Optional agent lookup errors show retry. |

The live OAuth smoke check is the remaining gap. All listed routes also use the shared route error boundary and lazy-load fallback.
