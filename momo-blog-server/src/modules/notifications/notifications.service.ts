import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
    // gateway 依赖本 service（handleMarkRead），用 forwardRef 打破循环依赖
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway,
  ) {}

  private async saveDeduplicated(data: {
    receiverId: number;
    senderId: number | null;
    type: NotificationType;
    postId?: number;
    content?: string;
    dedupeKey?: string;
  }) {
    if (data.dedupeKey) {
      const existing = await this.notificationsRepo.findOne({
        where: { dedupeKey: data.dedupeKey },
      });
      if (existing) return { notification: existing, created: false };
    }
    const notification = this.notificationsRepo.create(data);
    try {
      return { notification: await this.notificationsRepo.save(notification), created: true };
    } catch (error) {
      // 并发重试可能在两次 findOne 之间命中唯一索引，返回已存在事件即可。
      if (data.dedupeKey) {
        const existing = await this.notificationsRepo.findOne({
          where: { dedupeKey: data.dedupeKey },
        });
        if (existing) return { notification: existing, created: false };
      }
      throw error;
    }
  }

  async create(data: {
    receiverId: number;
    senderId: number | null;
    type: NotificationType;
    postId?: number;
    content?: string;
    dedupeKey?: string;
  }) {
    return (await this.saveDeduplicated(data)).notification;
  }

  // 创建通知并实时推送给接收者（通知 + 更新未读数）
  async createAndNotify(data: {
    receiverId: number;
    senderId: number | null;
    type: NotificationType;
    postId?: number;
    content?: string;
    dedupeKey?: string;
  }) {
    const { notification: saved, created } = await this.saveDeduplicated(data);
    if (!created) return saved;
    this.gateway.sendNotification(data.receiverId, saved);
    const count = await this.getUnreadCount(data.receiverId);
    this.gateway.sendUnreadCount(data.receiverId, count);
    return saved;
  }

  async findAll(userId: number, page = 1, pageSize = 20) {
    const [data, total] = await this.notificationsRepo.findAndCount({
      where: { receiverId: userId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list: data, total };
  }

  async markAsRead(userId: number) {
    await this.notificationsRepo.update(
      { receiverId: userId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: number) {
    return this.notificationsRepo.count({
      where: { receiverId: userId, isRead: false },
    });
  }
}
