import { MigrationInterface, QueryRunner } from 'typeorm';
import { Init1786353535155 } from './1786353535155-Init';

/**
 * 兼容历史版本的重复初始化迁移。
 *
 * 公开快照曾同时包含两个内容相同的 Init migration。保留迁移名称可以让
 * 已记录该名称的旧数据库继续工作，但不再重复创建已经存在的表。
 */
export class Init1786353568233 implements MigrationInterface {
  name = 'Init1786353568233';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = await queryRunner.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'comments'`,
    );
    if (tables.length > 0) {
      // 当前 schema 已由 1786353535155 建立，避免重复创建表。
      return;
    }
    // 兼容极少数只记录了本迁移名称的旧库，让它仍能建立基础 schema。
    await new Init1786353535155().up(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const migrations = await queryRunner.query(
      `SELECT name FROM "migrations" WHERE name = 'Init1786353535155'`,
    );
    if (migrations.length === 0) {
      await new Init1786353535155().down(queryRunner);
    }
  }
}
