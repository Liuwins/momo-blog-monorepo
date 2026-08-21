# MomoBlog 当前路线图

状态：2026-08-21，根据当前源码更新；详细执行顺序见 [`docs/OPTIMIZATION-PLAN.md`](docs/OPTIMIZATION-PLAN.md)。

## 已实现

- 单管理员 JWT 登录，无注册入口；
- 动态发布、编辑、删除，支持文本、Markdown、图片、视频、标签和配乐字段；
- 游客/登录用户评论、回复、审核、删除；
- 登录用户和 visitorId 点赞；
- 关注关系与关注流；
- 通知列表、未读数和 Socket.IO 实时推送；
- 个人资料、头像、封面、背景音乐和暗黑主题；
- 本地收藏、浏览历史、草稿、天气和每日一句；
- 图片多尺寸处理、视频/音频上传、Open Graph 分享页；
- Docker Compose、Nginx、SQLite 迁移和备份脚本。

## 当前执行顺序

1. 阶段 0：基线与发布治理；
2. 阶段 1：数据正确性与安全边界；
3. 阶段 2：核心测试与 CI；
4. 阶段 3：部署可靠性与可恢复性；
5. 阶段 4：查询性能与资源治理；
6. 阶段 5：移动端体验与可访问性；
7. 阶段 6：PWA、编辑历史等可选增强。

## 当前高优先级缺口

- 阶段 1 代码已补齐动态配乐、分页边界、数组元素校验、生产配置保护、Open Graph 域名参数化和 Compose 后端暴露面收敛；本地验证通过，待形成公开提交；
- 阶段 2 已建立前后端 Vitest 基线；前端覆盖全局音乐状态和发布页路由守卫，后端覆盖 Auth、Posts、Comments 和 DTO 核心规则；上传、WebSocket、migration 回归测试及真实 CI 运行结果仍待补齐；
- 真实部署、WebSocket、上传和备份恢复尚未完成现场验证。

### 阶段 2 本轮进度

- 新增前端 Vitest 配置和 5 条回归测试；
- 新增后端 Vitest 配置、reflect-metadata 测试初始化和 10 条核心业务回归测试；
- 新增 GitHub Actions，执行前端 lint/test/build 与后端 test/typecheck/build；
- 本地前后端测试、类型检查和构建已通过；前端 lint 保留 7 条既有 warning，CI 尚未在 GitHub 远程运行环境完成验收。

详细任务、验收标准、提交边界和回滚要求以 [`docs/OPTIMIZATION-PLAN.md`](docs/OPTIMIZATION-PLAN.md) 为准。

## 后续技术债清单

- 完善媒体引用扫描并保持清理脚本默认只报告；
- 补充 Compose healthcheck、启动顺序和迁移失败处理；
- 增加 CI 和敏感文件扫描；
- 优化 N+1 查询、SQLite 索引、分页和计数一致性；
- 改善移动端评论输入、可访问性和离线体验。

### 可选增强

1. PWA 离线能力；
2. 动态编辑历史和回滚；
3. 更细粒度的评论回复通知；
4. CSP nonce 和更严格的媒体内容校验。

## 开发规则

- 前后端跨端功能使用一个 Monorepo 提交，提交信息说明影响范围。
- 修改实体必须补迁移；不要用 seed 代替迁移。
- 修改上传、通知或代理时，同时更新 `docs/DEPLOYMENT.md` 和 `PROJECT-WIKI.md`。
- 保持 SQLite 单实例写入；不要直接扩展 PM2 instances。
- 不提交 `.env`、数据库、上传文件、日志、构建产物和截图。
- 每个阶段完成后先本地验收，再决定是否创建公开提交；不要把未验证的部署结论写成已完成。
