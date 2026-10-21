import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PmProperty } from '@/types/pm'
import PropertyCreateDialog from '../PropertyCreateDialog'
import { PropertyEditDialog } from '../PropertyEditDialog'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  toast: vi.fn(),
  role: 'admin' as 'admin' | 'agent',
}))

vi.mock('@/features/pm/api/pmApi', () => ({
  useCreatePmPropertyMutation: () => [mocks.create, { isLoading: false }],
  useUpdatePmPropertyMutation: () => [mocks.update, { isLoading: false }],
}))
vi.mock('@/features/core/api/amenitiesApi', () => ({
  useGetAmenitiesQuery: () => ({ data: [{ id: 1, title: 'Gym' }, { id: 2, title: 'Lift' }], isLoading: false, isError: false }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: mocks.role }) }))

const resolved = (value: unknown) => () => ({ unwrap: () => Promise.resolve(value) })

function openDialog(trigger: string) {
  fireEvent.click(screen.getByRole('button', { name: trigger }))
  return screen.getByRole('dialog')
}

describe('PropertyCreateDialog', () => {
  beforeEach(() => {
    mocks.create.mockReset()
    mocks.toast.mockReset()
    mocks.role = 'admin'
    mocks.create.mockImplementation(resolved({ id: 1 }))
  })

  it('creates the property in one request with the owner and the PM terms in the body', async () => {
    render(<PropertyCreateDialog ownerId={7} disabled={false} />)
    const dialog = openDialog('Create')
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: '2BHK Indiranagar' } })
    fireEvent.change(within(dialog).getByLabelText('Base price (₹)'), { target: { value: '25000' } })
    fireEvent.change(within(dialog).getByLabelText('City'), { target: { value: 'Bengaluru' } })
    fireEvent.change(within(dialog).getByLabelText('Payment due day (1-28)'), { target: { value: '5' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith({
      owner_id: 7,
      title: '2BHK Indiranagar',
      property_type: 'apartment',
      purpose: 'rent',
      base_price: 25000,
      monthly_rent: 25000,
      city: 'Bengaluru',
      country: 'India',
      minimum_stay_days: 1,
      management_status: 'active',
      payment_due_day: 5,
      grace_period_days: 5,
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows every listing section and the amenity list', () => {
    render(<PropertyCreateDialog ownerId={7} disabled={false} />)
    const dialog = openDialog('Create')
    for (const title of ['Basics', 'Pricing', 'Location', 'Details', 'Features, amenities and media', 'Listing preferences', 'Owner and marketing']) {
      expect(within(dialog).getByText(title)).toBeInTheDocument()
    }
    expect(within(dialog).getByLabelText('Gym')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Owner contact')).toBeInTheDocument()
  })

  it('does not post when a field is invalid', async () => {
    render(<PropertyCreateDialog ownerId={7} disabled={false} />)
    const dialog = openDialog('Create')
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Flat' } })
    fireEvent.change(within(dialog).getByLabelText('Base price (₹)'), { target: { value: '25000' } })
    fireEvent.change(within(dialog).getByLabelText('Latitude'), { target: { value: '120' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))

    expect(await within(dialog).findByText('Must be at most 90')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('puts a server field error on the field it names', async () => {
    mocks.create.mockImplementation(() => ({
      unwrap: () => Promise.reject({
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: { fields: [{ field: 'body.pincode', msg: 'invalid pincode', type: 'value_error' }] },
          },
        },
      }),
    }))
    render(<PropertyCreateDialog ownerId={7} disabled={false} />)
    const dialog = openDialog('Create')
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Flat' } })
    fireEvent.change(within(dialog).getByLabelText('Base price (₹)'), { target: { value: '25000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))

    expect(await within(dialog).findByText('Invalid pincode')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('needs an owner', async () => {
    render(<PropertyCreateDialog ownerId={null} disabled={false} />)
    const dialog = openDialog('Create')
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Flat' } })
    fireEvent.change(within(dialog).getByLabelText('Base price (₹)'), { target: { value: '25000' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Select an owner' })))
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('hides the owner contact from an agent, who sees only the agent or company number there', () => {
    mocks.role = 'agent'
    render(<PropertyCreateDialog ownerId={7} disabled={false} />)
    const dialog = openDialog('Create')
    expect(within(dialog).queryByLabelText('Owner contact')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Owner name')).toBeInTheDocument()
  })
})

const property: PmProperty = {
  id: 5,
  owner_id: 7,
  title: 'Flat',
  property_type: 'apartment',
  purpose: 'rent',
  status: 'available',
  base_price: 25000,
  monthly_rent: 25000,
  city: 'Pune',
  country: 'India',
  minimum_stay_days: 1,
  is_available: true,
  view_count: 0,
  like_count: 0,
  interest_count: 0,
  management_status: 'active',
  payment_due_day: 5,
  grace_period_days: 3,
  late_fee_policy: null,
  owner_contact: '+91 80000 00000',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('PropertyEditDialog', () => {
  beforeEach(() => {
    mocks.update.mockReset()
    mocks.toast.mockReset()
    mocks.role = 'admin'
    mocks.update.mockImplementation(resolved({ id: 5 }))
  })

  it('opens with the stored values and sends only what changed', async () => {
    render(<PropertyEditDialog property={property} />)
    const dialog = openDialog('Edit')
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Flat')
    expect(within(dialog).getByLabelText('Payment due day (1-28)')).toHaveValue(5)

    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Renamed flat' } })
    fireEvent.change(within(dialog).getByLabelText('City'), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update).toHaveBeenCalledWith({ property_id: 5, payload: { title: 'Renamed flat', city: null } })
  })

  it('does not call the backend when nothing changed', async () => {
    render(<PropertyEditDialog property={property} />)
    const dialog = openDialog('Edit')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'No changes', description: 'Nothing was changed.' }))
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('never writes the masked owner contact of an agent view back', async () => {
    mocks.role = 'agent'
    render(<PropertyEditDialog property={property} />)
    const dialog = openDialog('Edit')
    expect(within(dialog).queryByLabelText('Owner contact')).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'X' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1))
    expect(mocks.update.mock.calls[0][0]).toEqual({ property_id: 5, payload: { title: 'X' } })
  })
})
