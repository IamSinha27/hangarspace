import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from '../ui/Login'

// Mock API and router
vi.mock('../api/hangar', () => ({
  login: vi.fn(),
  register: vi.fn(),
}))
vi.mock('../api/client', () => ({
  setToken: vi.fn(),
  getToken: vi.fn(() => null),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

import { login, register } from '../api/hangar'
import { setToken } from '../api/client'

function renderLogin() {
  return render(<MemoryRouter><Login /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Login page', () => {
  it('renders sign-in form by default', () => {
    renderLogin()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('switches to register mode', async () => {
    renderLogin()
    await userEvent.click(screen.getByText('Create one'))
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. Riverside FBO')).toBeInTheDocument()
  })

  it('switches back to login mode from register', async () => {
    renderLogin()
    await userEvent.click(screen.getByText('Create one'))
    await userEvent.click(screen.getByText('Sign in'))
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('calls login API and navigates on success', async () => {
    login.mockResolvedValueOnce({ access_token: 'tok123' })
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('test@test.com', 'password123')
      expect(setToken).toHaveBeenCalledWith('tok123')
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows generic error message on login failure', async () => {
    login.mockRejectedValueOnce(new Error('Invalid email or password'))
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'bad@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument()
    })
  })

  it('shows generic error on register failure', async () => {
    register.mockRejectedValueOnce(new Error('Email already registered'))
    renderLogin()

    await userEvent.click(screen.getByText('Create one'))
    await userEvent.type(screen.getByPlaceholderText('e.g. Riverside FBO'), 'My FBO')
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'existing@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Could not create account. Please try again.')).toBeInTheDocument()
    })
  })

  it('clears error when switching modes', async () => {
    login.mockRejectedValueOnce(new Error('fail'))
    renderLogin()

    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'x@x.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'bad')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByText('Invalid email or password.')).toBeInTheDocument())

    await userEvent.click(screen.getByText('Create one'))
    expect(screen.queryByText('Invalid email or password.')).not.toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    renderLogin()
    const input = screen.getByPlaceholderText('••••••••')
    expect(input).toHaveAttribute('type', 'password')

    // Find the toggle button (contains SVG, no text)
    const toggleBtn = input.parentElement.querySelector('button')
    await userEvent.click(toggleBtn)
    expect(input).toHaveAttribute('type', 'text')

    await userEvent.click(toggleBtn)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('calls register API with org name, email, password', async () => {
    register.mockResolvedValueOnce({ access_token: 'newtoken' })
    renderLogin()

    await userEvent.click(screen.getByText('Create one'))
    await userEvent.type(screen.getByPlaceholderText('e.g. Riverside FBO'), 'Test FBO')
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'new@fbo.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'securepass')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('Test FBO', 'new@fbo.com', 'securepass', null)
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })
})
