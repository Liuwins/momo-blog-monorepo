import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Comment, CommentStatus } from '../../entities/comment.entity';
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
  const txCommentsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
  };
  const txPostsRepo = {
    increment: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const queryBuilder = {
    update: vi.fn(),
    set: vi.fn(),
    where: vi.fn(),
    execute: vi.fn(),
  };
  const queryRunner = {
    manager: {
      getRepository: vi.fn((entity) => (entity === Comment ? txCommentsRepo : txPostsRepo)),
    },
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  };
  const dataSource = { createQueryRunner: vi.fn() };
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
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    txCommentsRepo.create.mockImplementation((value) => ({ id: 8, ...value }));
    txCommentsRepo.save.mockImplementation(async (value) => ({ ...value, createdAt: new Date() }));
    txCommentsRepo.remove.mockResolvedValue(undefined);
    txCommentsRepo.findOne.mockResolvedValue({ id: 8, postId: 10, userId: 4 });
    txPostsRepo.increment.mockResolvedValue(undefined);
    txPostsRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    Object.values(queryBuilder).forEach((method) => method.mockReturnValue(queryBuilder));
    queryBuilder.execute.mockResolvedValue({ affected: 1 });
    queryRunner.manager.getRepository.mockImplementation((entity) => (
      entity === Comment ? txCommentsRepo : txPostsRepo
    ));
    service = new CommentsService(
      commentsRepo as any,
      postsService as any,
      notificationsService as any,
      dataSource as any,
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

    expect(txCommentsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CommentStatus.PENDING,
        nickname: '访客',
        visitorId: 'visitor-1',
      }),
    );
    expect(txPostsRepo.increment).toHaveBeenCalledWith({ id: 10 }, 'commentCount', 1);
    expect(postsService.incrementCommentCount).not.toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
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

  it('删除评论时在同一事务中扣减计数', async () => {
    commentsRepo.findOne.mockResolvedValue({ id: 8, postId: 10, userId: 4 });

    await expect(service.delete(8, 4)).resolves.toBe(true);

    expect(txCommentsRepo.remove).toHaveBeenCalledWith({ id: 8, postId: 10, userId: 4 });
    expect(queryBuilder.set).toHaveBeenCalledWith({ commentCount: expect.any(Function) });
    expect(queryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 10 });
    expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
    expect(postsService.decrementCommentCount).not.toHaveBeenCalled();
  });

  it('评论事务失败时回滚并释放连接', async () => {
    postsService.findById.mockResolvedValue({ id: 10, userId: 3, user: { nickname: '博主' } });
    txCommentsRepo.save.mockRejectedValue(new Error('database unavailable'));

    await expect(service.create(10, { postId: 10, content: '评论' })).rejects.toThrow(
      'database unavailable',
    );

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });

  it('回复评论时校验目标并分别通知博主和原评论作者', async () => {
    postsService.findById.mockResolvedValue({
      id: 10,
      userId: 3,
      user: { nickname: '博主' },
    });
    commentsRepo.findOne.mockResolvedValue({
      id: 7,
      postId: 10,
      userId: 5,
      nickname: '原作者',
      user: { nickname: '原作者' },
    });

    await service.create(10, {
      postId: 10,
      content: '回复内容',
      replyToId: 7,
      replyToNickname: '客户端伪造昵称',
    }, 4);

    expect(txCommentsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      replyToId: 7,
      replyToNickname: '原作者',
    }));
    expect(notificationsService.createAndNotify).toHaveBeenCalledTimes(2);
    expect(notificationsService.createAndNotify).toHaveBeenCalledWith(expect.objectContaining({ receiverId: 3, type: 'reply' }));
    expect(notificationsService.createAndNotify).toHaveBeenCalledWith(expect.objectContaining({ receiverId: 5, type: 'reply' }));
  });
});
