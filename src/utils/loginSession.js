/**
 * 本地登录会话（key: loginSession）。
 * 字段：{ isLoggedIn: boolean, loginAt: number }。
 * 禁止持久化 code / openid / session_key。
 * 供 Phase 2 一键登录与 Phase 3 启动恢复/退出复用。
 */
import { setStorageSync, getStorageSync, removeStorageSync } from '@tarojs/taro'

export const LOGIN_SESSION_KEY = 'loginSession'

const DEFAULT_SESSION = { isLoggedIn: false, loginAt: 0 }

export function getLoginSession() {
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

export function setLoggedIn() {
  try {
    setStorageSync(LOGIN_SESSION_KEY, {
      isLoggedIn: true,
      loginAt: Date.now()
    })
  } catch (e) {
    console.log('setLoginSession failed', e)
  }
}

export function clearLoginSession() {
  try {
    removeStorageSync(LOGIN_SESSION_KEY)
  } catch (e) {
    console.log('clearLoginSession failed', e)
  }
}

export function isLoggedIn() {
  return getLoginSession().isLoggedIn === true
}
