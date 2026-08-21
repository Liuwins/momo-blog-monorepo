import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('拒绝缺少或未知的 NODE_ENV', () => {
    expect(() => validateEnv({})).toThrow('NODE_ENV 必须明确设置');
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow('NODE_ENV 必须是');
  });

  it('拒绝生产环境的示例密钥和非法源地址', () => {
    const base = { NODE_ENV: 'production', JWT_SECRET: 'please_change_this_secret_123' };
    expect(() => validateEnv(base)).toThrow('JWT_SECRET');
    expect(() => validateEnv({ ...base, JWT_SECRET: 'a'.repeat(32) })).toThrow('CLIENT_ORIGIN');
    expect(() => validateEnv({ ...base, JWT_SECRET: 'a'.repeat(32), CLIENT_ORIGIN: 'https://example.com/path', SITE_URL: 'https://example.com' })).toThrow('CLIENT_ORIGIN');
  });

  it('接受合法生产配置并保留原始配置项', () => {
    const input = {
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(32),
      CLIENT_ORIGIN: 'https://example.com',
      SITE_URL: 'https://example.com/',
      PORT: '3001',
    };
    expect(validateEnv(input)).toEqual(input);
  });
});
