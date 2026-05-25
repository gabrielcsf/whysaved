import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enrichBookmark } from '../src/lib/bookmark'
import type { BookmarkRecord } from '../src/lib/types'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('@openrouter/sdk', () => {
  function OpenRouter() {
    return { chat: { send: mockSend } }
  }
  return { OpenRouter }
})

const baseBookmark: BookmarkRecord = {
  title: 'Test Page',
  url: 'https://example.com',
  note: 'Interesting read on TypeScript',
}

function makeStream(parts: Array<string | null>) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const part of parts) {
        yield { choices: [{ delta: { content: part } }] }
      }
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('enrichBookmark', () => {
  it('returns enriched bookmark with summary and tags', async () => {
    const json = JSON.stringify({ summary: 'A TS guide', tags: ['ts', 'dev', 'typing'] })
    mockSend.mockResolvedValue(makeStream([json]))

    const result = await enrichBookmark(baseBookmark)

    expect(result).toEqual({ ...baseBookmark, summary: 'A TS guide', tags: ['ts', 'dev', 'typing'] })
  })

  it('assembles chunks before parsing', async () => {
    mockSend.mockResolvedValue(makeStream(['{"summary":', '"streamed"', ',"tags":["a","b","c"]}']))

    const result = await enrichBookmark(baseBookmark)

    expect(result.summary).toBe('streamed')
    expect(result.tags).toEqual(['a', 'b', 'c'])
  })

  it('calls onChunk with accumulating text on each chunk', async () => {
    mockSend.mockResolvedValue(makeStream(['{"summary":', '"live"', ',"tags":[]}']))
    const onChunk = vi.fn()

    await enrichBookmark(baseBookmark, onChunk)

    expect(onChunk).toHaveBeenCalledTimes(3)
    expect(onChunk).toHaveBeenNthCalledWith(1, '{"summary":')
    expect(onChunk).toHaveBeenNthCalledWith(2, '{"summary":"live"')
    expect(onChunk).toHaveBeenNthCalledWith(3, '{"summary":"live","tags":[]}')
  })

  it('returns original bookmark when response contains no JSON', async () => {
    mockSend.mockResolvedValue(makeStream(['sorry, cannot help']))

    const result = await enrichBookmark(baseBookmark)

    expect(result).toEqual(baseBookmark)
  })

  it('handles null delta content without throwing', async () => {
    mockSend.mockResolvedValue(makeStream(['{"summary":"null-safe"', null, ',"tags":["ok"]}']))

    const result = await enrichBookmark(baseBookmark)

    expect(result.summary).toBe('null-safe')
    expect(result.tags).toEqual(['ok'])
  })

  it('preserves all original bookmark fields on the enriched result', async () => {
    const full: BookmarkRecord = {
      ...baseBookmark,
      id: 'abc',
      favicon: 'https://example.com/favicon.ico',
      created_at: '2026-01-01',
    }
    mockSend.mockResolvedValue(makeStream([JSON.stringify({ summary: 'X', tags: ['y'] })]))

    const result = await enrichBookmark(full)

    expect(result.id).toBe('abc')
    expect(result.favicon).toBe('https://example.com/favicon.ico')
    expect(result.created_at).toBe('2026-01-01')
  })
})
