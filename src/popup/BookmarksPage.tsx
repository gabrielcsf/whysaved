import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BookmarkRecord } from '../lib/types'

const PAGE_SIZE = 10

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const offsetRef = useRef(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function fetchBookmarks(search: string, offset: number, append: boolean) {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      let q = supabase
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (search.trim()) {
        const term = `%${search.trim()}%`
        q = q.or(`title.ilike.${term},url.ilike.${term},note.ilike.${term}`)
      }

      const { data, error } = await q

      if (error) throw error

      const results = data ?? []
      setBookmarks((prev) => (append ? [...prev, ...results] : results))
      setHasMore(results.length === PAGE_SIZE)
      offsetRef.current = offset + results.length
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    offsetRef.current = 0
    setError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchBookmarks(query, 0, false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function handleLoadMore() {
    fetchBookmarks(query, offsetRef.current, true)
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-3 pb-2">
        <input
          type="search"
          placeholder="Search bookmarks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:bg-white transition-colors"
        />
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
      ) : bookmarks.length === 0 ? (
        <p className="px-4 py-3 text-sm text-gray-400">
          {query ? 'No bookmarks match your search.' : 'No bookmarks saved yet.'}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          {bookmarks.map((bm) => (
            <li key={bm.id} className="flex gap-3 px-4 py-3 hover:bg-gray-50">
              {bm.favicon && (
                <img src={bm.favicon} alt="" className="mt-0.5 h-4 w-4 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <a
                  href={bm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-gray-900 hover:underline"
                >
                  {bm.title || bm.url}
                </a>
                {bm.note && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{bm.note}</p>
                )}
                {bm.tags && bm.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {bm.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="mx-4 my-3 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
