import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PmProperty } from '@/types/pm'
import CreateLeaseDialog from '../CreateLeaseDialog'

const mocks = vi.hoisted(() => ({ create: vi.fn(), toast: vi.fn() }))

vi.mock('@/features/pm/api/pmApi', () => ({
  useCreatePmLeaseMutation: () => [mocks.create, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ role: 'admin' }) }))
// The picker has its own test. Here it hands over a property with a fixed late fee policy.
const picked: Partial<PmProperty> = {
  id: 10,
  owner_id: 33,
  title: 'Sea View Flat',
  payment_due_day: 5,
  grace_period_days: 3,
  late_fee_policy: { type: 'fixed', amount: 500 },
}
vi.mock('@/features/pm/components/PmPropertyPicker', () => ({
  PmPropertyPicker: ({ onSelect }: { onSelect: (property: PmProperty) => void }) => (
    <button type="button" onClick={() => onSelect(picked as PmProperty)}>
      Pick property
    </button>
  ),
}))

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Create Lease' }))
  return screen.getByRole('dialog')
}

describe('CreateLeaseDialog', () => {
  beforeEach(() => {
    mocks.create.mockReset()
    mocks.toast.mockReset()
    mocks.create.mockImplementation(() => ({ unwrap: () => Promise.resolve({ id: 1 }) }))
  })

  it('copies the late fee of the picked property into the lease and shows its due day and grace period as defaults', async () => {
    render(<CreateLeaseDialog ownerId={null} />)
    const dialog = openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pick property' }))

    await waitFor(() => expect(within(dialog).getByLabelText('Late fee, fixed amount (₹)')).toHaveValue(500))
    expect(within(dialog).getByLabelText('Payment due day (1-28)')).toHaveAttribute('placeholder', 'Property default: 5')
    expect(within(dialog).getByLabelText('Grace period (days)')).toHaveAttribute('placeholder', 'Property default: 3')
  })

  it('creates the lease for the owner of the picked property, with the billing terms the lease holds', async () => {
    render(<CreateLeaseDialog ownerId={null} />)
    const dialog = openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Pick property' }))
    fireEvent.change(within(dialog).getByLabelText('Start date'), { target: { value: '2026-11-01' } })
    fireEvent.change(within(dialog).getByLabelText('End date'), { target: { value: '2027-10-31' } })
    fireEvent.change(within(dialog).getByLabelText('Monthly rent'), { target: { value: '25000' } })
    fireEvent.change(within(dialog).getByLabelText('Security deposit'), { target: { value: '50000' } })
    await waitFor(() => expect(within(dialog).getByLabelText('Late fee, fixed amount (₹)')).toHaveValue(500))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1))
    expect(mocks.create).toHaveBeenCalledWith({
      owner_id: 33,
      property_id: 10,
      tenant_name: undefined,
      tenant_phone: undefined,
      tenant_email: undefined,
      status: 'draft',
      start_date: '2026-11-01',
      end_date: '2027-10-31',
      monthly_rent: 25000,
      security_deposit: 50000,
      // A blank due day and grace period are left out: the backend copies the property settings.
      payment_due_day: undefined,
      grace_period_days: undefined,
      late_fee_amount: 500,
      late_fee_percentage: undefined,
    })
  })

  it('asks for a property before it sends anything', async () => {
    render(<CreateLeaseDialog ownerId={7} />)
    const dialog = openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }))
    expect(await within(dialog).findByText('Property is required')).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
