import { MigrationInterface, QueryRunner } from 'typeorm';

/** 为个人主页封面增加可选的视频媒体引用。 */
export class AddUserBgVideo1786602000000 implements MigrationInterface {
  name = 'AddUserBgVideo1786602000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`PRAGMA table_info("users")`);
    if (!(columns as Array<{ name: string }>).some((column) => column.name === 'bgVideo')) {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "bgVideo" varchar NOT NULL DEFAULT ''`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = await queryRunner.query(`PRAGMA table_info("users")`);
    if ((columns as Array<{ name: string }>).some((column) => column.name === 'bgVideo')) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bgVideo"`);
    }
  }
}
