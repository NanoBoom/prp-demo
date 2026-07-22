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
