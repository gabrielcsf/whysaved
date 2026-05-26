# Why Saved — Write-Up

## What It Does

Why Saved is a Chrome extension that lets you bookmark any page with a written reason — capturing your intent at the moment you save, so you remember _why_ something mattered when you come back to it later.

## How It Works

When you open the extension popup on any page, the extension reads the active tab's `title` and `url` via the Chrome `tabs` API and pre-fills the form. You type a note explaining why you're saving the page, then click **Save Bookmark**.

The bookmark (`title`, `url`, `note`) is written directly to a Supabase Postgres table. The **Bookmarks** view fetches your saved bookmarks with paginated, debounced search across `title`, `url`, and `note` using Supabase's `ilike` filter.

### Data model

```
BookmarkRecord {
  id?         uuid (set by Supabase)
  title       string
  url         string
  note        string
  summary?    string   (AI-generated, not yet wired to save)
  tags?       string[] (AI-generated, not yet wired to save)
  created_at? string
}
```

### State management

Global UI state lives in [Jotai](https://jotai.org/) primitive atoms (`src/popup/atoms.ts`): current page, bookmark form values, loading and saved flags, and an enrich-status string for streaming AI output.

### AI enrichment (partial)

`src/lib/bookmark.ts` contains an `enrichBookmark` function that calls OpenRouter to generate a short summary and tags from the bookmark's title, URL, and note. The function streams the response chunk by chunk. It is implemented but not yet called from the save flow, because the enrichment at save time is too slow to block the user on. The plan is to call `enrichBookmark` from a Supabase Edge Function after insert, so the extension can update the bookmark with enrichment results asynchronously without blocking the UI.

### Tech stack

| Layer               | Technology                     |
| ------------------- | ------------------------------ |
| Extension framework | Chrome MV3 + CRXJS Vite plugin |
| UI                  | React 19 + Tailwind CSS        |
| State               | Jotai                          |
| Database            | Supabase (Postgres)            |
| AI                  | OpenRouter (streaming)         |
| Build               | Vite 5 + TypeScript            |

---

## Production / Marketplace Checklist

### Security (blockers before publishing)

- [ ] **Proxy AI calls server-side.** The OpenRouter API key is currently read from `VITE_OPENROUTER_API_KEY` and bundled into the extension JS. Anyone who installs the extension can extract it. Move `enrichBookmark` calls to a Supabase Edge Function that holds the key as a server-side secret.
- [ ] **Enable Supabase Row Level Security.** Without RLS, the anon key (which is public in the bundle) gives read/write access to all users' bookmarks. Enable RLS and add a policy so each user can only access their own rows.
- [ ] **Add Supabase Auth.** Users need an identity for RLS to work. Implement sign-up / sign-in (email or OAuth) and pass the session token to all Supabase queries.

### Features (required for a usable product)

- [ ] **Wire AI enrichment into the save flow.** Call `enrichBookmark` after insert and update the row with `summary` and `tags`.
- [ ] **Show tags and summary in the Bookmarks list.** `BookmarkRecord` already has the fields; the UI just doesn't render them yet.
- [ ] **Error handling for auth state.** If the user is not signed in, show a login screen instead of silently failing on Supabase calls.
- [ ] **Delete bookmark.** No way to remove a saved bookmark yet.

### Chrome Web Store requirements

- [ ] **Privacy policy at a public URL.** `public/privacy-policy.html` is ready but only accessible after installation. Host it on GitHub Pages or a landing page and use that URL in the store listing. See [public/privacy-policy.html](public/privacy-policy.html) for the content.
- [ ] **Justify `host_permissions: ["<all_urls>"]`.** In the store submission form, state: _"The extension reads the active tab's URL and title to pre-fill the bookmark form, requiring permission to access any URL the user is visiting."_
- [ ] **Icon assets.** The manifest references `logo-16.png`, `logo-48.png`, `logo-128.png` — verify these look good at small sizes and are not just downscaled versions of the large logo.
- [ ] **Store listing copy.** Write a short description (≤ 132 chars) and a long description with screenshots. Minimum one screenshot at 1280×800 or 640×400.
- [ ] **Bump version** in `src/manifest.ts` from `0.0.1` to `1.0.0` before first publish.
- [ ] **Register a Chrome Web Store developer account** ($5 one-time fee at the Developer Dashboard).

### Code quality

- [ ] **Remove `console.error` / `alert` from `handleSave`.** Replace with inline UI error state.
- [ ] **Validate `bookmark.url`** before inserting — malformed URLs can be saved silently today.
- [ ] **Remove unused `enrichStatusAtom`** display logic from `App.tsx` (the `{loading && enrichStatus && ...}` block) until enrichment is actually wired up.
- [ ] **Add tests.** No tests are configured yet. Add unit tests for `enrichBookmark` and `BookmarksPage` at minimum.

### Build / release

- [ ] **Add `.env` to `.gitignore`** and confirm it is not committed.
- [ ] **`pnpm build`** should pass without TypeScript errors before submitting.
- [ ] **Package the `dist/` folder** using `vite-plugin-zip-pack` (already installed) and upload the zip to the Chrome Web Store.
