/** 返回用于分享链接和 Open Graph 元数据的站点根地址。 */
export function getSiteUrl(): string {
  return (process.env.SITE_URL || 'http://localhost:5175').trim().replace(/\/+$/, '');
}
