import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BugReportUpdateForm } from '../BugReportUpdateForm'
import type { BugReport } from '@/types/api'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

vi.mock('@/components/ui/dialog', () => ({ DialogClose: ({ children }: { children: React.ReactNode }) => children }))

const report: BugReport = {
  id: 4, user_id: 2, source: 'web', bug_type: 'crash', severity: 'high', status: 'open', title: 'Crash', description: 'It crashes',
  steps_to_reproduce: null, expected_behavior: null, actual_behavior: null, device_info: null, app_version: null,
  media_urls: null, tags: null, assigned_to: 12, resolution: 'Looking', resolved_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: null,
}

describe('BugReportUpdateForm', () => {
  it('never sends a null status, and clears the assignee and resolution with null', async () => {
    const onSubmit = vi.fn()
    render(<BugReportUpdateForm bugReport={report} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Assigned To (admin or agent user ID)'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Resolution Notes'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Report' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit).toHaveBeenCalledWith({ status: 'open', assigned_to: null, resolution: null })
  })
})
