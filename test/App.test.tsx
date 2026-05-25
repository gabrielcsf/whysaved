import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import App from '../src/popup/App'
import '../test/setup'

vi.stubGlobal('chrome', {
  tabs: {
    query: vi.fn((_query, callback) => {
      callback([{ title: 'Test Page', url: 'https://example.com', favIconUrl: '' }])
    }),
  },
})

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

test('renders navbar with app title', () => {
  render(<App />)
  expect(screen.getByText('Why Saved?')).toBeInTheDocument()
})

test('renders note textarea', () => {
  render(<App />)
  expect(screen.getByPlaceholderText('Why are you saving this?')).toBeInTheDocument()
})

test('save button is disabled when note is empty', () => {
  render(<App />)
  expect(screen.getByRole('button', { name: /save bookmark/i })).toBeDisabled()
})

test('save button is enabled when note has content', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.type(screen.getByPlaceholderText('Why are you saving this?'), 'interesting article')

  expect(screen.getByRole('button', { name: /save bookmark/i })).toBeEnabled()
})
