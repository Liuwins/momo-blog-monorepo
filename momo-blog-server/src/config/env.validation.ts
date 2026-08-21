const ALLOWED_NODE_ENVS = ['development', 'test', 'production'] as const;

/**
 * 在 Nest 启动前集中校验环境变量，避免拼写错误的 NODE_ENV 意外打开生产配置。
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const rawNodeEnv = String(config.NODE_ENV || '');
  const nodeEnv = rawNodeEnv.trim();
  if (!nodeEnv || rawNodeEnv !== nodeEnv) {
    throw new Error('NODE_ENV 必须明确设置为 development、test 或 production。');
  }
  if (!ALLOWED_NODE_ENVS.includes(nodeEnv as (typeof ALLOWED_NODE_ENVS)[number])) {
    throw new Error(
      `NODE_ENV 必须是 development、test 或 production，当前值为：${nodeEnv}`,
    );
  }

  const validated = { ...config, NODE_ENV: nodeEnv };

  if (nodeEnv === 'production') {
    const jwtSecret = String(config.JWT_SECRET || '');
    if (jwtSecret.length < 16 || /^please_change_this/i.test(jwtSecret)) {
      throw new Error(
        '生产环境必须配置长度至少 16 字符且不是示例值的 JWT_SECRET。',
      );
    }

    const clientOrigin = String(config.CLIENT_ORIGIN || '');
    if (!clientOrigin) {
      throw new Error('生产环境必须配置 CLIENT_ORIGIN。');
    }
    if (clientOrigin !== clientOrigin.trim()) {
      throw new Error('生产环境 CLIENT_ORIGIN 不能包含首尾空白字符。');
    }

    const siteUrl = String(config.SITE_URL || '');
    if (!siteUrl) {
      throw new Error('生产环境必须配置 SITE_URL。');
    }
    if (siteUrl !== siteUrl.trim()) {
      throw new Error('生产环境 SITE_URL 不能包含首尾空白字符。');
    }

    let originUrl: URL;
    try {
      originUrl = new URL(clientOrigin);
    } catch {
      throw new Error('生产环境 CLIENT_ORIGIN 必须是完整的 http(s) 源地址。');
    }
    if (!['http:', 'https:'].includes(originUrl.protocol) || originUrl.pathname !== '/' || originUrl.search || originUrl.hash) {
      throw new Error('生产环境 CLIENT_ORIGIN 必须是完整的 http(s) 源地址，不能包含路径或查询参数。');
    }

    let siteUrlObject: URL;
    try {
      siteUrlObject = new URL(siteUrl);
    } catch {
      throw new Error('生产环境 SITE_URL 必须是完整的 http(s) 源地址。');
    }
    if (!['http:', 'https:'].includes(siteUrlObject.protocol) || siteUrlObject.pathname !== '/' || siteUrlObject.search || siteUrlObject.hash) {
      throw new Error('生产环境 SITE_URL 必须是完整的 http(s) 源地址，不能包含路径或查询参数。');
    }
  }

  return validated;
}
