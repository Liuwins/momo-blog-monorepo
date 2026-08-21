import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Like } from '../../entities/like.entity';
import { Post } from '../../entities/post.entity';
import { PostsService } from '../posts/posts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(
    @InjectRepository(Like)
    private likesRepo: Repository<Like>,
    private postsService: PostsService,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
  ) {}

  async toggle(postId: number, userId?: number, visitorId?: string) {
    const post = await this.postsService.findById(postId);
    if (!post) return { liked: false, likeCount: 0 };

    // 确定点赞人的唯一身份（已登录用 userId，游客用 visitorId）
    const where: any = { postId };
    if (userId) {
      where.userId = userId;
    } else if (visitorId) {
      where.visitorId = visitorId;
    } else {
      // 没有任何标识，无法点赞
      return { liked: false, likeCount: post.likeCount };
    }

    // 点赞记录与文章计数必须使用同一个事务管理器，避免一边提交、一边失败。
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const likesRepo = queryRunner.manager.getRepository(Like);
      const postsRepo = queryRunner.manager.getRepository(Post);
      const existing = await likesRepo.findOne({ where });

      if (existing) {
        await likesRepo.remove(existing);
        await postsRepo
          .createQueryBuilder()
          .update(Post)
          .set({ likeCount: () => 'MAX(likeCount - 1, 0)' })
          .where('id = :id', { id: postId })
          .execute();
        const updated = await postsRepo.findOne({ where: { id: postId } });
        await queryRunner.commitTransaction();
        return { liked: false, likeCount: updated?.likeCount ?? 0 };
      }

      const like = likesRepo.create({ postId, userId: userId || null, visitorId: visitorId || '' });
      const savedLike = await likesRepo.save(like);
      await postsRepo.increment({ id: postId }, 'likeCount', 1);
      const updated = await postsRepo.findOne({ where: { id: postId } });
      await queryRunner.commitTransaction();

      // 通知博主（自己点赞自己不通知）
      if (post.userId && userId !== post.userId) {
        this.notificationsService
          .createAndNotify({
            receiverId: post.userId,
            senderId: userId || null,
            type: NotificationType.LIKE,
            postId,
            dedupeKey: `like:${savedLike.id}`,
          })
          .catch((err) => {
            this.logger.error(`点赞通知发送失败: ${err?.message || err}`);
          });
      }

      return { liked: true, likeCount: updated?.likeCount ?? 0 };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getStatus(postId: number, userId?: number, visitorId?: string) {
    const post = await this.postsService.findById(postId);
    if (!post) return { liked: false, likeCount: 0 };

    const where: any = { postId };
    if (userId) {
      where.userId = userId;
    } else if (visitorId) {
      where.visitorId = visitorId;
    } else {
      return { liked: false, likeCount: post.likeCount };
    }

    const existing = await this.likesRepo.findOne({ where });
    return { liked: !!existing, likeCount: post.likeCount };
  }
}
