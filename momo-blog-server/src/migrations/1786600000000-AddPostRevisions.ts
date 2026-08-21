import { MigrationInterface, QueryRunner } from 'typeorm';

/** 保存动态编辑前快照，支持管理员审计和回滚。 */
export class AddPostRevisions1786600000000 implements MigrationInterface {
  name = 'AddPostRevisions1786600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_revisions" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "postId" integer NOT NULL,
        "userId" integer NOT NULL,
        "snapshot" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_post_revisions_post" FOREIGN KEY ("postId") REFERENCES "posts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_post_revisions_user" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_post_revisions_post_created_at" ON "post_revisions" ("postId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_post_revisions_post_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_revisions"`);
  }
}
