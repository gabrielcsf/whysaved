import { atom } from 'jotai'
import { BookmarkRecord } from '../lib/types'

export type Page = 'home' | 'bookmarks'

export const pageAtom = atom<Page>('home')
export const bookmarkAtom = atom<BookmarkRecord>({
  title: '',
  url: '',
  note: '',
})
export const loadingAtom = atom(false)
export const savedAtom = atom(false)
export const enrichStatusAtom = atom('')