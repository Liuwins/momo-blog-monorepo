import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../entities/user.entity';
import { FollowsService } from '../follows/follows.service';
import { PostsService } from '../posts/posts.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private followsService: FollowsService,
    private postsService: PostsService,
  ) {}

  async create(data: { username: string; password: string; nickname: string }) {
    // 密码必须哈希后存储，防止明文落库
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = this.usersRepo.create({
      ...data,
      password: hashedPassword,
    });
    return this.usersRepo.save(user);
  }

  async findById(id: number) {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByUsername(username: string) {
    return this.usersRepo.findOne({ where: { username } });
  }

  async updateProfile(id: number, data: Partial<User>) {
    // 防止通过 updateProfile 修改密码字段
    const { password, ...safeData } = data;
    await this.usersRepo.update(id, safeData);
    return this.getProfile(id);
  }

  async getProfile(id: number, currentUserId?: number) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    const result = await this.usersRepo.manager.query(
      'SELECT COUNT(*) as count FROM posts WHERE userId = ?',
      [id],
    );
    const postCount = parseInt(result[0].count);
    const [followerCount, followingCount, isFollowing] = await Promise.all([
      this.followsService.getFollowerCount(id),
      this.followsService.getFollowingCount(id),
      currentUserId
        ? this.followsService.isFollowing(currentUserId, id)
        : Promise.resolve(false),
    ]);
    // 过滤掉敏感字段（password 哈希不应泄露）
    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      postCount,
      followerCount,
      followingCount,
      isFollowing,
    };
  }

  async getUserPosts(userId: number, page: number, pageSize: number, currentUserId?: number) {
    return this.postsService.findUserPosts(userId, page, pageSize, currentUserId);
  }
}
