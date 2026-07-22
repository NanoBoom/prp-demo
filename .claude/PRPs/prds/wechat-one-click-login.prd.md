# 小程序微信一键登录

## Problem Statement

普通用户进入本微信小程序后无法完成登录，产品上线要求提供「微信一键登录」入口。当前仓库为最简 Taro 模板，无任何鉴权能力；在「无自建后端」且明确选择纯前端方案的前提下，无法获得微信侧可信 OpenID，只能交付可演示的本地登录态。

## Evidence

- 用户陈述：无法登录；上线需要微信号一键登录；进入小程序后要点按钮完成登录
- 市场调研：微信无独立「微信号 OAuth 一键登录」产品；可信身份依赖 `wx.login` → 服务端 `code2Session`（或云开发 `getWXContext`）；纯前端不能安全换 openid
- 代码库：`src/` 无 login/auth/token/openid/`Taro.login` 相关实现（仅 `pages/index` 静态页）
- Assumption - 「OpenID 登录」与方案 B（纯前端伪登录）互斥，需在实现前接受「本地登录态 ≠ OpenID」或改选云开发

## Proposed Solution

在小程序内提供显式「微信一键登录」按钮：点击后调用 `Taro.login`（拿到临时 `code`，仅用于演示调用成功），并在本地写入登录态（如 `isLoggedIn`、可选展示脱敏 code/本地会话 ID），首页展示「已登录」。**不**请求手机号，**不**自建后端，**不**承诺真实 OpenID（因方案 B）。

若未来需要真实 OpenID，应改用微信云开发或自建 `code2Session` 服务——不在本 PRD v1 范围。

## Key Hypothesis

We believe 首页「微信一键登录」按钮 + 本地登录态展示 will 让用户感知到已完成微信登录 for 普通用户。
We'll know we're right when 用户点击按钮后界面稳定显示已登录，且刷新后仍能恢复本地登录态（同一设备）。

## What We're NOT Building

- 手机号一键登录 / 短信验证 - 用户明确排除
- 自建后端 / `code2Session` / 业务 token 签发 - 无后端约束
- 微信云开发接入 - 用户选择方案 B
- 真实 OpenID / UnionID 持久身份 - 方案 B 技术不可达
- 头像昵称授权拉取（已废弃能力）或资料完善流 - 非本次目标
- 登录拦截、权限路由、服务端鉴权 - 无后端且非 MVP

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| 一键登录可完成 | 点击按钮后显示已登录 | 微信开发者工具 / 真机手动验收 |
| 登录态可恢复 | 杀进程重进后仍为已登录（本地 storage） | 手动验收 |
| 无手机号流程 | 全程无 getPhoneNumber / 短信 | 代码审查 + UI 检查 |

## Open Questions

- [ ] 产品是否接受「本地登录态」替代「OpenID」对外话术？（当前选择 B 则必须接受）
- [ ] 本地会话字段规范：仅用 `isLoggedIn`，还是同时缓存 `Taro.login` 返回的 `code`（code 约 5 分钟失效，不宜当长期身份）
- [ ] 未登录时是否允许浏览首页内容，还是必须先点登录（运营规范倾向允许浏览）

---

## Users & Context

**Primary User**
- **Who**: 普通小程序访问用户
- **Current behavior**: 进入小程序后无法登录
- **Trigger**: 访问小程序、需要完成上线要求的登录动作
- **Success state**: 点击一键登录后看到已登录状态

**Job to Be Done**
When 用户访问小程序时，I want to 一键登录，so I can 以已登录身份继续使用。

**Non-Users**
无明确排除对象（用户答「无」）。仍建议不优先服务：需要手机号实名、需要跨端统一账号（unionid）的运营场景——本 v1 做不到。

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | 「微信一键登录」按钮入口 | 用户成功标准的核心动作 |
| Must | 点击后建立并展示本地登录态 | MVP：点按钮 → 展示登录态 |
| Must | 本地持久化登录态（storage） | 重进小程序仍显示已登录 |
| Should | 调用 `Taro.login` 并处理成功/失败提示 | 体现「微信登录」调用，而非纯假按钮 |
| Could | 「退出登录」清除本地态 | 便于演示与自测 |
| Won't | 真实 OpenID 展示/落库 | 方案 B + 无后端不可达 |
| Won't | 电话/短信/手机号授权 | 明确排除 |
| Won't | 云开发 / 自建后端 | 本期不选 |

