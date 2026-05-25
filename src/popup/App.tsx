import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { bookmarkAtom, enrichStatusAtom, loadingAtom, savedAtom } from './atoms'

export default function App() {
  const [bookmark, setBookmark] = useAtom(bookmarkAtom)
  const [loading, setLoading] = useAtom(loadingAtom)
  const [saved, setSaved] = useAtom(savedAtom)
  const [enrichStatus, setEnrichStatus] = useAtom(enrichStatusAtom)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      setBookmark({ title: tab.title || '', url: tab.url || '', note: bookmark.note, favicon: tab.favIconUrl || '' })
    })
  }, [])

  async function handleSave() {
    setLoading(true)

    try {
      const { error } = await supabase.from('bookmarks').insert({
        title: bookmark.title,
        url: bookmark.url,
        note: bookmark.note,
      })

      if (error) throw error

      setSaved(true)
    } catch (err) {
      console.error(err)
      alert('Failed to save bookmark')
    } finally {
      setLoading(false)
      setEnrichStatus('')
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <h1 className="text-base font-semibold tracking-tight text-gray-900">Why Saved?</h1>
        <div className="flex items-center gap-1">
          <a href="#" className="px-3 py-1.5 text-xs font-medium text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors">Home</a>
          <a href="#" className="px-3 py-1.5 text-xs font-medium text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors">Bookmarks</a>
          <a href="#" className="px-3 py-1.5 text-xs font-medium text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors">Settings</a>
        </div>
      </nav>

      <div className="p-4 flex flex-col gap-3">
        {/* Description */}
        <p className="text-sm text-gray-500">Save why this page matters.</p>

      <textarea
        className="border rounded-xl p-3 min-h-[120px]"
        placeholder="Why are you saving this?"
        value={bookmark.note}
        onChange={(e) => setBookmark({ ...bookmark, note: e.target.value })}
      />

      <button
        onClick={handleSave}
        disabled={loading || !bookmark.note}
        className="bg-black text-white rounded-xl p-3"
      >
        {loading ? 'Saving...' : 'Save Bookmark'}
      </button>



      {loading && enrichStatus && (
        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 font-mono whitespace-pre-wrap break-all">
          {enrichStatus}
        </div>
      )}

      {saved && (
        <div className="rounded-xl bg-green-100 p-3 text-sm">
          Bookmark saved successfully.
        </div>
      )}
      </div>
    </div>
  )
}