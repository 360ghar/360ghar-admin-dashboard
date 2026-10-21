import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MaintenanceRequest } from '@/types/pm'
import MaintenanceUpdateForm from '../MaintenanceUpdateForm'

const request: MaintenanceRequest = {
  id: 1,
  property_id: 10,
  owner_id: 20,
  category: 'plumbing',
  urgency: 'high',
  title: 'Leaky tap',
  request_status: 'open',
  estimated_cost: 1500.5,
  created_at: '2026-01-01T00:00:00Z',
}

describe('MaintenanceUpdateForm', () => {
  it('sends the urgency and never a priority (the backend rejects it)', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<MaintenanceUpdateForm request={request} defaultAssignedAgentId={null} onSubmit={onSubmit} isSubmitting={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>
    expect(payload).toMatchObject({ request_status: 'open', urgency: 'high', estimated_cost: 1500.5 })
    expect(payload).not.toHaveProperty('priority')
  })

  it('clears an emptied field with null and leaves an untouched empty field out', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <MaintenanceUpdateForm
        request={{ ...request, vendor_name: 'Singh Plumbing', actual_cost: null }}
        defaultAssignedAgentId={null}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    )
    fireEvent.change(screen.getByLabelText('Vendor name (optional)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const payload = onSubmit.mock.calls[0][0] as Record<string, unknown>
    expect(payload.vendor_name).toBeNull()
    expect(payload.actual_cost).toBeUndefined()
    expect(payload.vendor_contact).toBeUndefined()
  })
})
