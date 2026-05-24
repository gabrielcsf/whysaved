import { atom } from 'jotai'
import { BookmarkRecord } from '../lib/types'

export const bookmarkAtom = atom<BookmarkRecord>({
  title: '',
  url: '',
  note: '',
  favicon: ''
})
export const loadingAtom = atom(false)
export const savedAtom = atom(false)