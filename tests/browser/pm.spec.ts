import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// Browser checks for the PM screens. Every `/api/v1` call is mocked: nothing reaches a real backend.

const screenshotDir = 'artifacts/screenshots'
const accountId = '00000000-0000-4000-8000-000000000042'

interface Seen {
  method: string
  path: string
  query: URLSearchParams
  body: unknown
}

const owner = {
  id: 20,
  role: 'user',
  full_name: 'Asha Rao',
  is_active: true,
  is_verified: true,
  agent_id: null,
  created_at: '2026-01-01T00:00:00Z',
}

const flat = { id: 5, owner_id: 20, title: 'Sea View Flat', purpose: 'rent', property_type: 'apartment', base_price: 25000, monthly_rent: 25000, management_status: 'active', payment_due_day: 1, grace_period_days: 5 }
const villa = {
  id: 6,
  owner_id: 20,
  title: 'Hill Villa',
  purpose: 'rent',
  property_type: 'villa',
  base_price: 90000,
  monthly_rent: 90000,
  management_status: 'active',
  payment_due_day: 5,
  grace_period_days: 3,
  late_fee_policy: { type: 'fixed', amount: 750 },
}

const payment = (id: number, status: 'pending' | 'settled') => ({
  id,
  charge_id: 40 + id,
  lease_id: 6,
  property_id: 5,
  owner_id: 20,
  paid_at: '2026-10-02T10:00:00Z',
  amount_paid: 500,
  status,
  payment_method: 'upi',
  created_at: '2026-10-02T10:00:00Z',
})

const page_ = (items: unknown[] = []) => ({ items, next_cursor: null, has_more: false, limit: 20, total: null })

