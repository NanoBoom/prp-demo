# Investigation: Address PR #1 review follow-ups (login session smoke + appid)

**Issue**: #1 (https://github.com/NanoBoom/prp-demo/pull/1)
**Type**: ENHANCEMENT
**Investigated**: 2026-07-22T08:10:00Z

> **Note**: GitHub `#1` is an **open Pull Request** (`feature/login-session-model` → `main`), not a classic Issue. This artifact plans follow-up fixes from the posted PR review (M1/M2 + optional L1/L3). Do **not** open a second PR from `main` for the same work — implement on the existing PR branch.

### Assessment

| Metric     | Value  | Reasoning |
| ---------- | ------ | --------- |
| Priority   | MEDIUM | Review APPROVE with medium follow-ups: smoke is a false-green risk before Phase 2 login, and template `appid` surprises clones; neither blocks merge of Phase 1 core, but both are called out for pre-merge / pre-Phase-2 handling. |
| Complexity | MEDIUM | Touches 3–4 files (`loginSession.core.js` CREATE, thin wrapper UPDATE, smoke rewrite, `project.config.json`); introduces a small storage-adapter seam with no prior pattern in-repo; low runtime risk if public API preserved. |
| Confidence | HIGH   | Review findings map 1:1 to current code (`loginSession.js:35`, smoke L7–60 duplicate, `project.config.json:5`, missing EOF newline); root causes and recommended fixes are explicit. |

---

## Problem Statement

PR #1 delivers Phase 1 local login session storage and was approved with follow-ups. The Node smoke script re-implements the session API instead of exercising `loginSession.js`, so regressions in the real module would still pass. Separately, `project.config.json` embeds a concrete WeChat AppID in a “最简模板” repo, conflicting with README’s “replace with your own AppID” guidance. Small polish items (log naming, EOF newline) remain.

---

## Analysis

### Root Cause / Change Rationale

**M1 — false green smoke**

WHY: Smoke can pass while `loginSession.js` is broken  
↓ BECAUSE: Smoke never imports the production module  
Evidence: `src/utils/loginSession.smoke.js:21-60` redefines `getLoginSession` / `setLoggedIn` / `clearLoginSession` / `isLoggedIn` locally  

↓ BECAUSE: Production module imports `@tarojs/taro`, which cannot run under plain Node  
Evidence: `src/utils/loginSession.js:7` — `import { setStorageSync, getStorageSync, removeStorageSync } from '@tarojs/taro'`  

↓ ROOT CAUSE: Session logic is coupled to Taro inside the same module, forcing a copy for Node  
Evidence: no storage-adapter seam; plan explicitly allowed optional Node smoke mirroring Sync semantics (`.claude/PRPs/plans/completed/login-session-model.plan.md`)

**M2 — template AppID**

WHY: Clones bind to someone else’s mini program by default  
↓ BECAUSE: `appid` was changed from placeholder to a concrete value  
Evidence: `project.config.json:5` — `"appid": "wx771302d2d6a60bb0"` (introduced in `0704a6f`, not the Phase 1 session commit)  

↓ ROOT CAUSE: Build-fix commit altered template project identity without documenting intent in the PR body  
Evidence: README still says replace `appid` before release (`README.md:53`); `description` still says 最简模板 (`project.config.json:4`)

**L1** — plan template used `'setLoginSession failed'` while the exported function is `setLoggedIn` (`loginSession.js:28` vs `:35`).

**L3** — `project.config.json` ends with `}` and no trailing newline (byte evidence / git `\ No newline at end of file` from `0704a6f`).

### Evidence Chain

WHY: Smoke is a false green  
↓ BECAUSE: duplicate API bodies in smoke  
Evidence: `loginSession.smoke.js:24-60` ≈ `loginSession.js:13-49`  

↓ BECAUSE: Taro import blocks Node from loading production module  
Evidence: `loginSession.js:7`  

↓ ROOT CAUSE: no Taro-free core / storage adapter  
Evidence: only one utils module; no adapters elsewhere in repo  

### Affected Files

| File | Lines | Action | Description |
| ---- | ----- | ------ | ----------- |
| `src/utils/loginSession.core.js` | NEW | CREATE | Pure session API factory taking Sync storage adapter |
| `src/utils/loginSession.js` | 1–49 | UPDATE | Thin Taro wrapper re-exporting same public API |
| `src/utils/loginSession.smoke.js` | ALL | UPDATE | Import core + Map adapter; drop duplicated API; keep asserts |
| `project.config.json` | 5, EOF | UPDATE | Revert `appid` → `touristappid`; ensure trailing newline |

### Integration Points

- `src/pages/index/index.jsx:3,9` — only caller; imports `isLoggedIn` from `../../utils/loginSession` (must keep working)
- Public exports to preserve: `LOGIN_SESSION_KEY`, `getLoginSession`, `setLoggedIn`, `clearLoginSession`, `isLoggedIn`
- No other `src/` callers of set/clear/get
- Smoke run command today: `node src/utils/loginSession.smoke.js` (no npm script)

