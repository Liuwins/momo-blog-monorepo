# MomoBlog 前端

Vue 3 + Vant 4 + Pinia + Vue Router + Vite。

## 本地开发

```powershell
npm ci
npm run dev
```

Vite 固定监听 `5175`，并通过 `VITE_API_TARGET` 代理后端。默认开发配置位于 `.env.development`：

```env
VITE_API_TARGET=http://localhost:3001
```

如需临时切换后端地址，可在启动前设置同名环境变量。不要使用旧的 `VITE_API_URL`，当前配置不读取该变量。

## 检查与构建

```powershell
npm run lint
npm run test
npm run build
```

`dist/`、`node_modules/` 和日志属于本地产物，不提交 Git。

## 目录结构

```text
src/
├── api/          # Axios 请求封装
├── components/   # 动态卡片、媒体、音乐、评论等组件
├── plugins/      # Vant Toast/Dialog 插件
├── router/       # 路由与登录守卫
├── stores/       # 用户会话、通知 Socket.IO
├── styles/       # 主题变量与暗黑模式
├── utils/        # 本地存储、游客 ID、压缩、天气等
└── views/        # 首页、发布、详情、资料、通知等页面
```

## 相关文档

- 根目录 [PROJECT-WIKI.md](../PROJECT-WIKI.md)
- 根目录 [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
- 根目录 [ROADMAP.md](../ROADMAP.md)
