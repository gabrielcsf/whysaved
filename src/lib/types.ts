export interface BookmarkRecord {
  id?: string;
  title: string;
  url: string;
  note: string;
  summary?: string;
  tags?: string[];
  created_at?: string;
}
