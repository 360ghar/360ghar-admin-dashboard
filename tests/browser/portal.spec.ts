import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

type Role = 'admin' | 'agent'
type Theme = 'dark' | 'light'
interface FixtureState {
  failProperties?: boolean
  malformedProperties?: boolean
  propertyDelayMs?: number
  propertyFailureStatus?: number
  deleteStatus?: number
  profileStatus?: number
}

const screenshotDir = 'artifacts/screenshots'
const accountId = '00000000-0000-4000-8000-000000000042'

const property = {
  id: 42,
  title: 'Test Apartment',
  property_type: 'apartment',
  purpose: 'rent',
  status: 'available',
  base_price: 18000,
  city: 'Bengaluru',
  locality: 'Indiranagar',
  bedrooms: 2,
  bathrooms: 1,
  created_at: '2026-09-25T08:00:00Z',
}

async function installFixture(page: Page, role: Role, theme: Theme, state: FixtureState = {}) {
  const user = {
    id: 42,
    supabase_user_id: accountId,
    role,
    full_name: role === 'admin' ? 'Admin Test' : 'Agent Test',
    email: `${role}@360ghar.com`,
    is_active: true,
    is_verified: true,
    agent_id: role === 'agent' ? 7 : null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  await page.addInitScript(({ accountId: id, theme: selectedTheme }) => {
    const now = Math.floor(Date.now() / 1000)
    localStorage.setItem('theme', selectedTheme)
    localStorage.setItem('sb-test-auth-token', JSON.stringify({
      access_token: 'browser-test-access',
      refresh_token: 'browser-test-refresh',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user: {
        id,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@360ghar.com',
        app_metadata: {},
        user_metadata: {},
        created_at: '2026-01-01T00:00:00Z',
      },
    }))
  }, { accountId, theme })

  await page.route('https://test.supabase.co/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: accountId } }) })
  })

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const paged = (items: unknown[] = [], total?: number) => ({
      items, next_cursor: null, has_more: false, limit: 20, ...(total === undefined ? {} : { total }),
    })
    let status = 200
    let body: unknown = paged()
    if (path === '/users/profile') {
      status = state.profileStatus ?? 200
      body = status === 200 ? user : { error: { code: 'USER_ACCESS_DENIED', message: 'Access denied' } }
    }
    else if (path === '/amenities') body = paged()
    else if (path === '/properties') {
      if (state.propertyDelayMs) await new Promise((resolve) => setTimeout(resolve, state.propertyDelayMs))
      if (url.searchParams.get('include_total') === 'true') {
        body = paged([], url.searchParams.get('status') === 'available' ? 1 : 0)
      } else if (state.failProperties) {
        status = state.propertyFailureStatus ?? 503
        body = { error: { code: 'SERVICE_UNAVAILABLE', message: 'Property service unavailable' } }
      } else body = state.malformedProperties ? { items: null, has_more: false } : paged([property])
    } else if (path === '/properties/42' && route.request().method() === 'DELETE') {
      // A delete answers 204 with no body.
      status = state.deleteStatus ?? 204
      body = status === 204 ? null : { error: { code: 'PROPERTY_DELETE_BLOCKED', message: 'This property cannot be deleted now' } }
    } else if (path === '/agents/system/stats') body = {
      total_agents: 2, active_agents: 2, active_users: 12, properties_listed: 1,
      occupancy_rate: 50, total_bookings: 3, total_visits: 6, total_revenue: 54000,
      total_users_served: 12, system_satisfaction_score: 4.5,
      agents_by_type: {}, load_distribution: [],
    }
    else if (path === '/agents/7/stats') body = {
      id: 7,
      stats: { total_users_assigned: 4, user_satisfaction_rating: 4.5, active_conversations: 2, weekly_interactions: 9 },
    }
    else if (path === '/agents/system/workload') body = []
    if (status === 204) {
      await route.fulfill({ status })
      return
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })

  return state
}

