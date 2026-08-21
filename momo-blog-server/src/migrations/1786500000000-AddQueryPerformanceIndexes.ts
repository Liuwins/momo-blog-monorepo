import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 为公开列表、评论审核和通知未读数增加常用过滤/排序索引。
 * SQLite 使用 IF NOT EXISTS，允许已手工补过索引的环境安全重放。
 */
export class AddQueryPerformanceIndexes1786500000000 implements MigrationInterface {
  name = 'AddQueryPerformanceIndexes1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_posts_created_at" ON "posts" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_posts_like_count" ON "posts" ("likeCount")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_posts_user_created_at" ON "posts" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_comments_post_created_at" ON "comments" ("postId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_comments_status_post" ON "comments" ("status", "postId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_receiver_created_at" ON "notifications" ("receiverId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_receiver_unread" ON "notifications" ("receiverId", "isRead")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_receiver_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_receiver_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comments_status_post"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comments_post_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_user_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_like_count"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_posts_created_at"`);
  }
}
