import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowsService } from './follows.service';

describe('FollowsService', () => {
  const followsRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
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
});
