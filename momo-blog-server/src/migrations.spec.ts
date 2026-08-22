import { afterEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { Init1786353535155 } from './migrations/1786353535155-Init';
import { Init1786353568233 } from './migrations/1786353568233-Init';
import { AddMusicAndBgImage1786418900000 } from './migrations/1786418900000-AddMusicAndBgImage';
import { AddQueryPerformanceIndexes1786500000000 } from './migrations/1786500000000-AddQueryPerformanceIndexes';
import { AddPostRevisions1786600000000 } from './migrations/1786600000000-AddPostRevisions';
import { AddNotificationDedupeKey1786601000000 } from './migrations/1786601000000-AddNotificationDedupeKey';
import { AddUserBgVideo1786602000000 } from './migrations/1786602000000-AddUserBgVideo';

describe('SQLite migrations', () => {
  let dataSource: DataSource | undefined;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('在空库中只建立一次基础表，并补齐历史、通知去重和媒体字段', async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      migrations: [
        Init1786353535155,
        Init1786353568233,
        AddMusicAndBgImage1786418900000,
        AddQueryPerformanceIndexes1786500000000,
        AddPostRevisions1786600000000,
        AddNotificationDedupeKey1786601000000,
        AddUserBgVideo1786602000000,
      ],
    });
    await dataSource.initialize();

    await dataSource.runMigrations();

    const tables = await dataSource.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'posts', 'comments') ORDER BY name`,
    );
    expect(tables.map((table: { name: string }) => table.name)).toEqual([
      'comments',
      'posts',
      'users',
    ]);
    const postColumns = await dataSource.query(`PRAGMA table_info(posts)`);
    const userColumns = await dataSource.query(`PRAGMA table_info(users)`);
    expect(postColumns.some((column: { name: string }) => column.name === 'music')).toBe(true);
    expect(userColumns.some((column: { name: string }) => column.name === 'bgImage')).toBe(true);
    expect(userColumns.some((column: { name: string }) => column.name === 'bgMusic')).toBe(true);
    expect(userColumns.some((column: { name: string }) => column.name === 'bgVideo')).toBe(true);
    const revisionTables = await dataSource.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'post_revisions'`,
    );
    expect(revisionTables).toHaveLength(1);
    const notificationColumns = await dataSource.query(`PRAGMA table_info(notifications)`);
    expect(notificationColumns.some((column: { name: string }) => column.name === 'dedupeKey')).toBe(true);
    const indexes = await dataSource.query(
      `SELECT name FROM sqlite_master WHERE type = 'index'`,
    );
    const indexNames = indexes.map((index: { name: string }) => index.name);
    expect(indexNames).toEqual(expect.arrayContaining([
      'IDX_posts_created_at',
      'IDX_posts_like_count',
      'IDX_posts_user_created_at',
      'IDX_comments_post_created_at',
      'IDX_comments_status_post',
      'IDX_notifications_receiver_created_at',
      'IDX_notifications_receiver_unread',
      'IDX_post_revisions_post_created_at',
      'UQ_notifications_dedupe_key',
    ]));
    expect(await dataSource.showMigrations()).toBe(false);
  });
});