for (const role of ['admin', 'agent'] as const) {
  for (const theme of ['dark', 'light'] as const) {
    for (const width of [1280, 768, 390]) {
      test(`${role} dashboard and properties at ${width}px in ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await installFixture(page, role, theme)
        await page.goto('/dashboard')
        await expect(page.getByRole('heading', { name: `${role === 'admin' ? 'Admin' : 'Agent'} Dashboard` })).toBeVisible()
        await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /light/)
        await page.goto('/properties')
        await expect(page.getByRole('heading', { name: 'All Properties' })).toBeVisible()
        await expect(page.getByText('Test Apartment').first()).toBeVisible()
        if (width === 390) {
          await expect(page.getByRole('button', { name: 'Delete property' })).toBeVisible()
          await expect(page.getByRole('checkbox', { name: 'Select property' })).toBeVisible()
        }
        if ((role === 'admin' && theme === 'dark' && width === 1280) ||
            (role === 'agent' && theme === 'light' && width === 390)) {
          mkdirSync(screenshotDir, { recursive: true })
          await page.screenshot({ path: `${screenshotDir}/${role}-${theme}-${width}.png`, fullPage: true })
          if (width === 390) {
            await page.getByText('Test Apartment').first().scrollIntoViewIfNeeded()
            await page.screenshot({ path: `${screenshotDir}/${role}-${theme}-${width}-card.png` })
          }
        }
      })
    }
  }
}

test('property failure shows recovery and offline status', async ({ page, context }) => {
  await page.setViewportSize({ width: 768, height: 900 })
  const state = await installFixture(page, 'admin', 'dark', { failProperties: true })
  await page.goto('/properties')
  await expect(page.getByText('Failed to load properties')).toBeVisible({ timeout: 20_000 })
  mkdirSync(screenshotDir, { recursive: true })
  await page.screenshot({ path: `${screenshotDir}/properties-error-tablet.png`, fullPage: true })
  state.failProperties = false
  await page.getByRole('button', { name: /try again|retry/i }).last().click()
  await expect(page.getByText('Test Apartment').first()).toBeVisible()
  await context.setOffline(true)
  await expect(page.getByText(/offline.*data may be stale/i)).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/properties-offline-tablet.png`, fullPage: true })
  await context.setOffline(false)
})

test('failed focus refresh keeps current property rows visible', async ({ page }) => {
  const state = await installFixture(page, 'admin', 'dark', { failProperties: false, propertyFailureStatus: 400 })
  await page.goto('/properties')
  await expect(page.getByText('Test Apartment').first()).toBeVisible()
  state.failProperties = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText(/Refresh failed. Showing the last result/)).toBeVisible()
  await expect(page.getByText('Test Apartment').first()).toBeVisible()
})

test('resource permission failure rechecks staff access without logging out an active staff member', async ({ page }) => {
  const state = await installFixture(page, 'admin', 'dark', { propertyFailureStatus: 403 })
  await page.goto('/properties')
  await expect(page.getByText('Test Apartment').first()).toBeVisible()
  state.failProperties = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText(/Refresh failed. Showing the last result/)).toBeVisible()
  await expect(page).toHaveURL(/\/properties/)
})

test('revoked staff access clears visible records after a resource permission failure', async ({ page }) => {
  const state = await installFixture(page, 'admin', 'dark', { propertyFailureStatus: 403 })
  await page.goto('/properties')
  await expect(page.getByText('Test Apartment').first()).toBeVisible()
  state.profileStatus = 403
  state.failProperties = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Test Apartment')).toHaveCount(0)
})

test('dirty property form blocks in-app navigation until confirmed', async ({ page }) => {
  await installFixture(page, 'admin', 'dark')
  await page.goto('/properties/new')
  await page.getByRole('textbox', { name: 'Title' }).fill('Unsaved apartment')
  page.once('dialog', async (dialog) => { await dialog.dismiss() })
  await page.getByRole('link', { name: 'All Properties' }).first().click()
  await expect(page).toHaveURL(/\/properties\/new/)

  page.once('dialog', async (dialog) => { await dialog.accept() })
  await page.getByRole('link', { name: 'All Properties' }).first().click()
  await expect(page).toHaveURL(/\/properties$/)
})

