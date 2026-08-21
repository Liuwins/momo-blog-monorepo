import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentStatus } from '../../entities/comment.entity';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  const commentsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const postsService = {
    findById: vi.fn(),
    incrementCommentCount: vi.fn(),
    decrementCommentCount: vi.fn(),
  };
  const notificationsService = {
    createAndNotify: vi.fn().mockResolvedValue(undefined),
  };
  let service: CommentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    commentsRepo.create.mockImplementation((value) => ({ id: 8, ...value }));
    commentsRepo.save.mockImplementation(async (value) => ({ ...value, createdAt: new Date() }));
    service = new CommentsService(
      commentsRepo as any,
      postsService as any,
      notificationsService as any,
    );
  });

  it('游客评论进入待审核状态并隐藏真实内容', async () => {
    postsService.findById.mockResolvedValue({
      id: 10,
      userId: 3,
      user: { nickname: '博主' },
    });

    const created = await service.create(10, {
      postId: 10,
      content: '访客评论',
      nickname: '访客',
      visitorId: 'visitor-1',
    });

    expect(commentsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CommentStatus.PENDING,
        nickname: '访客',
        visitorId: 'visitor-1',
      }),
    );
    expect(postsService.incrementCommentCount).toHaveBeenCalledWith(10);
    expect(created.status).toBe(CommentStatus.PENDING);

    commentsRepo.find.mockResolvedValue([
      {
        id: 8,
        postId: 10,
        nickname: '访客',
        content: '访客评论',
        status: CommentStatus.PENDING,
      },
      {
        id: 9,
        postId: 10,
        nickname: '恶意内容',
        content: '拒绝内容',
        status: CommentStatus.REJECTED,
      },
    ]);

    const visible = await service.findByPostId(10);

    expect(visible).toEqual([
      expect.objectContaining({ id: 8, content: '[该评论正在审核中]', masked: true }),
    ]);
  });

  it('只允许文章作者审核评论', async () => {
    commentsRepo.findOne.mockResolvedValue({ id: 8, postId: 10 });
    postsService.findById.mockResolvedValue({ id: 10, userId: 3 });

    await expect(service.approve(8, 4)).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    await expect(service.approve(8, 3)).resolves.toBe(true);
    expect(commentsRepo.update).toHaveBeenCalledWith(8, { status: CommentStatus.APPROVED });
  });
});
