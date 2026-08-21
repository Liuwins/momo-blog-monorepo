import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Like } from '../../entities/like.entity';
import { Post } from '../../entities/post.entity';
import { LikesService } from './likes.service';

describe('LikesService', () => {
  const likesRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };
  const postsRepo = {
    increment: vi.fn(),
    findOne: vi.fn(),
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
      getRepository: vi.fn((entity) => (entity === Like ? likesRepo : postsRepo)),
    },
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
  };
  const dataSource = { createQueryRunner: vi.fn() };
  const postsService = { findById: vi.fn() };
  const notificationsService = { createAndNotify: vi.fn() };
  let service: LikesService;

  beforeEach(() => {
    vi.clearAllMocks();
    dataSource.createQueryRunner.mockReturnValue(queryRunner);
    likesRepo.create.mockImplementation((value) => ({ id: 20, ...value }));
    likesRepo.save.mockResolvedValue({ id: 20, postId: 10, userId: 4 });
    likesRepo.remove.mockResolvedValue(undefined);
    postsRepo.increment.mockResolvedValue(undefined);
    postsRepo.findOne.mockResolvedValue({ id: 10, userId: 3, likeCount: 1 });
    postsRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    Object.values(queryBuilder).forEach((method) => method.mockReturnValue(queryBuilder));
    queryBuilder.execute.mockResolvedValue({ affected: 1 });
    queryRunner.manager.getRepository.mockImplementation((entity) => (
      entity === Like ? likesRepo : postsRepo
    ));
    postsService.findById.mockResolvedValue({ id: 10, userId: 3, likeCount: 0 });
    notificationsService.createAndNotify.mockResolvedValue(undefined);
    service = new LikesService(
      likesRepo as any,
      postsService as any,
      notificationsService as any,
      dataSource as any,
    );
  });

  it('在同一事务中新增点赞并递增文章计数', async () => {
    likesRepo.findOne.mockResolvedValue(null);
    postsRepo.findOne.mockResolvedValue({ id: 10, userId: 3, likeCount: 1 });

    const result = await service.toggle(10, 4);

    expect(likesRepo.save).toHaveBeenCalledWith({ id: 20, postId: 10, userId: 4, visitorId: '' });
    expect(postsRepo.increment).toHaveBeenCalledWith({ id: 10 }, 'likeCount', 1);
    expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    expect(result).toEqual({ liked: true, likeCount: 1 });
    expect(postsService.findById).toHaveBeenCalledOnce();
  });

  it('在同一事务中取消点赞并保护计数下界', async () => {
    likesRepo.findOne.mockResolvedValue({ id: 20, postId: 10, userId: 4 });
    postsRepo.findOne.mockResolvedValue({ id: 10, userId: 3, likeCount: 0 });

    const result = await service.toggle(10, 4);

    expect(likesRepo.remove).toHaveBeenCalledWith({ id: 20, postId: 10, userId: 4 });
    expect(queryBuilder.set).toHaveBeenCalledWith({ likeCount: expect.any(Function) });
    expect(queryBuilder.where).toHaveBeenCalledWith('id = :id', { id: 10 });
    expect(queryRunner.commitTransaction).toHaveBeenCalledOnce();
    expect(result).toEqual({ liked: false, likeCount: 0 });
  });

  it('事务失败时回滚并释放连接', async () => {
    likesRepo.findOne.mockRejectedValue(new Error('database unavailable'));

    await expect(service.toggle(10, 4)).rejects.toThrow('database unavailable');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(queryRunner.release).toHaveBeenCalledOnce();
  });
});
