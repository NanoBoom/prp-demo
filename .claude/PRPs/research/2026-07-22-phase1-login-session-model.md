---
date: 2026-07-22T15:28:48Z
git_commit: cad758d
branch: main
repository: prp-demo
topic: "Phase 1 login session model (local storage encapsulation for isLoggedIn/loginAt)"
tags: [research, codebase, taro, weapp, login, session, storage, phase1]
status: complete
last_updated: 2026-07-22
---

# Research: Phase 1 login session model (local storage for isLoggedIn/loginAt)

**Date**: 2026-07-22T15:28:48Z  
**Git Commit**: cad758d  
**Branch**: main  
**Repository**: prp-demo

## Research Question

Analyze the implementation details relevant to Phase 1 login session model (local storage encapsulation for `isLoggedIn`/`loginAt`) in this Taro 3.6.34 React weapp. TRACE: (1) entry points, (2) data flow, (3) state changes, (4) contracts, (5) patterns in use.

## Summary

Phase 1’s planned local session model (`isLoggedIn`, `loginAt`, storage read/write encapsulation) has **zero implementation** under `src/`. The live app is a five-file Taro shell: a pass-through `App`, a single static `Index` page whose only Taro side effect is `console.log` on `useLoad`, and config files with no auth/storage fields. There is no `utils/` module, no Taro storage API call, and no React state for login. Planned field names and storage encapsulation appear only in the PRD (`.claude/PRPs/prds/wechat-one-click-login.prd.md`); prior research already recorded the same empty-slate auth surface.

## Detailed Findings

### 1. Entry points — where Phase 1-related code would attach to what exists

#### 1.1 Application root — `src/app.js`

```1:7:src/app.js
import './app.css'

function App({ children }) {
  return children
}

export default App
```

| Surface | Present? | Evidence |
|---------|----------|----------|
| Default-exported React root | Yes | `app.js:3-7` |
| Receives Taro-injected `children` | Yes | `app.js:3-4` |
| `@tarojs/taro` import | No | Entire file |
| Lifecycle / launch hooks | No | Entire file |
| Storage / session read | No | Entire file |
| Context Provider / global state | No | Entire file |

`src/app.css` exists as a 0-byte file imported at `app.js:1`.

PRD names this file as an optional attach point for startup session restore (Phase 3 wording; not implemented): `wechat-one-click-login.prd.md:101`.

#### 1.2 Page entry — `src/pages/index/index.jsx`

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

| Surface | Present? | Evidence |
|---------|----------|----------|
| Default-exported page component | Yes | `index.jsx:5,15` |
| `useLoad` | Yes (log only) | `index.jsx:2,6-8` |
| `useState` / props | No | Entire file |
| `Taro.setStorage*` / `getStorage*` | No | Entire file; `src/` grep 0 |
| `isLoggedIn` / `loginAt` | No | Entire file; `src/` grep 0 |
| `Button` / login UI | No | Imports: `View`, `Text` only (`index.jsx:1`) |

PRD names this file as the UI/login integration point: `wechat-one-click-login.prd.md:101`.

#### 1.3 Routing / config entries

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

```1:3:src/pages/index/index.config.js
export default {
  navigationBarTitleText: '首页'
}
```

- Single registered page: `pages/index/index` (`app.config.js:2-4`).
- No login route, `tabBar`, or permission / private-info fields in app config.
- Page config only sets navigation title (`index.config.js:1-3`).

#### 1.4 Future / shared utils path

| Path / concern | Live status | Evidence |
|----------------|-------------|----------|
| `src/utils/` | Does not exist | Glob under `src/` yields only `app.js`, `app.config.js`, `app.css`, `pages/index/*` |
| `src/services/`, `src/auth/`, `src/session/`, `src/store/`, `src/hooks/` | Do not exist | Glob `**/{utils,services,auth,session,store}/**` → 0 |
| Imports of such modules from `src/` | None | No matching import statements |

PRD Phase 1 scope text (planning only, not code):

```126:129:.claude/PRPs/prds/wechat-one-click-login.prd.md
**Phase 1: 登录态模型**
- **Goal**: 有稳定、可测的本地登录态读写
- **Scope**: storage key、字段（如 `isLoggedIn`、`loginAt`）；无后端
- **Success signal**: 单元/手工：写入后可读、可清除
```

