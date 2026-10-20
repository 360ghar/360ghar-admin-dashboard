import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RentalApplication } from '@/types/pm'
import InboxTab from '../InboxTab'

const mocks = vi.hoisted(() => ({
  decide: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/pm/api/pmApi', () => ({
  useDecideApplicationMutation: () => [mocks.decide],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('@/components/ui/responsive-data-table', () => ({
  ResponsiveDataTable: ({ data, rowSelection, onRowSelectionChange }: {
    data: RentalApplication[]
    rowSelection: Record<string, boolean>
    onRowSelectionChange: (selection: Record<string, boolean>) => void
  }) => (
    <div>
      {data.map((app) => (
        <button key={app.id} onClick={() => onRowSelectionChange({ ...rowSelection, [app.id]: true })}>
          Select #{app.id}
        </button>
      ))}
    </div>
  ),
}))

const applications: RentalApplication[] = [1, 2].map((id) => ({
  id,
  form_id: 10,
  property_id: 30,
  owner_id: 20,
  status: 'applicant',
  created_at: '2026-01-01T00:00:00Z',
}))

describe('InboxTab bulk decisions', () => {
  beforeEach(() => {
    mocks.decide.mockReset()
    mocks.toast.mockReset()
    mocks.decide.mockImplementation(({ application_id }: { application_id: number }) => ({
      unwrap: () => application_id === 1 ? Promise.resolve({}) : Promise.reject(new Error('server error')),
    }))
  })

  it('keeps only failed applications selected for retry', async () => {
    render(<InboxTab
      applicationsData={applications}
      applicationsIsLoading={false}
      applicationsIsError={false}
      applicationsRefetch={vi.fn()}
      appsLimit={50}
      appsCanPrev={false}
      appsCanNext={false}
      onAppsPrev={vi.fn()}
      onAppsNext={vi.fn()}
      status=""
      onStatusChange={vi.fn()}
      formId={null}
      onClearForm={vi.fn()}
      appsLimitValue={50}
      onAppsLimitChange={vi.fn()}
      decideIsLoading={false}
      onApprove={vi.fn()}
      onReject={vi.fn()}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Select #1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select #2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve Selected' }))

    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument())
    const lastToast: unknown = mocks.toast.mock.lastCall?.[0]
    expect(lastToast).toMatchObject({ title: 'Partial success' })
    expect(lastToast).toHaveProperty('description', expect.stringContaining('#2'))

    fireEvent.click(screen.getByRole('button', { name: 'Approve Selected' }))
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledTimes(3))
    expect(mocks.decide).toHaveBeenNthCalledWith(1, { application_id: 1, payload: { decision: 'approved' } })
    expect(mocks.decide).toHaveBeenNthCalledWith(2, { application_id: 2, payload: { decision: 'approved' } })
    expect(mocks.decide).toHaveBeenNthCalledWith(3, { application_id: 2, payload: { decision: 'approved' } })
  })
})
