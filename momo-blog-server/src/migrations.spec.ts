import { afterEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { Init1786353535155 } from './migrations/1786353535155-Init';
import { Init1786353568233 } from './migrations/1786353568233-Init';
import { AddMusicAndBgImage1786418900000 } from './migrations/1786418900000-AddMusicAndBgImage';
import { AddQueryPerformanceIndexes1786500000000 } from './migrations/1786500000000-AddQueryPerformanceIndexes';

describe('SQLite migrations', () => {
  let dataSource: DataSource | undefined;

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('在空库中只建立一次基础表，并补齐配乐和背景字段', async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      migrations: [
        Init1786353535155,
        Init1786353568233,
        AddMusicAndBgImage1786418900000,
        AddQueryPerformanceIndexes1786500000000,
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
    const indexes = await dataSource.query(
      `SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'IDX_%'`,
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
    ]));
    expect(await dataSource.showMigrations()).toBe(false);
  });
});