### MVP Scope

首页增加登录按钮 → 调用 `Taro.login` → 写入本地登录态 → UI 展示已登录；不涉及后端、云函数、手机号。

### User Flow

1. 用户打开小程序进入首页  
2. 看到「微信一键登录」按钮（若未登录）  
3. 点击按钮 → 调用微信登录 API  
4. 成功：展示已登录（及可选本地会话信息）  
5. 再次进入：从 storage 恢复已登录 UI  

---

## Technical Approach

**Feasibility**: LOW（真实 OpenID） / MEDIUM（本地登录态演示）

**Architecture Notes**
- 栈：Taro 3.6.34 + React 18，单页 `pages/index`；无 API/auth 层，需新建轻量登录状态读写（建议 `Taro.setStorageSync`）
- 集成点：`src/pages/index/index.jsx`（按钮与状态 UI）；可选在 `src/app.js` 启动时读本地态
- 方案 B：前端不可持有 AppSecret，不能调用 `code2Session`；`Taro.login` 的 `code` 不能当作 OpenID
- AppID 已存在于 `project.config.json`（`wx771302d2d6a60bb0`），与纯前端本地态无强依赖

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 对外称为「OpenID 登录」但实际无 OpenID | H | PRD/验收话术改为「本地登录态」；升级需改选云开发或后端 |
| 把 `code` 当长期用户 ID | M | 文档与实现禁止持久化 code 为身份；仅作调用成功凭证 |
| 用户误解已完成生产级鉴权 | M | README/界面注明演示性质（若面向非技术干系人） |

---

## Implementation Phases

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | 登录态模型 | 定义本地 storage 字段与读写封装 | complete | - | - | `.claude/PRPs/plans/completed/login-session-model.plan.md` |
| 2 | 一键登录 UI | 首页按钮、已登录/未登录展示、调用 `Taro.login` | pending | - | 1 | - |
| 3 | 会话恢复与退出 | 启动恢复登录态；可选退出登录 | pending | - | 2 | - |
| 4 | 验收说明 | 手工验收清单 + 明确非 OpenID 限制说明 | pending | - | 3 | - |

### Phase Details

**Phase 1: 登录态模型**
- **Goal**: 有稳定、可测的本地登录态读写
- **Scope**: storage key、字段（如 `isLoggedIn`、`loginAt`）；无后端
- **Success signal**: 单元/手工：写入后可读、可清除

**Phase 2: 一键登录 UI**
- **Goal**: 用户可点击完成「登录」并看到状态变化
- **Scope**: 按钮、`Taro.login`、成功/失败 toast、已登录文案
- **Success signal**: 开发者工具点击后 UI 变为已登录

**Phase 3: 会话恢复与退出**
- **Goal**: 重进小程序保持已登录；可退出便于复测
- **Scope**: 启动读 storage；退出清 storage
- **Success signal**: 杀进程重进仍已登录；退出后回到未登录

**Phase 4: 验收说明**
- **Goal**: 上线/演示前边界清晰
- **Scope**: 验收步骤；文档写明无 OpenID、无手机号、演示态
- **Success signal**: 按清单走通；干系人知悉限制

### Parallelism Notes

阶段串行依赖强（模型 → UI → 恢复），不建议并行。若后续改选云开发，应新开 PRD/阶段，不在本表并行插入。

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| 登录形态 | 显式按钮一键登录 | 启动静默登录 | 用户要求「点按钮」可感知 |
| 后端 | 无自建后端 | 自建 code2Session | 用户约束 |
| 落地路径 | B 纯前端伪登录 | A 微信云开发 | 用户选择 B |
| 手机号 | 不做 | getPhoneNumber | 用户排除 |
| OpenID | v1 不交付真实 OpenID | 云开发 getWXContext | B 技术不可达；与「拿到 OpenID」诉求冲突，以 B 为准并降级成功标准 |

---

## Research Summary

**Market Context**
微信通行分层：静默 openid（需服务端/云）、手机号按钮（收费+主体）、头像昵称自填。无官方「微信号一键登录」独立产品；口语「一键登录」常被误解为手机号授权。

**Technical Context**
本仓库无 auth 基础设施。可信 OpenID 必须服务端或云开发。方案 B 仅支持本地登录态演示；`Taro.login` 可得临时 `code` 但不能在前端兑换为 openid。

---

*Generated: 2026-07-22*
*Status: DRAFT - needs validation*
