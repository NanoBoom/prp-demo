# prp-demo

最简 React 微信小程序模板，基于 [Taro](https://taro-docs.jd.com/)（React 语法编译为微信小程序）。

## 技术栈

- Taro 3.6（`react` 框架 + `webpack5` 编译器）
- React 18
- JavaScript（未启用 TypeScript，保持最简）

## 目录结构

```
├── config/               # Taro 编译配置
│   ├── index.js
│   ├── dev.js
│   └── prod.js
├── src/
│   ├── app.config.js     # 全局配置（页面路由、窗口）
│   ├── app.js            # 小程序入口
│   ├── app.css
│   └── pages/
│       └── index/        # 首页
│           ├── index.jsx
│           ├── index.config.js
│           └── index.css
├── babel.config.js
├── project.config.json   # 微信开发者工具项目配置
└── package.json
```

## 使用

1. 安装依赖：

   ```bash
   npm install
   ```

2. 开发构建（监听文件变化）：

   ```bash
   npm run dev
   ```

3. 生产构建：

   ```bash
   npm run build
   ```

4. 打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，导入本项目目录，编译产物在 `dist/`。
   正式发布前请将 `project.config.json` 中的 `appid` 替换为自己的小程序 AppID。

## 新增页面

1. 在 `src/pages/` 下新建目录，如 `src/pages/about/`，包含 `about.jsx` / `about.config.js` / `about.css`。
2. 在 `src/app.config.js` 的 `pages` 数组中登记 `pages/about/about`。
