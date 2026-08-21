import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowsService } from './follows.service';

describe('FollowsService', () => {
  const followsRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    exist: vi.fn(),
    count: vi.fn(),
  };
  const queryBuilder = {
    leftJoinAndSelect: vi.fn(),
    innerJoin: vi.fn(),
    orderBy: vi.fn(),
    skip: vi.fn(),
    take: vi.fn(),
    getManyAndCount: vi.fn(),
  };
  const postRepo = { createQueryBuilder: vi.fn() };
  const dataSource = { getRepository: vi.fn() };
  const postsService = { formatList: vi.fn() };
  let service: FollowsService;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(queryBuilder).forEach((method) => method.mockReturnValue(queryBuilder));
    dataSource.getRepository.mockReturnValue(postRepo);
    postRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    queryBuilder.getManyAndCount.mockResolvedValue([[{ id: 10, userId: 8 }], 1]);
    postsService.formatList.mockResolvedValue({ list: [{ id: 10, liked: true }], total: 1 });
    service = new FollowsService(
      followsRepo as any,
      dataSource as any,
      postsService as any,
    );
  });

  it('关注流复用统一动态序列化并传入当前用户', async () => {
    const result = await service.getFollowingPosts(4, 1, 10);

    expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
      expect.anything(),
      'f',
      'f.followingId = post.userId AND f.followerId = :userId',
      { userId: 4 },
    );
    expect(postsService.formatList).toHaveBeenCalledWith([{ id: 10, userId: 8 }], 1, 4);
    expect(result).toEqual({ list: [{ id: 10, liked: true }], total: 1 });
  });

  it('关注使用数据库 upsert 保证重复请求幂等', async () => {
    followsRepo.upsert.mockResolvedValue({ identifiers: [], generatedMaps: [], raw: [] });

    await expect(service.follow(4, 8)).resolves.toEqual({ followed: true });

    expect(followsRepo.upsert).toHaveBeenCalledWith(
      { followerId: 4, followingId: 8 },
      ['followerId', 'followingId'],
    );
    expect(followsRepo.findOne).not.toHaveBeenCalled();
    expect(followsRepo.save).not.toHaveBeenCalled();
  });

  it('禁止关注自己且不写入数据库', async () => {
    await expect(service.follow(4, 4)).rejects.toMatchObject({ status: 400 });
    expect(followsRepo.upsert).not.toHaveBeenCalled();
  });
});