### Git History

- **Introduced (session)**: `849a3ba` - 2026-07-22 - "feat: add local login session storage model for Phase 1."
- **AppID change**: `0704a6f` - 2026-07-22 - "fix Taro weapp build with webpack pin, patches, and PRP docs." (`touristappid` → `wx771302d2d6a60bb0`, missing EOF newline)
- **Implication**: Review items are follow-ups on an open PR, not a regression from `main`; fix on `feature/login-session-model`.

---

## Implementation Plan

### Step 1: Extract Taro-free core with storage adapter

**File**: `src/utils/loginSession.core.js`  
**Lines**: NEW  
**Action**: CREATE  

**Required change:**

```javascript
/**
 * Pure login-session logic (no Taro).
 * storage adapter must match Sync semantics: missing key → ''.
 */
export const LOGIN_SESSION_KEY = 'loginSession'

const DEFAULT_SESSION = { isLoggedIn: false, loginAt: 0 }

export function createLoginSessionApi(storage) {
  const { setStorageSync, getStorageSync, removeStorageSync } = storage

  function getLoginSession() {
    try {
      const value = getStorageSync(LOGIN_SESSION_KEY)
      if (value && typeof value === 'object' && value.isLoggedIn === true) {
        return {
          isLoggedIn: true,
          loginAt: typeof value.loginAt === 'number' ? value.loginAt : 0
        }
      }
    } catch (e) {
      console.log('getLoginSession failed', e)
    }
    return { ...DEFAULT_SESSION }
  }

  function setLoggedIn() {
    try {
      setStorageSync(LOGIN_SESSION_KEY, {
        isLoggedIn: true,
        loginAt: Date.now()
      })
    } catch (e) {
      console.log('setLoggedIn failed', e)
    }
  }

  function clearLoginSession() {
    try {
      removeStorageSync(LOGIN_SESSION_KEY)
    } catch (e) {
      console.log('clearLoginSession failed', e)
    }
  }

  function isLoggedIn() {
    return getLoginSession().isLoggedIn === true
  }

  return {
    LOGIN_SESSION_KEY,
    getLoginSession,
    setLoggedIn,
    clearLoginSession,
    isLoggedIn
  }
}
```

**Why**: Single source of truth for session rules; smoke and Taro wrapper share it (review M1 preferred fix). Also fixes L1 naming in the shared catch path.

---

### Step 2: Thin Taro wrapper preserving public API

**File**: `src/utils/loginSession.js`  
**Lines**: 1–49  
**Action**: UPDATE  

**Current code:**

```javascript
import { setStorageSync, getStorageSync, removeStorageSync } from '@tarojs/taro'
// ... full inlined get/set/clear/isLoggedIn ...
```

**Required change:**

```javascript
/**
 * 本地登录会话（key: loginSession）。
 * 字段：{ isLoggedIn: boolean, loginAt: number }。
 * 禁止持久化 code / openid / session_key。
 * 供 Phase 2 一键登录与 Phase 3 启动恢复/退出复用。
 */
import { setStorageSync, getStorageSync, removeStorageSync } from '@tarojs/taro'
import { createLoginSessionApi, LOGIN_SESSION_KEY } from './loginSession.core'

const api = createLoginSessionApi({
  setStorageSync,
  getStorageSync,
  removeStorageSync
})

export { LOGIN_SESSION_KEY }
export const getLoginSession = api.getLoginSession
export const setLoggedIn = api.setLoggedIn
export const clearLoginSession = api.clearLoginSession
export const isLoggedIn = api.isLoggedIn
```

**Why**: Keep `index.jsx` import path and export surface unchanged; move logic to core.

---

### Step 3: Rewrite smoke to import core (not a copy)

**File**: `src/utils/loginSession.smoke.js`  
**Action**: UPDATE (prefer rename to `.mjs` if Node needs ESM extension)

**Current problem:** L7–60 duplicate production logic.

**Required change:**

1. Keep in-memory Map Sync mock (missing key → `''`).
2. Dynamically import or static-import `createLoginSessionApi` from `./loginSession.core.js`.
3. Bind asserts to the API returned by the factory (same scenarios 1–4 as today).
4. Do **not** redefine get/set/clear/isLoggedIn bodies.

Because `package.json` has no `"type": "module"` and Node is v20:

- **Preferred**: rename smoke to `src/utils/loginSession.smoke.mjs` and run `node src/utils/loginSession.smoke.mjs`, **or**
- Keep `.js` and run with `node --experimental-default-type=module src/utils/loginSession.smoke.js`

Example smoke body:

```javascript
/**
 * Node smoke for loginSession storage contract (no WeChat runtime).
 * Imports real core logic via createLoginSessionApi + Map storage adapter.
 * Run: node src/utils/loginSession.smoke.mjs
 */
import { createLoginSessionApi, LOGIN_SESSION_KEY } from './loginSession.core.js'

const storage = new Map()

const { getLoginSession, setLoggedIn, clearLoginSession, isLoggedIn } =
  createLoginSessionApi({
    setStorageSync(key, data) { storage.set(key, data) },
    getStorageSync(key) { return storage.has(key) ? storage.get(key) : '' },
    removeStorageSync(key) { storage.delete(key) }
  })

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// keep existing scenarios 1–4 unchanged...
console.log('loginSession smoke OK')
```

