import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationType } from '../../entities/notification.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const notificationsRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    count: vi.fn(),
  };
  const gateway = {
    sendNotification: vi.fn(),
    sendUnreadCount: vi.fn(),
  };
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationsRepo.findOne.mockResolvedValue(null);
    notificationsRepo.create.mockImplementation((value) => ({ id: 8, ...value }));
    notificationsRepo.save.mockImplementation(async (value) => ({ id: 8, ...value }));
    notificationsRepo.count.mockResolvedValue(1);
    service = new NotificationsService(notificationsRepo as any, gateway as any);
  });

  it('相同业务事件只创建一次通知', async () => {
    const existing = { id: 7, dedupeKey: 'comment:9' };
    notificationsRepo.findOne.mockResolvedValue(existing);

    await expect(
      service.createAndNotify({
        receiverId: 1,
        senderId: 2,
        type: NotificationType.COMMENT,
        postId: 3,
        dedupeKey: 'comment:9',
      }),
    ).resolves.toBe(existing);

    expect(notificationsRepo.save).not.toHaveBeenCalled();
    expect(gateway.sendNotification).not.toHaveBeenCalled();
    expect(gateway.sendUnreadCount).not.toHaveBeenCalled();
  });

  it('新通知写入后推送通知和未读数', async () => {
    const saved = { id: 8, receiverId: 1, dedupeKey: 'like:8' };
    notificationsRepo.save.mockResolvedValue(saved);

    await service.createAndNotify({
      receiverId: 1,
      senderId: 2,
      type: NotificationType.LIKE,
      postId: 3,
      dedupeKey: 'like:8',
    });

    expect(gateway.sendNotification).toHaveBeenCalledWith(1, saved);
    expect(gateway.sendUnreadCount).toHaveBeenCalledWith(1, 1);
  });
});
