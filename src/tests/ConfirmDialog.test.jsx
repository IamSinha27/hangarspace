import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from '../ui/ConfirmDialog'

function renderDialog(overrides = {}) {
  const props = {
    title: 'Delete Thing',
    message: 'Are you sure you want to delete this?',
    confirmLabel: 'Delete',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  render(<ConfirmDialog {...props} />)
  return props
}

describe('ConfirmDialog', () => {
  it('renders title, message and buttons', () => {
    renderDialog()
    expect(screen.getByText('Delete Thing')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const { onConfirm } = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const { onCancel } = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('does not call onConfirm when cancel is clicked', async () => {
    const { onConfirm } = renderDialog()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('renders custom confirmLabel', () => {
    renderDialog({ confirmLabel: 'Yes, remove it' })
    expect(screen.getByRole('button', { name: 'Yes, remove it' })).toBeInTheDocument()
  })
})
