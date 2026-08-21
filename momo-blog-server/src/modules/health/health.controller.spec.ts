import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('数据库可用时返回 ok', async () => {
    const controller = new HealthController({ query: vi.fn().mockResolvedValue([{ value: 1 }]) } as any);

    await expect(controller.check()).resolves.toMatchObject({ status: 'ok' });
  });

  it('数据库不可用时返回 503 异常，而不是伪装成 200', async () => {
    const controller = new HealthController({ query: vi.fn().mockRejectedValue(new Error('locked')) } as any);

    await expect(controller.check()).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({ status: 'error', message: '数据库不可用' }),
    });
  });
});
