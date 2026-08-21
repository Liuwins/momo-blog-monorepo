import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usersService = {
    findByUsername: vi.fn(),
  };
  const jwtService = {
    sign: vi.fn(() => 'signed-token'),
  };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_USERNAME = 'admin';
    service = new AuthService(usersService as any, jwtService as any);
  });

  it('只允许管理员账号登录，并移除返回值中的密码', async () => {
    const password = await bcrypt.hash('secret123', 4);
    usersService.findByUsername.mockResolvedValue({
      id: 1,
      username: 'admin',
      nickname: '博主',
      password,
    });

    const result = await service.login({ username: 'admin', password: 'secret123' });

    expect(result.token).toBe('signed-token');
    expect(result.user).toEqual({ id: 1, username: 'admin', nickname: '博主' });
    expect(result.user).not.toHaveProperty('password');
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 1, username: 'admin' });
  });

  it('拒绝非管理员账号和错误密码', async () => {
    await expect(service.login({ username: 'guest', password: 'secret123' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(usersService.findByUsername).not.toHaveBeenCalled();

    usersService.findByUsername.mockResolvedValue({
      id: 1,
      username: 'admin',
      password: await bcrypt.hash('another-password', 4),
    });

    await expect(service.login({ username: 'admin', password: 'wrong-password' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
