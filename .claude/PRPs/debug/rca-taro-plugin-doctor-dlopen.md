# Root Cause Analysis

**Issue**: `npm run dev` 启动失败（多层错误）
**Root Cause**:
1. Windows 缺少 VC++ Redistributable → `@tarojs/plugin-doctor` 原生模块无法加载
2. `webpack@^5.78.0` 解析到 `5.108.x`，与 `webpackbar@5` 的 ProgressPlugin 选项不兼容
**Severity**: Critical
**Confidence**: High

---

## Evidence Chain

WHY: `npm run dev` / `taro build` 启动失败
↓ BECAUSE: `@tarojs/cli` 在加载 build 插件时同步 require 了 `@tarojs/plugin-doctor`
  Evidence: `node_modules/@tarojs/cli/src/presets/commands/build.ts` - imports from `@tarojs/plugin-doctor`
  Evidence: `node_modules/@tarojs/cli/src/cli.ts:96` - `kernel.optsPlugins.push('@tarojs/plugin-doctor')`

WHY: `@tarojs/plugin-doctor` 加载失败
↓ BECAUSE: `js-binding.js` 在 win32/x64 下 require 原生模块 `@tarojs/plugin-doctor-win32-x64-msvc`
  Evidence: `node_modules/@tarojs/plugin-doctor/js-binding.js:64-76`

WHY: 原生模块 `dlopen` 失败并报 “The specified module could not be found”
↓ BECAUSE: `.node` 文件本身存在，但依赖的系统 DLL 缺失（Windows 错误码 126）
  Evidence: `taro-doctor.win32-x64-msvc.node` 存在且约 7.1MB；`LoadLibrary` 返回 handle=0, lastError=126

↓ ROOT CAUSE: 系统未安装 VC++ 运行库
  Evidence: `C:\Windows\System32\VCRUNTIME140.dll` / `MSVCP140.dll` 均为 False
  Evidence: GitHub NervJS/taro#15209 确认安装 VC++ 后可解决同类问题

---

## Git History

- **Introduced**: `cad758d` - first commit（项目初始即依赖 `@tarojs/cli@3.6.34` → `@tarojs/plugin-doctor@0.0.11`）
- **Author**: repo initial commit
- **Recent changes**: no（单次提交）
- **Type**: environment / original dependency requirement（非回归）

---

## Fix Specification

### What Needs to Change

安装 Microsoft Visual C++ Redistributable (x64)，提供 `VCRUNTIME140.dll` 等运行库，使 NAPI 原生模块可被 Node 加载。

项目代码无需修改；这是环境依赖问题。

### Implementation Guidance

```powershell
# 下载并静默安装 VC++ Redistributable x64
Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vc_redist.x64.exe" -OutFile "$env:TEMP\vc_redist.x64.exe"
Start-Process -FilePath "$env:TEMP\vc_redist.x64.exe" -ArgumentList "/install","/quiet","/norestart" -Wait
```

### Files to Modify

- 无项目文件变更（环境修复）

### Verification

1. `Test-Path C:\Windows\System32\VCRUNTIME140.dll` → True
2. `node -e "require('@tarojs/plugin-doctor-win32-x64-msvc')"` → 无 ERR_DLOPEN_FAILED
3. `npm run dev` → Taro 正常进入 watch 编译
