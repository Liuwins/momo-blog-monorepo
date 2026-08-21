# 上线检查入口

本文档已收敛为兼容入口。请先阅读根目录 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)，再根据真实服务器环境执行检查。

最小上线检查：

- [ ] `JWT_SECRET` 使用强随机值且未提交；
- [ ] `CLIENT_ORIGIN` 与实际 HTTPS 域名一致；
- [ ] 生产数据库迁移成功，SQLite 和上传目录均已备份；
- [ ] 前端、`/api/health`、`/images/` 返回正常；
- [ ] Nginx 配置 `/api/`、`/images/`、`/socket.io/`，且上传上限至少 60 MB；
- [ ] 后端未直接暴露到公网；
- [ ] 已完成登录、发布、上传、评论审核、点赞、通知和回滚演练。

旧版本清单中的固定域名、路径和端口不再作为默认值。
