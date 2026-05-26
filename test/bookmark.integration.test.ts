import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { enrichBookmark } from '../src/lib/bookmark'
import type { BookmarkRecord } from '../src/lib/types'

const SUPABASE_URL = 'https://oarnpzussxzmyoadrngg.supabase.co'
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/enrich-bookmark`

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const baseBookmark: BookmarkRecord = {
  title: 'TypeScript Handbook',
  url: 'https://typescriptlang.org/docs/handbook',
  note: 'Great reference for advanced types',
}

describe('enrichBookmark — integration (HTTP intercepted by MSW)', () => {
  it('parses a response into summary and tags', async () => {
    server.use(
      http.post(EDGE_FUNCTION_URL, () =>
        HttpResponse.json({ summary: 'TS reference', tags: ['typescript', 'docs', 'types'] }),
      ),
    )

    const result = await enrichBookmark(baseBookmark)

    expect(result.summary).toBe('TS reference')
    expect(result.tags).toEqual(['typescript', 'docs', 'types'])
  })

  it('sends bookmark fields in the request body', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(EDGE_FUNCTION_URL, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ summary: 'x', tags: [] })
      }),
    )

    await enrichBookmark(baseBookmark)

    const body = capturedBody as { title: string; url: string; note: string }
    expect(body.title).toBe(baseBookmark.title)
    expect(body.url).toBe(baseBookmark.url)
    expect(body.note).toBe(baseBookmark.note)
  })

  it('calls onChunk once with the JSON-stringified response', async () => {
    server.use(
      http.post(EDGE_FUNCTION_URL, () =>
        HttpResponse.json({ summary: 'live', tags: [] }),
      ),
    )
    const chunks: string[] = []

    await enrichBookmark(baseBookmark, (partial) => chunks.push(partial))

    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toContain('live')
  })

  it('returns bookmark with undefined summary/tags when response is empty', async () => {
    server.use(
      http.post(EDGE_FUNCTION_URL, () => HttpResponse.json({})),
    )

    const result = await enrichBookmark(baseBookmark)

    expect(result.summary).toBeUndefined()
    expect(result.tags).toBeUndefined()
  })

  it('propagates HTTP errors as thrown exceptions', async () => {
    server.use(
      http.post(EDGE_FUNCTION_URL, () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    )

    await expect(enrichBookmark(baseBookmark)).rejects.toThrow()
  })
})
