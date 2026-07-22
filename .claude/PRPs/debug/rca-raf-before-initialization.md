# Root Cause Analysis

**Issue**: 微信开发者工具报 `ReferenceError: Cannot access '_raf' before initialization`
**Root Cause**: `@tarojs/runtime` 将 `_raf` 导出为 `requestAnimationFrame`，同时初始化时用 `typeof requestAnimationFrame` 自引用，形成 TDZ 循环依赖
**Severity**: Critical
**Confidence**: High

---

## Evidence Chain

WHY: app.js 启动失败，页面未注册
↓ BECAUSE: `@tarojs/runtime` 加载时访问 `_raf` 触发 TDZ
  Evidence: 控制台 `Cannot access '_raf' before initialization` at `requestAnimationFrame`

WHY: `_raf` 未完成初始化就被访问
↓ BECAUSE: 源码写成 `const _raf = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : ...`，且模块导出 `_raf as requestAnimationFrame`
  Evidence: `node_modules/@tarojs/runtime/dist/bom/raf.js:20`
  Evidence: `runtime.esm.js` export `{ _raf as requestAnimationFrame }`

WHY: 该写法在小程序打包后会变成自引用
↓ BECAUSE: webpack 将标识符 `requestAnimationFrame` 绑定到本模块导出，初始化阶段读取自身未完成的 binding
  Evidence: Taro 官方修复 commit f719166（改为 `process.env.TARO_PLATFORM === 'web' ? requestAnimationFrame : polyfill`）
  Evidence: NervJS/taro#15981

↓ ROOT CAUSE: Taro 3.6.34 的 raf 实现存在已知循环依赖缺陷；关闭 prebundle 更容易暴露
  Evidence: issue 复现条件 `prebundle.enable: false`

---

## Fix Specification

1. 按 Taro 4 同款逻辑 patch `@tarojs/runtime` 的 raf
2. 修复 `@tarojs/webpack5-prebundle` 的 `roots: appPath` → `roots: [appPath]`，恢复 prebundle
3. 用 `patch-package` 固化，`postinstall` 自动应用

### Verification

1. `npm run build` 成功且 prebundle 正常
2. 微信开发者工具重新编译，不再出现 `_raf` 错误，首页可显示