Architecture note in PRD (planning only):

```100:101:.claude/PRPs/prds/wechat-one-click-login.prd.md
- 栈：Taro 3.6.34 + React 18，单页 `pages/index`；无 API/auth 层，需新建轻量登录状态读写（建议 `Taro.setStorageSync`）
- 集成点：`src/pages/index/index.jsx`（按钮与状态 UI）；可选在 `src/app.js` 启动时读本地态
```

#### 1.5 Build / dependency surfaces (no session logic)

```11:14:config/index.js
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
```

```14:25:package.json
  "dependencies": {
    "@babel/runtime": "^7.24.0",
    "@tarojs/components": "3.6.34",
    "@tarojs/helper": "3.6.34",
    "@tarojs/plugin-framework-react": "3.6.34",
    "@tarojs/plugin-platform-weapp": "3.6.34",
    "@tarojs/react": "3.6.34",
    "@tarojs/runtime": "3.6.34",
    "@tarojs/shared": "3.6.34",
    "@tarojs/taro": "3.6.34",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
```

- `@tarojs/taro` is present (storage APIs available via the dependency, unused in `src/`).
- No Redux / Zustand / MobX / auth SDK dependencies.
- `defineConstants` is empty (`config/index.js:14`).

README documents the same five-file `src/` tree with no auth/utils layer (`README.md:18-26`).

---

### 2. Data flow — how data moves today

Observed runtime path:

```
WeChat DevTools / device
        │
        ▼
Taro React runtime (createReactApp + page registration)
        │
        ├─► app.config.js pages[] ──► pages/index/index
        │
        ▼
App({ children })     ← no transform of children
        │
        ▼
Index()               ← no custom props
        │
        ├─ useLoad ──► console.log('Page loaded.')
        │
        └─ JSX ──► View > Text("Hello, Taro + React!")
```

| Channel | Present in live code? | Evidence |
|---------|----------------------|----------|
| React props App → Index | No custom props; Index takes none | `app.js:3-4`; `index.jsx:5` |
| React `useState` / Context / store | No | `src/` grep for `useState` / Context → 0 |
| Taro storage read/write | No | `src/` grep for storage APIs → 0 |
| HTTP / `Taro.request` | No | `src/` grep → 0 |
| Cross-page shared state | N/A (single page) | `app.config.js:2-4` |
| Session fields `isLoggedIn` / `loginAt` | No runtime data | `src/` grep → 0 |

There is no data path that persists or restores a login session.

---

### 3. State changes — side effects in related functions

#### 3.1 `Index` — `useLoad`

```6:8:src/pages/index/index.jsx
  useLoad(() => {
    console.log('Page loaded.')
  })
```

- Trigger: page load lifecycle via Taro’s `useLoad`.
- Effect: console string only.
- Does not: mutate React state, call storage APIs, invoke `Taro.login`, or set `isLoggedIn`/`loginAt`.

#### 3.2 `App` — render

```3:5:src/app.js
function App({ children }) {
  return children
}
```

- No `useEffect`, launch hook, or storage restore.
- No side effects beyond importing empty `app.css`.

#### 3.3 Other hooks / handlers

| Mechanism | Present? |
|-----------|----------|
| `useEffect` / `useDidShow` / `useReady` | No in `src/` |
| Click / form event handlers | No in `index.jsx` |
| Storage write / clear | No in `src/` |

**Net:** the only documented runtime side effect in application source is `console.log` on page load (`index.jsx:6-8`).

---

### 4. Contracts — interfaces and expectations between components

#### 4.1 `App` contract

| Item | Current contract |
|------|------------------|
| Export | `export default App` (`app.js:7`) |
| Props | `{ children }` from Taro (`app.js:3`) |
| Return | `children` unchanged (`app.js:4`) |
| Session / storage expectations | None defined in code |

#### 4.2 `Index` contract

| Item | Current contract |
|------|------------------|
| Export | `export default function Index()` (`index.jsx:5`) |
| Props | None |
| Named exports | None |
| Session / storage expectations | None defined in code |

#### 4.3 Config contracts (consumed by Taro build, not imported by `app.js`)

