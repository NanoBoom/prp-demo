# Feature: 登录态模型（本地 Session Storage）

## Summary

为微信一键登录演示（方案 B）建立 Phase 1 基础设施：在 `src/utils/loginSession.js` 中用 `Taro.setStorageSync` / `getStorageSync` / `removeStorageSync` 封装本地会话 `{ isLoggedIn, loginAt }` 的读写与清除。本阶段不改 UI、不调用 `Taro.login`、不存 `code`/OpenID。

## User Story

As a 实现与后续 Phase 的调用方
I want to 通过稳定 API 写入/读取/清除本地登录态
So that Phase 2/3 可在按钮登录与启动恢复时复用同一会话契约

## Problem Statement

仓库无任何 storage/auth 抽象，后续一键登录无法可靠持久化「已登录」；需先交付可验证的本地会话模型（写入后可读、可清除）。

## Solution Statement

新增纯 JS 工具模块 `src/utils/loginSession.js`：固定 storage key、结构化对象、`getLoginSession` / `setLoggedIn` / `clearLoginSession` / `isLoggedIn`；Sync API + `try/catch`；缺 key 时返回未登录默认值。可选极简 Node 冒烟脚本验证纯逻辑（或开发者工具 Storage 面板手工验）。

## Metadata

| Field            | Value |
| ---------------- | ----- |
| Type             | NEW_CAPABILITY |
| Complexity       | LOW |
| Systems Affected | `src/utils`（新建）、本地 Storage |
| Dependencies     | `@tarojs/taro@3.6.34`（storage Sync API） |
| Estimated Tasks  | 4 |

---

## Lifecycle (append-only)

- **Created:** 2026-07-22T15:32:00+08:00
- **Modified:** 2026-07-22T15:32:00+08:00
- **Commits:**
- **Agent / Session:**
- **Back refs:** `.claude/PRPs/prds/wechat-one-click-login.prd.md` — Phase 1 登录态模型
- **Forward refs:**

> **Append-only:** `Created` is set once; every other field is a list you only ever add to — never overwrite or remove existing entries. Keep references bidirectional: when you add a back/forward ref here, add the reciprocal ref on the other plan.

---

## UX Design

### Before State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              BEFORE STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐            ║
║   │  App.js     │ ──────► │ pages/index │ ──────► │ 静态文案    │            ║
║   │ 透传children│         │ useLoad log │         │ Hello Taro  │            ║
║   └─────────────┘         └─────────────┘         └─────────────┘            ║
║                                                                               ║
║   USER_FLOW: 打开小程序 → 看 Hello → 无登录概念                               ║
║   PAIN_POINT: 无本地会话；无法写/读/清「已登录」                              ║
║   DATA_FLOW: 无 props/state/storage 通路                                      ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### After State

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                               AFTER STATE                                      ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐       ║
║   │ pages/index │ (未改)  │ loginSession.js  │ ──────► │ Storage key │       ║
║   │ 仍静态文案  │         │ get/set/clear    │         │ loginSession│       ║
║   └─────────────┘         └──────────────────┘         └─────────────┘       ║
║                                   │                                           ║
║                                   ▼                                           ║
║                          ┌─────────────────┐                                  ║
║                          │ {isLoggedIn,    │  ◄── Phase 1 新能力              ║
║                          │  loginAt}       │                                  ║
║                          └─────────────────┘                                  ║
║                                                                               ║
║   USER_FLOW: 本阶段终端用户 UI 不变；开发者可调用 API 验证读写清除            ║
║   VALUE_ADD: Phase 2/3 可复用同一会话契约                                     ║
║   DATA_FLOW: 调用方 → loginSession API → Taro.*StorageSync → 本地缓存         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### Interaction Changes

| Location | Before | After | User_Action | Impact |
| -------- | ------ | ----- | ----------- | ------ |
| `src/utils/loginSession.js` | 不存在 | 会话读写 API | （开发者）调用 set/get/clear | 可持久化本地登录标志 |
| `pages/index` | 无会话 | 仍无 UI 变化（Phase 1） | 无 | 用户感知不变直至 Phase 2 |

---

## Mandatory Reading

