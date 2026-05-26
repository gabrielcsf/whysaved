import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enrichBookmark } from '../src/lib/bookmark'
import type { BookmarkRecord } from '../src/lib/types'

const mockInvoke = vi.hoisted(() => vi.fn())

vi.mock('../src/lib/supabase', () => ({
  supabase: { functions: { invoke: mockInvoke } },
}))

const baseBookmark: BookmarkRecord = {
  title: 'Test Page',
  url: 'https://example.com',
  note: 'Interesting read on TypeScript',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('enrichBookmark', () => {
  it('returns enriched bookmark with summary and tags', async () => {
    mockInvoke.mockResolvedValue({ data: { summary: 'A TS guide', tags: ['ts', 'dev', 'typing'] }, error: null })

    const result = await enrichBookmark(baseBookmark)

    expect(result).toEqual({ ...baseBookmark, summary: 'A TS guide', tags: ['ts', 'dev', 'typing'] })
  })

  it('calls onChunk with the JSON-stringified response', async () => {
    mockInvoke.mockResolvedValue({ data: { summary: 'live', tags: [] }, error: null })
    const onChunk = vi.fn()

    await enrichBookmark(baseBookmark, onChunk)

    expect(onChunk).toHaveBeenCalledTimes(1)
    expect(onChunk).toHaveBeenCalledWith(JSON.stringify({ summary: 'live', tags: [] }))
  })

  it('returns original bookmark fields when summary/tags are missing', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null })

    const result = await enrichBookmark(baseBookmark)

    expect(result).toEqual({ ...baseBookmark, summary: undefined, tags: undefined })
  })

  it('throws when the edge function returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Unauthorized') })

    await expect(enrichBookmark(baseBookmark)).rejects.toThrow('Unauthorized')
  })

  it('preserves all original bookmark fields on the enriched result', async () => {
    const full: BookmarkRecord = {
      ...baseBookmark,
      id: 'abc',
      favicon: 'https://example.com/favicon.ico',
      created_at: '2026-01-01',
    }
    mockInvoke.mockResolvedValue({ data: { summary: 'X', tags: ['y'] }, error: null })

    const result = await enrichBookmark(full)

    expect(result.id).toBe('abc')
    expect(result.favicon).toBe('https://example.com/favicon.ico')
    expect(result.created_at).toBe('2026-01-01')
  })
})
