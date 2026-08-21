import { MigrationInterface, QueryRunner } from 'typeorm';

/** 为通知增加业务事件去重键，避免网络重试产生重复未读通知。 */
export class AddNotificationDedupeKey1786601000000 implements MigrationInterface {
  name = 'AddNotificationDedupeKey1786601000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`PRAGMA table_info("notifications")`);
    if (!(columns as Array<{ name: string }>).some((column) => column.name === 'dedupeKey')) {
      await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "dedupeKey" varchar`);
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_notifications_dedupe_key" ON "notifications" ("dedupeKey") WHERE "dedupeKey" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_notifications_dedupe_key"`);
    const columns = await queryRunner.query(`PRAGMA table_info("notifications")`);
    if ((columns as Array<{ name: string }>).some((column) => column.name === 'dedupeKey')) {
      await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "dedupeKey"`);
    }
  }
}
