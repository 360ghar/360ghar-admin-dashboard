import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DecisionAlertDialog } from '../DecisionAlertDialog'

const mocks = vi.hoisted(() => ({
  decide: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('@/features/pm/api/pmApi', () => ({
  useDecideApplicationMutation: () => [mocks.decide, { isLoading: false }],
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }))

describe('DecisionAlertDialog', () => {
  beforeEach(() => {
    mocks.decide.mockReset()
    mocks.toast.mockReset()
    mocks.decide
      .mockImplementationOnce(() => ({ unwrap: () => Promise.reject(new Error('Decision failed')) }))
      .mockImplementationOnce(() => ({ unwrap: () => Promise.resolve({}) }))
  })

  it('keeps a failed decision open for retry and closes after success', async () => {
    const onDecided = vi.fn()
    render(<DecisionAlertDialog
      applicationId={13}
      applicantName="Sam"
      onDecided={onDecided}
      renderTrigger={({ openApprove }) => <button onClick={openApprove}>Open approve</button>}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Open approve' }))
    fireEvent.click(screen.getByRole('button', { name: /^Approve$/ }))

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({
      title: 'Failed',
      description: 'Decision failed',
      variant: 'destructive',
    }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onDecided).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /^Approve$/ }))
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onDecided).toHaveBeenCalledTimes(1)
  })

  it('sends the decision with its notes, and no notes key when the field is empty', async () => {
    mocks.decide.mockReset()
    mocks.decide.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }))
    render(<DecisionAlertDialog
      applicationId={13}
      applicantName="Sam"
      renderTrigger={({ openReject }) => <button onClick={openReject}>Open reject</button>}
    />)

    fireEvent.click(screen.getByRole('button', { name: 'Open reject' }))
    fireEvent.change(screen.getByLabelText('Notes (optional)'), { target: { value: '  Income too low  ' } })
    fireEvent.click(screen.getByRole('button', { name: /^Reject$/ }))
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledTimes(1))
    expect(mocks.decide).toHaveBeenLastCalledWith({
      application_id: 13,
      payload: { decision: 'rejected', notes: 'Income too low' },
    })

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Open reject' }))
    expect(screen.getByLabelText('Notes (optional)')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: /^Reject$/ }))
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledTimes(2))
    expect(mocks.decide).toHaveBeenLastCalledWith({
      application_id: 13,
      payload: { decision: 'rejected', notes: undefined },
    })
  })
})
