/**
 * Node smoke for loginSession storage contract (no WeChat runtime).
 * Imports real core logic via createLoginSessionApi + Map storage adapter.
 * Run: node src/utils/loginSession.smoke.mjs
 */
import { createLoginSessionApi, LOGIN_SESSION_KEY } from './loginSession.core.js'

const storage = new Map()

function getStorageSync(key) {
  return storage.has(key) ? storage.get(key) : ''
}

const { getLoginSession, setLoggedIn, clearLoginSession, isLoggedIn } =
  createLoginSessionApi({
    setStorageSync(key, data) {
      storage.set(key, data)
    },
    getStorageSync,
    removeStorageSync(key) {
      storage.delete(key)
    }
  })

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
