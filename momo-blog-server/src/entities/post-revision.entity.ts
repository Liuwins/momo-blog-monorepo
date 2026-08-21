import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** 动态编辑前的不可变快照，用于审计和一键回滚。 */
@Entity('post_revisions')
@Index('IDX_post_revisions_post_created_at', ['postId', 'createdAt'])
export class PostRevision {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @Column()
  userId: number;

  // 使用 JSON 文本保留数组字段，避免历史结构变更时丢失信息。
  @Column({ type: 'text' })
  snapshot: string;

  @CreateDateColumn()
  createdAt: Date;
}
