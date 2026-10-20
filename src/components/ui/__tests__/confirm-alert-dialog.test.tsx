import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { ConfirmAlertDialog } from '../confirm-alert-dialog'

describe('ConfirmAlertDialog', () => {
  it('waits for an async action and prevents a second submission', async () => {
    let finish!: () => void
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { finish = resolve }))
    render(
      <ConfirmAlertDialog title="Delete item" description="Delete this item?" onConfirm={onConfirm}>
        {(open) => <button onClick={open}>Open</button>}
      </ConfirmAlertDialog>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm…' })).toBeDisabled()
    expect(onConfirm).toHaveBeenCalledTimes(1)

    finish()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('keeps the dialog open and shows the error after a failed action', async () => {
    const onConfirm = vi.fn()
      .mockRejectedValueOnce(new Error('Delete failed. Try again.'))
      .mockResolvedValueOnce(undefined)
    render(
      <ConfirmAlertDialog title="Delete item" description="Delete this item?" onConfirm={onConfirm}>
        {(open) => <button onClick={open}>Open</button>}
      </ConfirmAlertDialog>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Delete failed. Try again.')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })
})
