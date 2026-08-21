import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { Comment } from '../../entities/comment.entity';
import { Like } from '../../entities/like.entity';
import { PostRevision } from '../../entities/post-revision.entity';
import { CreatePostDto, UpdatePostDto, QueryPostsDto } from './dto';

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepo: Repository<Post>,
    @InjectRepository(Comment)
    private commentsRepo: Repository<Comment>,
    @InjectRepository(Like)
    private likesRepo: Repository<Like>,
    @InjectRepository(PostRevision)
    private revisionsRepo: Repository<PostRevision>,
    private dataSource: DataSource,
  ) {}

  async findAll(query: QueryPostsDto, currentUserId?: number) {
    const { page = 1, pageSize = 10, keyword, sortBy = 'latest', tag } = query;
    const qb = this.postsRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (keyword) {
      qb.andWhere("post.content LIKE :keyword ESCAPE '\\'", {
        keyword: `%${escapeLikePattern(keyword)}%`,
      });
    }

    const normalizedTag = typeof tag === 'string' ? tag.trim() : tag;
    if (normalizedTag) {
      // simple-array 以逗号分隔；INSTR 配合首尾逗号只匹配完整标签，不把“生活”误匹配为“生活方式”。
      qb.andWhere(
        "INSTR(',' || COALESCE(post.tags, '') || ',', ',' || :tag || ',') > 0",
        { tag: normalizedTag },
      );
    }

    if (sortBy === 'hot') {
      qb.orderBy('post.likeCount', 'DESC');
    } else {
      qb.orderBy('post.createdAt', 'DESC');
    }

    const [data, total] = await qb.getManyAndCount();
    return this.formatList(data, total, currentUserId);
  }

  async findUserPosts(userId: number, page: number, pageSize: number, currentUserId?: number) {
    const [data, total] = await this.postsRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .where('post.userId = :userId', { userId })
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return this.formatList(data, total, currentUserId);
  }

  async formatList(data: Post[], total: number, currentUserId?: number) {

    const postIds = data.map((post) => post.id);
    const [comments, likes] = postIds.length
      ? await Promise.all([
          this.commentsRepo.find({
            where: { postId: In(postIds) },
            relations: ['user'],
            order: { createdAt: 'ASC' },
          }),
          this.likesRepo.find({
            where: { postId: In(postIds) },
            relations: ['user'],
            order: { createdAt: 'ASC' },
          }),
        ])
      : [[], []];
    const commentsByPost = this.groupByPostId(comments);
    const likesByPost = this.groupByPostId(likes);
    const items = data.map((post) => {
      const postComments = commentsByPost.get(post.id) || [];
      const postLikes = likesByPost.get(post.id) || [];
      return {
        id: post.id,
        userId: post.userId,
        user: post.user
          ? { id: post.user.id, nickname: post.user.nickname, avatar: post.user.avatar }
          : null,
        content: post.content,
        images: post.images,
        videos: post.videos,
        music: post.music,
        tags: post.tags || [],
        createdAt: post.createdAt,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        liked: currentUserId
          ? postLikes.some((like) => like.userId === currentUserId)
          : false,
        comments: this.filterCommentsForUser(postComments, currentUserId).slice(0, 3),
        likeUsers: this.formatLikeUsers(postLikes.slice(0, 8)),
      };
    });

    return { list: items, total };
  }

  async findById(id: number, currentUserId?: number) {
    const post = await this.postsRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!post) return null;

    return {
      id: post.id,
      userId: post.userId,
      user: post.user
        ? { id: post.user.id, nickname: post.user.nickname, avatar: post.user.avatar }
        : null,
      content: post.content,
      images: post.images,
      videos: post.videos,
      music: post.music,
      tags: post.tags || [],
      createdAt: post.createdAt,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      liked: currentUserId
        ? await this.likesRepo.exist({ where: { userId: currentUserId, postId: post.id } })
        : false,
      comments: await this.getFullComments(post.id, currentUserId),
      likeUsers: await this.getLikeUsers(post.id),
    };
  }

  async create(userId: number, dto: CreatePostDto) {
    const post = this.postsRepo.create({
      userId,
      content: dto.content,
      images: dto.images || [],
      videos: dto.videos || [],
      music: dto.music || '',
      tags: dto.tags || [],
    });
    const saved = await this.postsRepo.save(post);
    return this.findById(saved.id, userId);
  }

  async update(id: number, userId: number, dto: UpdatePostDto) {
    const changed =
      dto.content !== undefined ||
      dto.images !== undefined ||
      dto.videos !== undefined ||
      dto.music !== undefined ||
      dto.tags !== undefined;
    const updated = await this.dataSource.transaction(async (manager) => {
      const postsRepo = manager.getRepository(Post);
      const revisionsRepo = manager.getRepository(PostRevision);
      const post = await postsRepo.findOne({ where: { id } });
      if (!post || post.userId !== userId) return false;
      const before = this.createRevisionSnapshot(post);
      if (dto.content !== undefined) post.content = dto.content;
      if (dto.images !== undefined) post.images = dto.images;
      if (dto.videos !== undefined) post.videos = dto.videos;
      if (dto.music !== undefined) post.music = dto.music;
      if (dto.tags !== undefined) post.tags = dto.tags;
      await postsRepo.save(post);
      if (changed) {
        await revisionsRepo.save({
          postId: id,
          userId,
          snapshot: JSON.stringify(before),
        });
      }
      return true;
    });
    if (!updated) return null;
    return this.findById(id, userId);
  }

  async getHistory(id: number, userId: number) {
    const post = await this.postsRepo.findOne({ where: { id } });
    if (!post || post.userId !== userId) return null;
    const revisions = await this.revisionsRepo.find({
      where: { postId: id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return revisions.map((revision) => {
      const snapshot = this.parseRevisionSnapshot(revision.snapshot);
      return {
        id: revision.id,
        createdAt: revision.createdAt,
        contentPreview: snapshot.content.slice(0, 120),
        imagesCount: snapshot.images.length,
        videosCount: snapshot.videos.length,
        tags: snapshot.tags,
        music: snapshot.music,
      };
    });
  }

  async restoreRevision(id: number, revisionId: number, userId: number) {
    const restored = await this.dataSource.transaction(async (manager) => {
      const postsRepo = manager.getRepository(Post);
      const revisionsRepo = manager.getRepository(PostRevision);
      const post = await postsRepo.findOne({ where: { id } });
      if (!post || post.userId !== userId) return false;
      const revision = await revisionsRepo.findOne({ where: { id: revisionId, postId: id } });
      if (!revision) return false;

      const current = this.createRevisionSnapshot(post);
      const snapshot = this.parseRevisionSnapshot(revision.snapshot);
      await revisionsRepo.save({
        postId: id,
        userId,
        snapshot: JSON.stringify(current),
      });
      post.content = snapshot.content;
      post.images = snapshot.images;
      post.videos = snapshot.videos;
      post.music = snapshot.music;
      post.tags = snapshot.tags;
      await postsRepo.save(post);
      return true;
    });
    if (!restored) return null;
    return this.findById(id, userId);
  }

  async delete(id: number, userId: number) {
    const post = await this.postsRepo.findOne({ where: { id } });
    if (!post || post.userId !== userId) return false;
    await this.postsRepo.remove(post);
    return true;
  }

  async getAllTags(period?: 'week' | 'all') {
    const qb = this.postsRepo.createQueryBuilder('post').select(['post.tags']);
    // 本周热门：仅统计近 7 天的动态
    if (period === 'week') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      qb.where('post.createdAt >= :since', { since });
    }
    const posts = await qb.getMany();
    const tagCount = new Map<string, number>();
    for (const p of posts) {
      for (const t of (p.tags || [])) {
        const tag = t.trim();
        if (tag) tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    return Array.from(tagCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async incrementCommentCount(id: number) {
    await this.postsRepo.increment({ id }, 'commentCount', 1);
  }

  async decrementCommentCount(id: number) {
    // 下界保护：防止计数变为负数（并发或异常重试时）
    await this.postsRepo
      .createQueryBuilder()
      .update(Post)
      .set({ commentCount: () => 'MAX(commentCount - 1, 0)' })
      .where('id = :id', { id })
      .execute();
  }

  async incrementLikeCount(id: number) {
    await this.postsRepo.increment({ id }, 'likeCount', 1);
  }

  async decrementLikeCount(id: number) {
    // 下界保护：防止点赞计数变为负数
    await this.postsRepo
      .createQueryBuilder()
      .update(Post)
      .set({ likeCount: () => 'MAX(likeCount - 1, 0)' })
      .where('id = :id', { id })
      .execute();
  }

  private async getPreviewComments(postId: number, currentUserId?: number) {
    const comments = await this.commentsRepo.find({
      where: { postId },
      relations: ['user'],
      take: 3,
      order: { createdAt: 'ASC' },
    });
    return this.filterCommentsForUser(comments, currentUserId);
  }

  private async getFullComments(postId: number, currentUserId?: number) {
    const comments = await this.commentsRepo.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
    return this.filterCommentsForUser(comments, currentUserId);
  }

  private filterCommentsForUser(comments: any[], currentUserId?: number) {
    return comments
      .filter((c) => {
        if (c.status === 'approved') return true;
        if (currentUserId) return true;
        return false;
      })
      .map((c) => ({
        id: c.id,
        nickname: c.nickname || c.user?.nickname || '匿名',
        avatar: c.user?.avatar || '',
        content: c.content,
        createdAt: c.createdAt,
        status: c.status,
        replyTo: c.replyToId ? { id: c.replyToId, nickname: c.replyToNickname } : null,
      }));
  }

  private async getLikeUsers(postId: number) {
    const likes = await this.likesRepo.find({
      where: { postId },
      relations: ['user'],
      take: 8,
    });
    return this.formatLikeUsers(likes);
  }

  private formatLikeUsers(likes: Like[]) {
    return likes
      .filter((l) => l.user)
      .map((l) => ({ id: l.user.id, nickname: l.user.nickname }));
  }

  private groupByPostId<T extends { postId: number }>(rows: T[]) {
    const grouped = new Map<number, T[]>();
    for (const row of rows) {
      const list = grouped.get(row.postId) || [];
      list.push(row);
      grouped.set(row.postId, list);
    }
    return grouped;
  }

  private createRevisionSnapshot(post: Post) {
    return {
      content: post.content || '',
      images: Array.isArray(post.images) ? [...post.images] : [],
      videos: Array.isArray(post.videos) ? [...post.videos] : [],
      music: post.music || '',
      tags: Array.isArray(post.tags) ? [...post.tags] : [],
    };
  }

  private parseRevisionSnapshot(raw: string) {
    try {
      const value = JSON.parse(raw) as Partial<ReturnType<PostsService['createRevisionSnapshot']>>;
      return {
        content: typeof value.content === 'string' ? value.content : '',
        images: Array.isArray(value.images) ? value.images.filter((item): item is string => typeof item === 'string') : [],
        videos: Array.isArray(value.videos) ? value.videos.filter((item): item is string => typeof item === 'string') : [],
        music: typeof value.music === 'string' ? value.music : '',
        tags: Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === 'string') : [],
      };
    } catch {
      return { content: '', images: [], videos: [], music: '', tags: [] };
    }
  }
}
