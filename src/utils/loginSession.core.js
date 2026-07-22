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