| File | Contract |
|------|----------|
| `app.config.js:1-11` | `pages[0]` default home; `window` chrome keys |
| `index.config.js:1-3` | `navigationBarTitleText: '首页'` |
| `config/index.js:11-12` | Compile `src` → `dist` |
| `project.config.json` (AppID / `miniprogramRoot`) | WeChat project binding; no session field schema |

#### 4.4 Phase 1 planned concepts vs live code

| PRD Phase 1 concept (`prd.md:126-129`) | Live code |
|----------------------------------------|-----------|
| Storage key name | Undefined |
| Field `isLoggedIn` | Zero references in `src/` |
| Field `loginAt` | Zero references in `src/` |
| Read / write / clear encapsulation | No module or functions |
| Success signal (write → read → clear) | Not implementable against current `src/` |

Open product questions in the PRD about field shape remain unanswered in code as well as product docs:

```45:45:.claude/PRPs/prds/wechat-one-click-login.prd.md
- [ ] 本地会话字段规范：仅用 `isLoggedIn`，还是同时缓存 `Taro.login` 返回的 `code`（code 约 5 分钟失效，不宜当长期身份）
```

#### 4.5 Style contracts

- `app.js:1` → `./app.css` (0 bytes).
- `index.jsx:3` → `./index.css` with `.index { padding: 40px; }` (`index.css:1-3`).

---

### 5. Patterns in use — architectural decisions visible in live code

| Pattern | Evidence | Observation |
|---------|----------|-------------|
| Minimal Taro React template | `package.json:5`; five files under `src/` | No horizontal layers |
| Pass-through App shell | `app.js:3-5` | Root does not host business logic |
| Page-scoped lifecycle hook | `useLoad` at `index.jsx:6-8` | Side effects on the page, not App |
| Config co-located with UI | `*.config.js` beside `*.jsx` | Taro convention |
| CSS co-located with page | `index.css` next to `index.jsx` | No shared theme layer |
| No client state management | No `useState`/Context/store deps | Nowhere for session UI state today |
| No persistence abstraction | No storage calls in `src/` | Phase 1 encapsulation absent |
| Empty compile constants | `defineConstants: {}` (`config/index.js:14`) | No env-injected session keys |
| Documented client-only tree | `README.md:18-26` | Matches live layout |

Prior research on the same empty auth surface: `.claude/PRPs/research/2026-07-22-wechat-one-click-login-constraints.md` (commit `cad758d`).

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `src/app.js` | 1-7 | Pass-through App; no session lifecycle |
| `src/app.css` | (0 bytes) | Imported by App; empty |
| `src/app.config.js` | 1-11 | Single page route + window chrome |
| `src/pages/index/index.jsx` | 1-15 | Only `@tarojs/taro` usage (`useLoad`); static UI |
| `src/pages/index/index.config.js` | 1-3 | Page title only |
| `src/pages/index/index.css` | 1-3 | Page padding |
| `package.json` | 5, 9-11, 14-25 | Minimal weapp template; Taro 3.6.34; no auth/state libs |
| `config/index.js` | 11-14, 19-20 | `src`→`dist`; empty plugins/`defineConstants` |
| `README.md` | 18-26 | Documents client-only `src/` tree |
| `.claude/PRPs/prds/wechat-one-click-login.prd.md` | 100-101, 117-129, 45 | Phase 1 scope & field names (planning) |
| `.claude/PRPs/research/2026-07-22-wechat-one-click-login-constraints.md` | (full) | Prior empty-slate auth/storage findings |

## Architecture Documentation

```
project.config.json (weapp + appid)
        ↓
config/ + babel (Taro webpack5 weapp)
        ↓
app.config.js (pages: index only)
        ↓
app.js (return children; no storage)
        ↓
pages/index/index.jsx (useLoad → console.log; View/Text)
```

No `utils` / auth / session / store layer. No local storage encapsulation. Phase 1 concepts `isLoggedIn` and `loginAt` exist as PRD vocabulary only.

## Open Questions

- Whether a storage key name and exact field schema for Phase 1 have been decided outside this repo (PRD open question at `prd.md:45` remains unchecked; no code encodes a decision).
- Whether any non-`src` tooling (tests, mocks) for session read/write exists — none found under project source; no test files referencing `isLoggedIn`/`loginAt`.
