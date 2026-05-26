import { supabase } from './supabase'
import { BookmarkRecord } from './types'

export async function enrichBookmark(
  bookmark: BookmarkRecord,
  onChunk?: (partial: string) => void,
): Promise<BookmarkRecord> {
  const { data, error } = await supabase.functions.invoke<{
    summary?: string
    tags?: string[]
  }>('enrich-bookmark', {
    body: {
      title: bookmark.title,
      url: bookmark.url,
      note: bookmark.note,
    },
  })

  if (error) throw error

  const raw = JSON.stringify(data)
  onChunk?.(raw)

  return {
    ...bookmark,
    summary: data?.summary,
    tags: data?.tags,
  }
}
