import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { enrichBookmark } from '../src/lib/bookmark'
import type { BookmarkRecord } from '../src/lib/types'

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const baseBookmark: BookmarkRecord = {
  title: 'TypeScript Handbook',
  url: 'https://typescriptlang.org/docs/handbook',
  note: 'Great reference for advanced types',
}

function sseChunk(content: string, finishReason: string | null = null) {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion.chunk',
    created: 1700000000,
    model: 'openai/gpt-5',
    choices: [{ index: 0, delta: { content }, finish_reason: finishReason }],
  }
}

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1
        const payload = JSON.stringify(sseChunk(chunks[i], isLast ? 'stop' : null))
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new HttpResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}

describe('enrichBookmark — integration (HTTP intercepted by MSW)', () => {
  it('parses a single-chunk response into summary and tags', async () => {
    server.use(
      http.post(OPENROUTER_CHAT_URL, () =>
        sseResponse([JSON.stringify({ summary: 'TS reference', tags: ['typescript', 'docs', 'types'] })]),
      ),
    )

    const result = await enrichBookmark(baseBookmark)

    expect(result.summary).toBe('TS reference')
    expect(result.tags).toEqual(['typescript', 'docs', 'types'])
  })

  it('assembles multi-chunk SSE stream before parsing', async () => {
    server.use(
      http.post(OPENROUTER_CHAT_URL, () =>
        sseResponse(['{"summary":', '"streamed summary"', ',"tags":["a","b","c"]}']),
      ),
    )

    const result = await enrichBookmark(baseBookmark)

    expect(result.summary).toBe('streamed summary')
    expect(result.tags).toEqual(['a', 'b', 'c'])
  })

  it('sends prompt containing bookmark fields in the request body', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(OPENROUTER_CHAT_URL, async ({ request }) => {
        capturedBody = await request.json()
        return sseResponse([JSON.stringify({ summary: 'x', tags: [] })])
      }),
    )

    await enrichBookmark(baseBookmark)

    const body = capturedBody as { messages: Array<{ role: string; content: string }> }
    const userMessage = body.messages.find((m) => m.role === 'user')
    expect(userMessage?.content).toContain(baseBookmark.title)
    expect(userMessage?.content).toContain(baseBookmark.url)
    expect(userMessage?.content).toContain(baseBookmark.note)
  })

  it('calls onChunk progressively as SSE chunks arrive', async () => {
    server.use(
      http.post(OPENROUTER_CHAT_URL, () =>
        sseResponse(['{"summary":', '"live"', ',"tags":[]}']),
      ),
    )
    const onChunk = vi.fn()

    await enrichBookmark(baseBookmark, onChunk)

    expect(onChunk.mock.calls.length).toBeGreaterThanOrEqual(1)
    const lastCall = onChunk.mock.calls.at(-1)?.[0] as string
    expect(lastCall).toContain('"live"')
  })

  it('falls back to original bookmark when API returns non-JSON text', async () => {
    server.use(
      http.post(OPENROUTER_CHAT_URL, () =>
        sseResponse(['Sorry, I cannot process this.']),
      ),
    )

    const result = await enrichBookmark(baseBookmark)

    expect(result).toEqual(baseBookmark)
    expect(result.summary).toBeUndefined()
    expect(result.tags).toBeUndefined()
  })

  it('propagates HTTP errors as thrown exceptions', async () => {
    server.use(
      http.post(OPENROUTER_CHAT_URL, () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    )

    await expect(enrichBookmark(baseBookmark)).rejects.toThrow()
  })
})
