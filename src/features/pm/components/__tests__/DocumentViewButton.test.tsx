import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DocumentViewButton from '../DocumentViewButton'

describe('DocumentViewButton', () => {
  it('opens the file the viewer may open', () => {
    render(<DocumentViewButton fileUrl="https://files.example/doc.pdf" />)
    const link = screen.getByRole('link', { name: 'View' })
    expect(link).toHaveAttribute('href', 'https://files.example/doc.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('shows a disabled button when the backend sent no file_url', () => {
    render(<DocumentViewButton fileUrl={null} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No access' })).toBeDisabled()
  })
})
