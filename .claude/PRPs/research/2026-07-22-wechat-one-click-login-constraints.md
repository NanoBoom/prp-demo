---
date: 2026-07-22T15:21:43Z
git_commit: cad758d
branch: main
repository: prp-demo
topic: "WeChat mini-program one-click login technical constraints (Taro 3.6.34, no auth, no backend)"
tags: [research, codebase, taro, weapp, login, auth-constraints]
status: complete
last_updated: 2026-07-22
---

# Research: WeChat one-click login technical constraints in prp-demo

**Date**: 2026-07-22T15:21:43Z  
**Git Commit**: cad758d  
**Branch**: main  
**Repository**: prp-demo

## Research Question

Analyze technical constraints for WeChat mini-program one-click login in this Taro 3.6.34 React app (no existing auth). TRACE: (1) how Taro login APIs plug into entry points, (2) typical weapp login data flow if backend existed, (3) architectural patterns/boundaries of this minimal template, (4) estimated complexity given empty slate + NO BACKEND.

## Summary

`prp-demo` is a minimal Taro 3.6.34 + React 18 weapp shell: five files under `src/`, one page, no login/auth/storage/HTTP code, and no backend in the repository. The only Taro API usage is `useLoad` logging on the index page. WeChat one-click login (especially phone-number / session establishment) requires server-side `code`→`jscode2session`, `session_key` handling, and encrypted payload decryption—none of which have a home in this repo. **Without a backend, the protocol cannot complete a real login session;** the client can only call WeChat APIs that return ephemeral `code` or encrypted blobs that remain unusable for durable identity.

## Detailed Findings

### 1. How Taro login APIs plug into this app (existing entry points)

#### App entry — `src/app.js`

```1:7:src/app.js
import './app.css'

function App({ children }) {
  return children
}

export default App
```

| Surface | Exists? | Evidence |
|---------|---------|----------|
| Pass-through root | Yes | `app.js:3-5` returns `children` |
| `@tarojs/taro` import | No | Entire file |
| `useLaunch` / app lifecycle hooks | No | Entire file |
| Auth init / global Provider | No | Entire file |

`src/app.css` exists and is empty (0 bytes); imported at `app.js:1`.

**Nearest attach point for cold-start `Taro.login`:** inside `App` in `src/app.js` (currently unused for lifecycle).

#### Page entry — `src/pages/index/index.jsx`

```1:15:src/pages/index/index.jsx
import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './index.css'

export default function Index() {
  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View className='index'>
      <Text>Hello, Taro + React!</Text>
    </View>
  )
}
```

| Surface | Exists? | Evidence |
|---------|---------|----------|
| `useLoad` | Yes (log only) | `index.jsx:2,6-8` |
| `Taro.login` / `getUserProfile` / `request` / storage | No | `src/` grep: 0 matches |
| `Button` / `openType` / `getPhoneNumber` | No | Imports: `View`, `Text` only (`index.jsx:1`) |
| Event handlers | No | JSX is static text (`index.jsx:10-13`) |

**Nearest attach points relative to existing files:**

| API | Relative to existing structure |
|-----|--------------------------------|
| `Taro.login()` | `index.jsx:6-8` (`useLoad`) or `app.js` App body |
| User-gesture `getUserProfile` / phone Button | `index.jsx:10-14` JSX tree (would need `Button` from `@tarojs/components`) |
| `Taro.request` / storage | No module today; only possible inline in the two entry files or a new `src/` path that does not exist |

#### Routing / config surfaces

```1:11:src/app.config.js
export default {
  pages: [
    'pages/index/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'prp-demo',
    navigationBarTextStyle: 'black'
  }
}
```

- Single route: `pages/index/index` (`app.config.js:2-4`).
- No login page registration, no `tabBar`, no `permission` / `requiredPrivateInfos` in app config.
- Page config only sets title (`src/pages/index/index.config.js:1-3`).

#### Platform identity already present

- WeChat AppID: `project.config.json:5` — `wx771302d2d6a60bb0`
- `urlCheck: true` (`project.config.json:7`) — request domain checking enabled for any future `Taro.request`
- `compileType: "miniprogram"` (`project.config.json:31`)
- `libVersion: "2.32.3"` (`project.config.json:32`)
- Build scripts target weapp only (`package.json:9-11`)

### 2. Data flow for typical weapp login if a backend existed

Protocol hops mapped to **this repository**:

```
User gesture / page load
  → Taro.login() → temporary code
    → Client POST code to backend
      → Backend jscode2session(AppID + AppSecret) → openid + session_key
        → Backend issues business token/session
          → Client stores token → subsequent requests carry token

Optional phone one-click branch:
  Button open-type getPhoneNumber
    → encryptedData + iv
      → Backend decrypts with session_key → phone number
```

