import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PostsService } from './posts.service';
import { PostRevision } from '../../entities/post-revision.entity';

describe('PostsService', () => {
  const queryBuilder = {
    leftJoinAndSelect: vi.fn(),
    skip: vi.fn(),
    take: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    orderBy: vi.fn(),
    getManyAndCount: vi.fn(),
  };
  const postsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const commentsRepo = { find: vi.fn() };
  const likesRepo = { find: vi.fn(), exist: vi.fn() };
  const revisionsRepo = { find: vi.fn(), findOne: vi.fn(), save: vi.fn() };
  const dataSource = { transaction: vi.fn() };
  let service: PostsService;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(queryBuilder).forEach((method) => method.mockReturnValue(queryBuilder));
    postsRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    commentsRepo.find.mockResolvedValue([]);
    likesRepo.find.mockResolvedValue([]);
    likesRepo.exist.mockResolvedValue(false);
    revisionsRepo.find.mockResolvedValue([]);
    revisionsRepo.findOne.mockResolvedValue(null);
    revisionsRepo.save.mockImplementation(async (value) => ({ id: 99, createdAt: new Date(), ...value }));
    dataSource.transaction.mockImplementation(async (callback) => callback({
      getRepository: (entity) => (entity === PostRevision ? revisionsRepo : postsRepo),
    }));
    postsRepo.create.mockImplementation((value) => ({ id: 10, ...value }));
    postsRepo.save.mockImplementation(async (value) => value);
    service = new PostsService(postsRepo as any, commentsRepo as any, likesRepo as any, revisionsRepo as any, dataSource as any);
  });

  it('创建动态时保留配乐并在返回值中序列化', async () => {
    postsRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 3,
      content: 'hello',
      images: [],
      videos: [],
      music: '/images/music/song.mp3',
      tags: ['生活'],
      likeCount: 0,
      commentCount: 0,
      user: { id: 3, nickname: '博主', avatar: '' },
    });

    const result = await service.create(3, {
      content: 'hello',
      music: '/images/music/song.mp3',
      tags: ['生活'],
      notEmpty: true,
    });

    expect(postsRepo.create).toHaveBeenCalledWith({
      userId: 3,
      content: 'hello',
      images: [],
      videos: [],
      music: '/images/music/song.mp3',
      tags: ['生活'],
    });
    expect(result.music).toBe('/images/music/song.mp3');
  });

  it('只允许动态所属用户更新和删除', async () => {
    postsRepo.findOne.mockResolvedValue({ id: 10, userId: 3 });

    await expect(service.update(10, 4, { content: '改写' })).resolves.toBeNull();
    await expect(service.delete(10, 4)).resolves.toBe(false);
    expect(postsRepo.save).not.toHaveBeenCalled();
    expect(postsRepo.remove).not.toHaveBeenCalled();
  });

  it('编辑动态前保存快照，并可列出和恢复历史版本', async () => {
    const current = {
      id: 10,
      userId: 3,
      content: '旧内容',
      images: ['/images/old.webp'],
      videos: [],
      music: '',
      tags: ['旧'],
    };
    postsRepo.findOne.mockResolvedValue(current);
    const detail = { ...current, user: { id: 3, nickname: '博主', avatar: '' } };
    postsRepo.findOne.mockResolvedValueOnce(current).mockResolvedValueOnce(detail);
    await service.update(10, 3, { content: '新内容' });
    expect(revisionsRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      postId: 10,
      userId: 3,
      snapshot: expect.stringContaining('旧内容'),
    }));

    revisionsRepo.find.mockResolvedValue([
      { id: 99, createdAt: new Date(), snapshot: JSON.stringify({ content: '旧内容', images: ['/images/old.webp'], videos: [], music: '', tags: ['旧'] }) },
    ]);
    postsRepo.findOne.mockResolvedValue(current);
    await expect(service.getHistory(10, 3)).resolves.toEqual([
      expect.objectContaining({ id: 99, contentPreview: '旧内容', imagesCount: 1, tags: ['旧'] }),
    ]);

    revisionsRepo.findOne.mockResolvedValue({
      id: 99,
      postId: 10,
      snapshot: JSON.stringify({ content: '恢复内容', images: [], videos: [], music: '', tags: ['恢复'] }),
    });
    postsRepo.findOne.mockResolvedValue(current);
    await service.restoreRevision(10, 99, 3);
    expect(postsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ content: '恢复内容', tags: ['恢复'] }));
  });

  it('首页列表批量读取评论和点赞，避免每条动态触发额外查询', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([
      [
        {
          id: 10,
          userId: 3,
          content: '第一条',
          images: [],
          videos: [],
          music: '',
          tags: [],
          likeCount: 1,
          commentCount: 1,
          user: { id: 3, nickname: '博主', avatar: '' },
        },
        {
          id: 11,
          userId: 3,
          content: '第二条',
          images: [],
          videos: [],
          music: '',
          tags: [],
          likeCount: 1,
          commentCount: 0,
          user: { id: 3, nickname: '博主', avatar: '' },
        },
      ],
      2,
    ]);
    commentsRepo.find.mockResolvedValue([
      {
        id: 20,
        postId: 10,
        nickname: '访客',
        content: '你好',
        status: 'approved',
        createdAt: new Date(),
        user: null,
      },
    ]);
    likesRepo.find.mockResolvedValue([
      { id: 30, postId: 10, userId: 3, user: { id: 3, nickname: '博主' } },
    ]);

    const result = await service.findAll({ page: 1, pageSize: 10 } as any, 3);

    expect(result.list[0].liked).toBe(true);
    expect(result.list[0].comments).toHaveLength(1);
    expect(result.list[0].likeUsers).toEqual([{ id: 3, nickname: '博主' }]);
    expect(commentsRepo.find).toHaveBeenCalledTimes(1);
    expect(likesRepo.find).toHaveBeenCalledTimes(1);
    expect(likesRepo.exist).not.toHaveBeenCalled();
  });

  it('对关键词通配符转义，并按完整标签边界查询', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    await service.findAll({
      page: 1,
      pageSize: 10,
      keyword: '100%_完成',
      tag: ' 生活 ',
    } as any);

    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      "post.content LIKE :keyword ESCAPE '\\'",
      { keyword: '%100\\%\\_完成%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      "INSTR(',' || COALESCE(post.tags, '') || ',', ',' || :tag || ',') > 0",
      { tag: '生活' },
    );
  });

  it('个人动态复用统一序列化并保留当前用户点赞状态', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([
      [{
        id: 12,
        userId: 3,
        content: '个人动态',
        images: [],
        videos: [],
        music: '',
        tags: [],
        likeCount: 1,
        commentCount: 0,
        user: { id: 3, nickname: '博主', avatar: '' },
      }],
      1,
    ]);
    likesRepo.find.mockResolvedValue([
      { id: 31, postId: 12, userId: 4, user: { id: 4, nickname: '访客' } },
    ]);

    const result = await service.findUserPosts(3, 1, 10, 4);

    expect(queryBuilder.where).toHaveBeenCalledWith('post.userId = :userId', { userId: 3 });
    expect(result.list[0].user).toEqual({ id: 3, nickname: '博主', avatar: '' });
    expect(result.list[0].liked).toBe(true);
    expect(result.list[0].likeUsers).toEqual([{ id: 4, nickname: '访客' }]);
  });
});
