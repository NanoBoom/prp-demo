/**
 * Node smoke for loginSession storage contract (no WeChat runtime).
 * Mirrors Sync API semantics: missing key → ''; structured object store.
 * Run: node src/utils/loginSession.smoke.js
 */

const storage = new Map()

function setStorageSync(key, data) {
  storage.set(key, data)
}

function getStorageSync(key) {
  return storage.has(key) ? storage.get(key) : ''
}

function removeStorageSync(key) {
  storage.delete(key)
}

const LOGIN_SESSION_KEY = 'loginSession'
const DEFAULT_SESSION = { isLoggedIn: false, loginAt: 0 }

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
    console.log('setLoginSession failed', e)
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

// 1) missing key → not logged in
assert(isLoggedIn() === false, 'missing key should be logged out')
assert(getLoginSession().loginAt === 0, 'default loginAt should be 0')

// 2) empty string / non-object → safe fallback
storage.set(LOGIN_SESSION_KEY, '')
assert(isLoggedIn() === false, 'empty string should be logged out')
storage.set(LOGIN_SESSION_KEY, { isLoggedIn: false, loginAt: 1 })
assert(isLoggedIn() === false, 'explicit false should be logged out')

// 3) setLoggedIn → readable, loginAt number, no code/openid
setLoggedIn()
assert(isLoggedIn() === true, 'after setLoggedIn should be logged in')
const session = getLoginSession()
assert(typeof session.loginAt === 'number' && session.loginAt > 0, 'loginAt should be timestamp')
assert(!('code' in session) && !('openid' in session), 'session must not contain code/openid')
const raw = getStorageSync(LOGIN_SESSION_KEY)
assert(!('code' in raw) && !('openid' in raw), 'stored object must not contain code/openid')

// 4) clear only removes session key
storage.set('otherKey', 'keep-me')
clearLoginSession()
assert(isLoggedIn() === false, 'after clear should be logged out')
assert(getStorageSync('otherKey') === 'keep-me', 'clear must not wipe other keys')
assert(getStorageSync(LOGIN_SESSION_KEY) === '', 'session key should be removed')

console.log('loginSession smoke OK')
