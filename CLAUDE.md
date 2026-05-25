# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (HMR via CRXJS)
pnpm build        # Type-check + build to dist/
pnpm preview      # Preview the built extension
```

To load the extension during development:
1. Run `pnpm dev`
2. Go to `chrome://extensions/`, enable **Developer mode**
3. Load unpacked from the `dist/` directory
4. CRXJS handles hot-reloading — no need to reload the extension manually

There are no tests configured yet.

## Architecture

This is a **Chrome Extension MV3** built with React + TypeScript + Vite, using the [CRXJS Vite plugin](https://crxjs.dev/vite-plugin) which auto-generates the packaged extension from `src/manifest.ts`.

### Entry points

| Entry | Purpose |
|-------|---------|
| `src/manifest.ts` | Extension manifest (permissions, icons, popup, background) |
| `src/popup/main.tsx` | Popup UI mount point |
| `src/popup/App.tsx` | Main popup component |
| `src/background/index.ts` | Service worker (background script) |

### State management

Global state lives in `src/popup/atoms.ts` using [Jotai](https://jotai.org/) primitive atoms. The central model is `BookmarkRecord` defined in `src/lib/types.ts` — it holds `title`, `url`, `note`, `favicon`, and optional fields (`id`, `summary`, `tags`, `created_at`).

The popup queries the active tab via `chrome.tabs.query` to pre-fill `title`, `url`, and `favicon` on mount. Persistence to Chrome storage is not yet implemented — `handleSave` currently only logs.

### Chrome APIs in use

- `chrome.tabs` — read active tab info (title, url, favIconUrl)
- `chrome.storage` — declared in permissions, not yet wired up
- `chrome.runtime` — `onInstalled` listener in background script

### Build output

`pnpm build` produces a `dist/` directory ready to load as an unpacked Chrome extension. `vite-plugin-zip-pack` is available for packaging a release zip.