test('slow results keep a visible loading state', async ({ page }) => {
  await installFixture(page, 'admin', 'dark', { propertyDelayMs: 900 })
  await page.goto('/properties')
  await expect(page.locator('#main-content .animate-pulse').first()).toBeVisible()
  await expect(page.getByText('Test Apartment').first()).toBeVisible({ timeout: 20_000 })
})

test('malformed property response shows retry instead of empty results', async ({ page }) => {
  const state = await installFixture(page, 'admin', 'dark', { malformedProperties: true })
  await page.goto('/properties')
  await expect(page.getByText('Failed to load properties')).toBeVisible()
  state.malformedProperties = false
  await page.getByRole('button', { name: /try again|retry/i }).last().click()
  await expect(page.getByText('Test Apartment').first()).toBeVisible()
})

test('saved amenity filter waits for names before requesting property rows', async ({ page }) => {
  await installFixture(page, 'admin', 'dark')
  await page.addInitScript((id) => {
    localStorage.setItem(`360ghar:v1:filters_properties:account:${id}`, JSON.stringify({ amenities: [1] }))
  }, accountId)
  // The amenities read sends `limit=100` (it follows next_cursor), so the pattern must allow a query string.
  await page.route(/\/api\/v1\/amenities(\?.*)?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700))
    // The amenities route is a CursorPage.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{ id: 1, title: 'Balcony' }], next_cursor: null, has_more: false, limit: 20, total: null }),
    })
  })
  const listRequests: URL[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname === '/api/v1/properties' && url.searchParams.get('include_total') !== 'true') listRequests.push(url)
  })
  await page.goto('/properties')
  await expect(page.getByText('Test Apartment').first()).toBeVisible()
  expect(listRequests.length).toBeGreaterThan(0)
  expect(listRequests.every((url) => url.searchParams.getAll('amenities').includes('Balcony'))).toBe(true)
})

test('mobile property actions stay reachable at 200 percent text size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await installFixture(page, 'agent', 'light')
  await page.goto('/properties')
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
  const deleteButton = page.getByRole('button', { name: 'Delete property' })
  await deleteButton.scrollIntoViewIfNeeded()
  await expect(deleteButton).toBeVisible()
  mkdirSync(screenshotDir, { recursive: true })
  await page.screenshot({ path: `${screenshotDir}/property-text-zoom-390.png` })
  const mainOverflow = await page.locator('#main-content').evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(mainOverflow).toBeLessThanOrEqual(2)
  const navLabelsOverlap = await page.getByRole('navigation', { name: 'Mobile navigation' }).evaluate((element) => {
    const labels = [...element.querySelectorAll('span')].map((label) => label.getBoundingClientRect())
    return labels.some((label, index) => index > 0 && label.left < labels[index - 1].right - 1)
  })
  expect(navLabelsOverlap).toBe(false)
})

test('failed delete stays open and can be retried by keyboard', async ({ page }) => {
  const state = await installFixture(page, 'admin', 'dark', { deleteStatus: 422 })
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/properties')
  const deleteButton = page.getByRole('button', { name: 'Delete property' })
  await deleteButton.scrollIntoViewIfNeeded()
  await deleteButton.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(dialog.getByRole('alert')).toContainText('This property cannot be deleted now')
  state.deleteStatus = 204
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(dialog).not.toBeVisible()
})

test('permission failure does not use cached profile for access', async ({ page }) => {
  await installFixture(page, 'admin', 'dark', { profileStatus: 403 })
  await page.goto('/properties')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Test Apartment')).toHaveCount(0)
})

test('expired API session returns to login without property rows', async ({ page }) => {
  await installFixture(page, 'admin', 'dark', { failProperties: true, propertyFailureStatus: 401 })
  await page.goto('/properties')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Test Apartment')).toHaveCount(0)
})