| Hop | Role | Present in repo? | Evidence |
|-----|------|------------------|----------|
| 1. Trigger UI / lifecycle | Client | Lifecycle shell only (`useLoad` log); no Button | `index.jsx:6-8,10-13` |
| 2. `Taro.login` → `code` | Client | Absent | No `login` in `src/` |
| 3. POST `code` to server | Client HTTP | Absent | No `request`/`fetch` in `src/`; `defineConstants: {}` (`config/index.js:14`) |
| 4. `jscode2session` | **Server** (AppSecret) | Absent | No server directory; README tree is client-only |
| 5. Issue token | Server | Absent | — |
| 6. Persist token | Client storage | Absent | No storage APIs in `src/` |
| 7. Authenticated API calls | Client + Server | Absent | — |
| 8. Decrypt phone number | **Server** (`session_key`) | Absent | No Button handler; no decrypt service |

### 3. Architectural patterns and boundaries (what exists)

Layers that **exist**:

1. **WeChat project** — `project.config.json` (AppID, `dist/` root, tool settings)
2. **Taro compile** — `config/index.js` + `dev.js`/`prod.js` + `babel.config.js` (`ts: false`)
3. **Mini-program config** — `app.config.js` (pages + window)
4. **App shell** — `app.js` (pass-through React root)
5. **Single page** — `pages/index/*` (static UI + `useLoad`)

Layers that **do not exist** (factual absences under `src/` and project tree):

- `api/` / `services/` / HTTP client
- `auth` / session / token modules
- `store` / Context / Redux / Zustand
- `utils/` / `hooks/` / shared `components/`
- Login page / route guards
- Env / `defineConstants` API base URL (`config/index.js:14`)
- Backend / cloud functions / BaaS config

Dependency boundary (`package.json:14-25`): Taro 3.6.34 weapp stack + React 18 only; no axios, no state library, no auth SDK.

Template self-description: `package.json:5` — “最简 React 微信小程序模板（基于 Taro）”; README documents the same five-file `src/` layout.

### 4. Estimated complexity (empty slate + NO BACKEND)

| Scope | Complexity reading | Basis in repo |
|-------|-------------------|---------------|
| Client-only API calls (`Taro.login`, Button `getPhoneNumber`) | Low–medium (greenfield on 2 entry files) | Empty attach points at `app.js` / `index.jsx`; no conflicting auth code |
| Client HTTP + storage + UI for a full login UX | Medium (new modules from zero) | No network/storage/UI patterns to reuse |
| End-to-end WeChat one-click login (identity + phone) | **Blocked / high external scope** under **NO BACKEND** | Protocol hops 4–5 and 8 require AppSecret + `session_key` server-side |

**Technical implication of NO BACKEND (constraint, not a product suggestion):**

- WeChat temporary `code` from `Taro.login` cannot be exchanged for `openid`/`session_key` without a server holding AppSecret.
- `getPhoneNumber` payloads are encrypted; decryption requires `session_key` on a trusted server.
- Therefore, with the current repository constraint (client template only, no backend), **product-required “WeChat one-click login” cannot establish a verified, durable login session inside this codebase alone.** Client can invoke WeChat APIs, but identity resolution and phone decryption remain outside the repo’s existing structure.

Rough relative effort if a backend *were* introduced later (for scale only): greenfield client plumbing on this shell is a thin slice; the larger, mandatory slice is server `jscode2session` + session/token + decrypt + domain whitelist (`urlCheck: true`).

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `src/app.js` | 1-7 | Pass-through App; no auth lifecycle |
| `src/app.config.js` | 1-11 | Single page route + window chrome |
| `src/pages/index/index.jsx` | 1-15 | Only `@tarojs/taro` usage (`useLoad`); static UI |
| `src/pages/index/index.config.js` | 1-3 | Page title only |
| `src/pages/index/index.css` | 1-3 | Padding style |
| `src/app.css` | (empty) | Imported by App; 0-byte file |
| `package.json` | 5, 9-11, 14-25 | Minimal weapp template; Taro 3.6.34; no auth deps |
| `config/index.js` | 11-14, 19-20 | `src`→`dist`; empty plugins/`defineConstants` |
| `config/dev.js` | 1-8 | Logger only; no API config |
| `config/prod.js` | 1-4 | Empty mini/h5 stubs |
| `project.config.json` | 5, 7, 31-32 | AppID, `urlCheck`, miniprogram, libVersion |
| `README.md` | 11-28, 52-53 | Documents client-only tree; AppID note |

## Architecture Documentation

```
project.config.json (weapp project + appid)
        ↓
config/ + babel (Taro webpack5 weapp build)
        ↓
app.config.js (pages: index only)
        ↓
app.js (return children)
        ↓
pages/index/index.jsx (useLoad → console.log; View/Text)
```

No horizontal modules (API, auth, store). Compilation output root: `dist/` (`config/index.js:12`; `project.config.json:2`).

## Open Questions

- Whether “one-click login” in the product sense means silent `code` login only, phone-number `getPhoneNumber`, or both—protocol requirements differ, but both need a backend for verified identity.
- Whether any external backend (not in this repo) already exists; this repository contains no client URL, env, or contract pointing to one (`defineConstants` empty; no request code).
- Intended handling of `project.config.json` AppID vs production AppID (README notes replacement before release).