If renaming to `.mjs`, delete old `.smoke.js` (or leave a one-line redirect comment file — prefer delete to avoid dual entrypoints).

**Why**: Smoke fails if core contract breaks; eliminates false green (M1).

---

### Step 4: Revert template appid + EOF newline

**File**: `project.config.json`  
**Lines**: 5, EOF  
**Action**: UPDATE  

**Current code:**

```json
  "appid": "wx771302d2d6a60bb0",
```

**Required change:**

```json
  "appid": "touristappid",
```

Also ensure file ends with a trailing newline after the final `}`.

**Why**: Repo presents as 最简模板 (`project.config.json:4`, `README.md:53`). Real AppID remains documented in PRD for local demo use; clones should not inherit a personal AppID by default (M2 + L3).

**Do not** rewrite PRD/research AppID mentions in this pass — they record the demo AppID historically; optional doc sync is out of scope unless implementer has spare capacity.

---

### Step 5: Validation only (no new test framework)

**Test cases already covered by smoke** (must still pass after rewrite):

- missing key → logged out, `loginAt === 0`
- `''` / `{ isLoggedIn: false }` → logged out
- `setLoggedIn` → logged in, numeric `loginAt`, no `code`/`openid` in session or raw store
- `clearLoginSession` removes only session key

Optional regression probe (manual): temporarily break core (e.g. force `isLoggedIn: false` in `setLoggedIn`) and confirm smoke fails — proves M1 fix.

---

## Patterns to Follow

**From codebase — mirror these exactly:**

```javascript
// SOURCE: src/utils/loginSession.js:16-20
// Strict === true guard (do not use truthy checks on storage values)
if (value && typeof value === 'object' && value.isLoggedIn === true) {
  return {
    isLoggedIn: true,
    loginAt: typeof value.loginAt === 'number' ? value.loginAt : 0
  }
}
```

```javascript
// SOURCE: src/utils/loginSession.smoke.js:13-15
// WeChat Sync missing-key semantics for Node Map mock
function getStorageSync(key) {
  return storage.has(key) ? storage.get(key) : ''
}
```

```javascript
// SOURCE: src/pages/index/index.jsx:3
// Public import path must remain stable
import { isLoggedIn } from '../../utils/loginSession'
```

```javascript
// SOURCE: src/utils/loginSession.js:22-24
// Error handling: catch + console.log, no rethrow (Phase 1)
} catch (e) {
  console.log('getLoginSession failed', e)
}
```

---

## Edge Cases & Risks

| Risk/Edge Case | Mitigation |
| -------------- | ---------- |
| ESM vs CJS for Node smoke | Use `.mjs` or `node --experimental-default-type=module`; document exact run command in smoke header |
| Breaking `index.jsx` imports | Keep re-exports on `loginSession.js` identical |
| Webpack/Taro resolves `.core` | Plain relative ESM import; no new deps |
| Local demo needs real AppID | Developers set AppID locally / via WeChat DevTools; README already instructs this |
| L2 void return on write failure | Defer to Phase 2 (review: Phase 1 OK) |

---

## Validation

### Automated Checks

```bash
# No type-check / lint scripts in this repo
node src/utils/loginSession.smoke.mjs
# or: node --experimental-default-type=module src/utils/loginSession.smoke.js

npm run build
```

### Manual Verification

1. Smoke prints `loginSession smoke OK` and exits 0.
2. Intentionally break `createLoginSessionApi` set path → smoke must fail (proves real module coverage).
3. `index.jsx` still builds; Console still logs `session false` when empty storage.
4. `project.config.json` shows `touristappid` and has trailing newline.

---

## Scope Boundaries

**IN SCOPE:**

- M1: extract `loginSession.core.js` + rewrite smoke to import it
- M2: revert `appid` to `touristappid`
- L1: align catch log to `setLoggedIn failed` (via core)
- L3: trailing newline on `project.config.json`
- Preserve public API of `loginSession.js`

**OUT OF SCOPE (do not touch):**

- L2: changing `setLoggedIn` to return boolean / rethrow (Phase 2)
- L4: splitting historical feature vs build commits
- Phase 2 `Taro.login` / UI login button
- Rewriting PRD/research AppID narrative (optional later)
- Adding jest/vitest or npm test harness beyond smoke
- Build/webpack/patch-package changes

---

## Metadata

- **Investigated by**: Claude
- **Timestamp**: 2026-07-22T08:10:00Z
- **Artifact**: `.claude/PRPs/issues/issue-1.md`
- **PR already open**: https://github.com/NanoBoom/prp-demo/pull/1 — implement on `feature/login-session-model`
