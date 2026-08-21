import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  const notificationsService = {
    markAsRead: vi.fn(),
  };
  const jwtService = {
    verify: vi.fn(),
  };
  const configService = {
    get: vi.fn(),
  };
  const server = {
    to: vi.fn(() => ({ emit: vi.fn() })),
  };
  let gateway: NotificationsGateway;

  beforeEach(() => {
    vi.clearAllMocks();
    configService.get.mockReturnValue('test-secret');
    jwtService.verify.mockReturnValue({ sub: 7 });
    gateway = new NotificationsGateway(
      notificationsService as any,
      jwtService as any,
      configService as any,
    );
    gateway.server = server as any;
  });

  it('拒绝没有 token 的连接，并允许有效 token 加入用户房间', () => {
    const disconnect = vi.fn();
    gateway.handleConnection({ id: 'anonymous', handshake: { auth: {} }, disconnect } as any);
    expect(disconnect).toHaveBeenCalledOnce();

    const join = vi.fn();
    gateway.handleConnection({
      id: 'authenticated',
      handshake: { auth: { token: 'jwt-token' } },
      join,
      disconnect: vi.fn(),
    } as any);
    expect(jwtService.verify).toHaveBeenCalledWith('jwt-token', { secret: 'test-secret' });
    expect(join).toHaveBeenCalledWith('user_7');
  });

  it('markRead 使用握手 token 的用户身份，而不是客户端传入身份', async () => {
    const emit = vi.fn();
    server.to.mockReturnValue({ emit });
    const client = { handshake: { auth: { token: 'jwt-token' } } };

    await gateway.handleMarkRead(client as any);

    expect(notificationsService.markAsRead).toHaveBeenCalledWith(7);
    expect(server.to).toHaveBeenCalledWith('user_7');
    expect(emit).toHaveBeenCalledWith('unreadUpdate', { count: 0 });
  });
});
