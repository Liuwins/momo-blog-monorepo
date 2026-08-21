import { afterEach, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { Init1786353535155 } from './migrations/1786353535155-Init';
import { Init1786353568233 } from './migrations/1786353568233-Init';
import { AddMusicAndBgImage1786418900000 } from './migrations/1786418900000-AddMusicAndBgImage';

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
    expect(await dataSource.showMigrations()).toBe(false);
  });
});
