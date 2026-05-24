import { useAtom } from 'jotai'
import { useEffect } from 'react'

import { bookmarkAtom, loadingAtom, savedAtom } from './atoms'
import logo from '../../public/logo.png'

export default function App() {
  const [bookmark, setBookmark] = useAtom(bookmarkAtom)
  const [loading, setLoading] = useAtom(loadingAtom)
  const [saved, setSaved] = useAtom(savedAtom)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]

      setBookmark({ title: tab.title || '', url: tab.url || '', note: bookmark.note, favicon: tab.favIconUrl || '' })
    })
  }, [])

  async function handleSave() {
    setLoading(true)

    try {
      setSaved(true)
      console.log('Saving bookmark:', bookmark)
    } catch (err) {
      console.error(err)
      alert('Failed to save bookmark')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Why Saved?</h1>
        <p className="text-sm text-gray-500">
          Save why this page matters.
        </p>
      </div>

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

      {saved && (
        <div className="rounded-xl bg-green-100 p-3 text-sm">
          Bookmark saved successfully.
        </div>
      )}
    </div>
  )
}