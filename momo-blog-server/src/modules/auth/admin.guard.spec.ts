import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  beforeEach(() => {
    process.env.ADMIN_USERNAME = 'admin';
  });

  function contextWithUser(user: unknown) {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as ExecutionContext;
  }

  it('允许管理员用户通过', () => {
    expect(new AdminGuard().canActivate(contextWithUser({ username: 'admin' }))).toBe(true);
  });

  it('拒绝空用户和普通用户', () => {
    expect(() => new AdminGuard().canActivate(contextWithUser(null))).toThrow(ForbiddenException);
    expect(() => new AdminGuard().canActivate(contextWithUser({ username: 'other' }))).toThrow(
      '仅管理员可执行此操作',
    );
  });
});