**CRITICAL: Implementation agent MUST read these files before starting any task:**

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `src/pages/index/index.jsx` | 1-15 | 现有 import/默认导出/JS 风格（本阶段不改 UI，但保持同风格） |
| P0 | `.claude/PRPs/prds/wechat-one-click-login.prd.md` | 126-129, 99-102, 45 | Phase 1 范围与禁止存 code |
| P1 | `README.md` | 11-26 | 目录约定；新增 `src/utils/` |
| P2 | `node_modules/@tarojs/taro/types/api/storage/index.d.ts` | 172-177, 253-256, 218-221 | Sync API 签名 |

**External Documentation:**
| Source | Section | Why Needed |
|--------|---------|------------|
| [Taro setStorageSync](https://docs.taro.zone/docs/apis/storage/setStorageSync) | API | 写入契约 |
| [Taro getStorageSync](https://docs.taro.zone/docs/apis/storage/getStorageSync) | API | 读取；缺 key 行为 |
| [Taro removeStorageSync](https://docs.taro.zone/docs/apis/storage/removeStorageSync) | API | 清除单 key |
| [微信 Storage 能力](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/storage.html) | 隔离与清理 | 勿用 clearStorage 清全局 |
| [微信登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html) | code 语义 | 禁止把 code 当长期身份 |

---

## Patterns to Mirror

**NAMING_CONVENTION:**

```javascript
// SOURCE: src/pages/index/index.jsx:1-5
// COPY THIS PATTERN: JS 默认导出函数组件；同目录资源；无 TS
import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import './index.css'

export default function Index() {
```

**ERROR_HANDLING:**

```javascript
// SOURCE: 项目 src/ 无既有 try/catch；MIRROR 官方 Sync 示例模式
// COPY THIS PATTERN: Sync 调用包 try/catch，失败时回退安全默认值
try {
  Taro.setStorageSync(KEY, data)
} catch (e) {
  console.log('setLoginSession failed', e)
}
```

**LOGGING_PATTERN:**

```javascript
// SOURCE: src/pages/index/index.jsx:6-8
// COPY THIS PATTERN: 短英文 console.log；无 logger 封装
useLoad(() => {
  console.log('Page loaded.')
})
```

**MODULE_PATTERN:**

```text
// SOURCE: README.md 目录约定 + 仓库无 utils 先例
// COPY THIS PATTERN: 新建 src/utils/<name>.js；命名导出函数；纯 JS
```

**TEST_STRUCTURE:**

```text
// SOURCE: package.json — 无 jest/vitest；无 *.test.*
// COPY THIS PATTERN: 本阶段不强制单测框架；用手工 Storage 验收 + 可选 Node 冒烟（若纯逻辑可抽）
```

---

## Files to Change

| File | Action | Justification |
| ---- | ------ | ------------- |
| `src/utils/loginSession.js` | CREATE | 本地会话读写清除封装 |
| `src/utils/loginSession.smoke.js` | CREATE（可选） | 无测试框架时的最小可执行校验脚本；若仅手工验可跳过并在任务中标说明 |

---

## NOT Building (Scope Limits)

- 首页登录按钮 / `Taro.login` — Phase 2
- 启动恢复 UI / 退出按钮 — Phase 3
- 真实 OpenID / code2Session / 云开发 — PRD 方案 B 排除
- 持久化 `code` / `session_key` / 手机号 — 禁止
- `clearStorageSync` 清全部缓存 — 危险，禁止用于退出
- 引入 TypeScript / 状态库 / 测试框架 — 超出本模板最简约束
- 修改 `app.js` / `index.jsx` UI — 留给后续 Phase

---

## Step-by-Step Tasks

Execute in order. Each task is atomic and independently verifiable.

**Status markers** — prefix EVERY task header with one; the build agent updates it inline as it works: `[ ]` idle · `[wip]` in progress · `[x]` complete · `[f]` failed. All tasks start `[ ]`.

### `[ ]` Task 1: CREATE `src/utils/loginSession.js`

- **ACTION**: CREATE 本地登录态模块
- **IMPLEMENT**:
  - 常量 `LOGIN_SESSION_KEY = 'loginSession'`
  - 形状：`{ isLoggedIn: boolean, loginAt: number }`（`loginAt` 为 `Date.now()`）
  - `getLoginSession()` → 缺省 / 非法数据时返回 `{ isLoggedIn: false, loginAt: 0 }`；合法时返回对象；用 `session?.isLoggedIn === true` 判断，勿对 `getStorageSync` 结果直接 `if (value)`
  - `setLoggedIn()` → `setStorageSync(KEY, { isLoggedIn: true, loginAt: Date.now() })`，包 try/catch
  - `clearLoginSession()` → `removeStorageSync(KEY)`，包 try/catch（**禁止** `clearStorageSync`）
  - `isLoggedIn()` → `getLoginSession().isLoggedIn === true`
  - **禁止**写入 `code` / `openid` / `session_key` 字段
- **MIRROR**: `src/pages/index/index.jsx:1-8` — JS、命名导出/短日志风格；错误用 try/catch + `console.log`
- **IMPORTS**: `import Taro from '@tarojs/taro'`（或 `import { setStorageSync, getStorageSync, removeStorageSync } from '@tarojs/taro'`，与项目现有 named import 风格一致时优先 named）
- **GOTCHA**: 缺 key 时微信常返回 `''`；存结构化对象并用 `=== true`。勿持久化 login `code`（五分钟失效）
- **VALIDATE**: `Test-Path src/utils/loginSession.js`（PowerShell）且文件含 `LOGIN_SESSION_KEY`、`setLoggedIn`、`clearLoginSession`、`isLoggedIn`

### `[ ]` Task 2: VERIFY exports are importable by build

- **ACTION**: 确认模块可被 Taro 编译图解析（临时引用后可还原，或加一行被 tree-shake 的注释式校验）
- **IMPLEMENT**: 在 `src/pages/index/index.jsx` **临时** `import { isLoggedIn } from '../../utils/loginSession'` 并在 `useLoad` 内 `console.log('session', isLoggedIn())`，跑通 build 后**保留该 import** 亦可（为 Phase 2 铺垫）；若希望 Phase 1 UI 零变化，build 通过后移除此临时引用——**推荐保留** `console.log` 一行作为可观测性，与现有 `Page loaded.` 模式一致
- **MIRROR**: `src/pages/index/index.jsx:1-8`
- **IMPORTS**: `import { isLoggedIn } from '../../utils/loginSession'`
- **GOTCHA**: 相对路径从 `pages/index` 到 `utils` 为 `../../utils/loginSession`
- **VALIDATE**: `npm run build`（exit 0）

### `[ ]` Task 3: MANUAL storage contract check

- **ACTION**: 在微信开发者工具验证读写清除（本仓库无单测框架）
- **IMPLEMENT**:
  1. `npm run build` 或 `npm run dev`，用开发者工具打开项目
  2. 在调试器 Console 调用（或临时按钮，但 Phase 1 不要求按钮）：若已保留 `useLoad` 日志，确认启动打印 `session false`
  3. 在 Console 执行等价操作：可通过 Storage 面板写入 `{isLoggedIn:true,loginAt:123}` 到 key `loginSession`，重启后确认 `isLoggedIn()` 为 true；再 `removeStorageSync('loginSession')` 后为 false
  4. 记录结果到 Agent Notes
- **PATTERN**: 无测试框架 → Level 6 手工验收（见 Validation）
- **GOTCHA**: 勿用 `clearStorage` 测退出
- **VALIDATE**: 手工清单三项全过：写后可读 / 清后未登录 / 对象中无 code 字段

### `[ ]` Task 4: DOCUMENT key contract in module header comment

- **ACTION**: UPDATE `src/utils/loginSession.js` 文件头注释
- **IMPLEMENT**: 3–6 行注释写明：key 名、字段、禁止存 code/openid、供 Phase 2/3 使用
- **MIRROR**: 项目几乎无 JSDoc；保持简短即可
- **VALIDATE**: `Select-String -Path src/utils/loginSession.js -Pattern 'loginSession|isLoggedIn|code'`

---

## Testing Strategy

### Unit Tests to Write

| Test File | Test Cases | Validates |
| --------- | ---------- | --------- |
| （无） | 仓库无 jest/vitest | N/A — 用手工 Storage 验收替代 |

### Edge Cases Checklist

- [ ] Storage 缺 key → `isLoggedIn()` 为 false
- [ ] Storage 为 `''` 或非对象 → 安全回退未登录
- [ ] `isLoggedIn: false` 显式写入 → 视为未登录
- [ ] `setLoggedIn` 后 `loginAt` 为数字时间戳
- [ ] `clearLoginSession` 只删会话 key，不影响其他 storage
- [ ] 模块内无 `code` / `openid` 字段写入

---

## Validation Commands

🔁 **Validation loop:** the plan is not complete until every command below passes (exit 0). On any failure, fix the cause and re-run — loop until all pass. If a check is genuinely impossible, mark it `[f]`, note why in Agent Notes, and move on.

### Level 1: STATIC_ANALYSIS

```bash
# 项目无 lint / type-check script；用文件存在与符号检查代替
powershell -Command "Test-Path src/utils/loginSession.js; Select-String -Path src/utils/loginSession.js -Pattern 'setLoggedIn|getLoginSession|clearLoginSession|isLoggedIn' | Measure-Object | Select-Object -ExpandProperty Count"
```

**EXPECT**: 文件存在；匹配计数 >= 4

### Level 2: UNIT_TESTS

```bash
# 无测试框架 — 标记跳过
echo "NO_UNIT_TEST_FRAMEWORK"
```

**EXPECT**: 记录为 N/A（非失败）；以 Level 6 为准

### Level 3: FULL_SUITE

```bash
npm run build
```

**EXPECT**: Exit 0，`Compiled successfully`

### Level 4: DATABASE_VALIDATION (if schema changes)

N/A — 无数据库

### Level 5: BROWSER_VALIDATION (if UI changes)

N/A — Phase 1 无用户可见 UI 变更（可选 Console 观测）

### Level 6: MANUAL_VALIDATION

1. 编译并打开微信开发者工具  
2. Storage 中确认可写入 key `loginSession` = `{ isLoggedIn: true, loginAt: <number> }`  
3. 调用/触发 `isLoggedIn()` → true  
4. `clearLoginSession` / `removeStorageSync('loginSession')` 后 → false  
5. 确认无 `code`/`openid` 字段  

---

## Acceptance Criteria

- [ ] `src/utils/loginSession.js` 提供 get/set/clear/`isLoggedIn`
- [ ] 仅持久化 `isLoggedIn` + `loginAt`
- [ ] `npm run build` 通过
- [ ] 手工验收：写后可读、可清除
- [ ] 未引入后端、云开发、手机号、OpenID
- [ ] 未改登录按钮 UI（或仅保留 `console.log` 观测，无按钮）

---

## Completion Checklist

- [ ] All tasks completed in dependency order
- [ ] Each task validated immediately after completion
- [ ] Level 1: 文件与符号检查通过
- [ ] Level 2: N/A 已注明
- [ ] Level 3: `npm run build` 成功
- [ ] Level 6: 手工 Storage 验收通过
- [ ] All acceptance criteria met

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| 把 code 写入 storage | MED | HIGH | 模块禁止字段；Task 注释 + 审查 |
| `if (getStorageSync())` 误判 | MED | MED | 结构化对象 + `=== true` |
| 误用 `clearStorageSync` | LOW | HIGH | API 只暴露 remove 单 key |
| 无单测导致回归 | MED | LOW | Level 6 清单；Phase 2 接入后可再测 |

---

## Questionables

<details>
<summary>Phase 1 是否允许在 index 保留 isLoggedIn() 的 console.log？</summary>

假设：允许，与现有 `Page loaded.` 一致，便于手工验；不增加按钮。若要求 UI 零 diff，实现时去掉临时 import。

</details>

<details>
<summary>storage key 命名用 `loginSession` 还是带前缀？</summary>

假设：使用 `loginSession`（与 PRD 字段语义一致）。仓库无既有 key 冲突。

</details>

---

## Agent Notes

- Phase 2 探索结论：无 auth/storage 先例；挂载点 `app.js` / `pages/index`；JS only；依赖 `@tarojs/taro@3.6.34`
- Phase 3 研究：Sync 限额 1MB/10MB；缺 key → `''`；`encrypt` 仅异步；演示态明文足够
- 本 Phase **不**解决 OpenID；成功标准是本地布尔会话 API
- 后续 `/prp-plan` 选 Phase 2 时应 back-ref 本计划

---

## Amendments

<details>
<summary>2026-07-22T15:32:00+08:00 — 初始计划创建</summary>

由 PRD Phase 1 生成；方案 B 本地会话封装。

</details>