async function installPmFixture(page: Page, seen: Seen[]) {
  const user = {
    id: 1,
    supabase_user_id: accountId,
    role: 'admin',
    full_name: 'Admin Test',
    email: 'admin@360ghar.com',
    is_active: true,
    is_verified: true,
    agent_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  await page.addInitScript(({ id }) => {
    const now = Math.floor(Date.now() / 1000)
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('sb-test-auth-token', JSON.stringify({
      access_token: 'browser-test-access',
      refresh_token: 'browser-test-refresh',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user: { id, aud: 'authenticated', role: 'authenticated', email: 'test@360ghar.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    }))
  }, { id: accountId })

  await page.route('https://test.supabase.co/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: accountId } }) })
  })

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    const text = request.postData()
    seen.push({ method, path, query: url.searchParams, body: text ? (JSON.parse(text) as unknown) : null })

    let status = 200
    let body: unknown = page_()
    if (path === '/users/profile') body = user
    else if (path === '/users' && method === 'GET') body = page_([owner])
    else if (path === '/amenities') body = page_([{ id: 1, title: 'Gym' }, { id: 2, title: 'Lift' }])
    else if (path === '/pm/properties' && method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      body = page_([flat, villa].filter((p) => p.title.toLowerCase().includes(q)))
    } else if (path === '/pm/properties' && method === 'POST') {
      status = 201
      body = { ...flat, id: 7 }
    } else if (path === '/pm/leases' && method === 'POST') {
      status = 201
      body = { id: 1, owner_id: 20, property_id: 6, status: 'draft' }
    } else if (path === '/pm/rent/payments' && method === 'GET') {
      const wanted = url.searchParams.get('status')
      body = page_([payment(1, 'pending'), payment(2, 'settled')].filter((p) => !wanted || p.status === wanted))
    } else if (path === '/pm/rent/payments/1/settle') {
      body = payment(1, 'settled')
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
  })
}

async function pickOwner(page: Page) {
  await page.getByRole('combobox', { name: /Owner scope/ }).click()
  await page.getByRole('option', { name: 'Asha Rao' }).click()
}

test('create property: every section is on screen and one request carries the terms', async ({ page }) => {
  const seen: Seen[] = []
  await page.setViewportSize({ width: 1280, height: 900 })
  await installPmFixture(page, seen)
  await page.goto('/pm/properties')
  await expect(page.getByText('No managed properties').or(page.getByText('Sea View Flat').first())).toBeVisible()
  await pickOwner(page)

  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create managed property' })
  await expect(dialog).toBeVisible()
  for (const heading of ['Management terms', 'Basics', 'Pricing', 'Location', 'Details', 'Features, amenities and media', 'Listing preferences', 'Owner and marketing']) {
    await expect(dialog.getByText(heading, { exact: true })).toBeVisible()
  }
  // The amenity checklist comes from the amenities route.
  await expect(dialog.getByLabel('Gym')).toBeVisible()
  mkdirSync(screenshotDir, { recursive: true })
  await dialog.screenshot({ path: `${screenshotDir}/pm-property-create-top.png` })

  await dialog.getByText('Details', { exact: true }).scrollIntoViewIfNeeded()
  await dialog.screenshot({ path: `${screenshotDir}/pm-property-create-details.png` })
  await dialog.getByText('Features, amenities and media', { exact: true }).scrollIntoViewIfNeeded()
  await dialog.screenshot({ path: `${screenshotDir}/pm-property-create-features.png` })

  await dialog.getByLabel('Title', { exact: true }).fill('2BHK Indiranagar')
  await dialog.getByLabel('Base price (₹)').fill('25000')
  await dialog.getByLabel('City').fill('Bengaluru')
  await dialog.getByLabel('Payment due day (1-28)').fill('5')
  await dialog.getByLabel('Gym').check()
  await dialog.getByLabel('Owner name').scrollIntoViewIfNeeded()
  await dialog.screenshot({ path: `${screenshotDir}/pm-property-create-bottom.png` })
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog).toBeHidden()

  const creates = seen.filter((call) => call.method === 'POST' && call.path === '/pm/properties')
  expect(creates).toHaveLength(1)
  expect([...creates[0].query.keys()]).toEqual([])
  expect(creates[0].body).toMatchObject({
    owner_id: 20,
    title: '2BHK Indiranagar',
    base_price: 25000,
    monthly_rent: 25000,
    city: 'Bengaluru',
    amenity_ids: [1],
    management_status: 'active',
    payment_due_day: 5,
    grace_period_days: 5,
  })
  expect(seen.some((call) => call.method === 'PATCH')).toBe(false)
})

test('create property dialog at 390px keeps its fields inside the screen', async ({ page }) => {
  const seen: Seen[] = []
  await page.setViewportSize({ width: 390, height: 900 })
  await installPmFixture(page, seen)
  await page.goto('/pm/properties')
  // The owner selector sits in the top bar and fits the phone width.
  await pickOwner(page)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create managed property' })
  await expect(dialog).toBeVisible()
  const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)
  expect(overflow).toBeLessThanOrEqual(2)
  await dialog.screenshot({ path: `${screenshotDir}/pm-property-create-390.png` })
})

test('lease dialog searches properties on the server and copies the late fee', async ({ page }) => {
  const seen: Seen[] = []
  await page.setViewportSize({ width: 1280, height: 900 })
  await installPmFixture(page, seen)
  await page.goto('/pm/leases')
  await page.getByRole('button', { name: 'Create Lease' }).click()
  const dialog = page.getByRole('dialog', { name: 'Create lease' })
  await dialog.getByRole('combobox', { name: 'Property' }).click()
  await page.getByPlaceholder('Search by title or address…').fill('villa')
  // The search is a server call with q. Nothing reads the whole portfolio.
  await expect.poll(() => seen.some((call) => call.path === '/pm/properties' && call.query.get('q') === 'villa')).toBe(true)
  const propertyReads = seen.filter((call) => call.path === '/pm/properties' && call.method === 'GET')
  expect(propertyReads.every((call) => call.query.get('limit') === '20')).toBe(true)
  await expect(page.getByRole('option', { name: /Sea View Flat/ })).toHaveCount(0)
  await page.getByRole('option', { name: /Hill Villa/ }).click()

  await expect(dialog.getByLabel('Late fee, fixed amount (₹)')).toHaveValue('750')
  await expect(dialog.getByLabel('Payment due day (1-28)')).toHaveAttribute('placeholder', 'Property default: 5')
  await dialog.getByLabel('Start date').fill('2026-11-01')
  await dialog.getByLabel('End date').fill('2027-10-31')
  await dialog.getByLabel('Monthly rent').fill('90000')
  await dialog.getByLabel('Security deposit').fill('180000')
  await dialog.screenshot({ path: `${screenshotDir}/pm-lease-create.png` })
  await dialog.getByRole('button', { name: 'Create', exact: true }).click()
  await expect(dialog).toBeHidden()

  const creates = seen.filter((call) => call.method === 'POST' && call.path === '/pm/leases')
  expect(creates).toHaveLength(1)
  expect(creates[0].body).toMatchObject({ owner_id: 20, property_id: 6, monthly_rent: 90000, security_deposit: 180000, late_fee_amount: 750 })
  // A blank due day and grace period are left out: the backend copies the property settings.
  expect(creates[0].body).not.toHaveProperty('payment_due_day')
  expect(creates[0].body).not.toHaveProperty('grace_period_days')
})

test('a pending tenant claim is settled from the Payments tab', async ({ page }) => {
  const seen: Seen[] = []
  await page.setViewportSize({ width: 1280, height: 900 })
  await installPmFixture(page, seen)
  await page.goto('/pm/rent-ledger')
  await page.getByRole('button', { name: 'Payments', exact: true }).click()
  await expect(page.getByText('Charge #41 • Lease #6')).toBeVisible()
  await expect(page.getByText('Charge #42 • Lease #6')).toBeVisible()
  await page.screenshot({ path: `${screenshotDir}/pm-payments-pending.png`, fullPage: true })

  await page.getByRole('combobox', { name: 'Payment status' }).click()
  await page.getByRole('option', { name: 'Pending' }).click()
  await expect(page.getByText('Charge #42 • Lease #6')).toHaveCount(0)
  expect(seen.some((call) => call.path === '/pm/rent/payments' && call.query.get('status') === 'pending')).toBe(true)

  await page.getByRole('button', { name: 'Settle', exact: true }).click()
  const confirm = page.getByRole('alertdialog')
  await confirm.getByRole('button', { name: 'Settle', exact: true }).click()
  await expect(confirm).toBeHidden()
  const settles = seen.filter((call) => call.method === 'POST' && call.path === '/pm/rent/payments/1/settle')
  expect(settles).toHaveLength(1)
  expect(settles[0].body).toBeNull()
})
