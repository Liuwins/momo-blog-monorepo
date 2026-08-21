/*
 * 在内存 SQLite 中比较动态列表的逐条关联查询和批量关联查询。
 * 该脚本只生成临时数据，不读取生产数据库，也不会写入仓库文件。
 */
const Database = require('better-sqlite3');

const POST_COUNT = 1000;
const COMMENTS_PER_POST = 6;
const LIKES_PER_POST = 8;
const PAGE_SIZE = 20;
const RUNS = 10;

const db = new Database(':memory:');
db.exec(`
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    userId INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    likeCount INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    postId INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    content TEXT NOT NULL
  );
  CREATE TABLE likes (
    id INTEGER PRIMARY KEY,
    postId INTEGER NOT NULL,
    userId INTEGER,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IDX_posts_created_at ON posts (createdAt);
  CREATE INDEX IDX_comments_post_created_at ON comments (postId, createdAt);
  CREATE INDEX IDX_likes_post_created_at ON likes (postId, createdAt);
`);

const insertPost = db.prepare(
  'INSERT INTO posts (id, userId, createdAt, likeCount) VALUES (?, ?, ?, ?)',
);
const insertComment = db.prepare(
  'INSERT INTO comments (id, postId, createdAt, content) VALUES (?, ?, ?, ?)',
);
const insertLike = db.prepare(
  'INSERT INTO likes (id, postId, userId, createdAt) VALUES (?, ?, ?, ?)',
);

db.transaction(() => {
  let commentId = 1;
  let likeId = 1;
  for (let postId = 1; postId <= POST_COUNT; postId += 1) {
    const createdAt = `2026-01-${String((postId % 28) + 1).padStart(2, '0')}T12:00:00.000Z`;
    insertPost.run(postId, (postId % 20) + 1, createdAt, LIKES_PER_POST);
    for (let i = 0; i < COMMENTS_PER_POST; i += 1) {
      insertComment.run(commentId++, postId, createdAt, `comment-${postId}-${i}`);
    }
    for (let i = 0; i < LIKES_PER_POST; i += 1) {
      insertLike.run(likeId++, postId, i + 1, createdAt);
    }
  }
})();

const postsQuery = db.prepare(
  'SELECT id, userId, createdAt, likeCount FROM posts ORDER BY createdAt DESC, id DESC LIMIT ? OFFSET ?',
);
const commentsByPost = db.prepare(
  'SELECT id, postId, createdAt, content FROM comments WHERE postId = ? ORDER BY createdAt ASC',
);
const likesByPost = db.prepare(
  'SELECT id, postId, userId, createdAt FROM likes WHERE postId = ? ORDER BY createdAt ASC',
);

function runLegacy() {
  const posts = postsQuery.all(PAGE_SIZE, 0);
  let rows = posts.length;
  for (const post of posts) {
    rows += commentsByPost.all(post.id).length;
    rows += likesByPost.all(post.id).length;
  }
  return { queryCount: 1 + posts.length * 2, rows };
}

function runBatch() {
  const posts = postsQuery.all(PAGE_SIZE, 0);
  const ids = posts.map((post) => post.id);
  const placeholders = ids.map(() => '?').join(',');
  const comments = db
    .prepare(
      `SELECT id, postId, createdAt, content FROM comments WHERE postId IN (${placeholders}) ORDER BY createdAt ASC`,
    )
    .all(...ids);
  const likes = db
    .prepare(
      `SELECT id, postId, userId, createdAt FROM likes WHERE postId IN (${placeholders}) ORDER BY createdAt ASC`,
    )
    .all(...ids);
  return { queryCount: 3, rows: posts.length + comments.length + likes.length };
}

function measure(label, fn) {
  for (let i = 0; i < 2; i += 1) fn();
  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed;
  const started = process.hrtime.bigint();
  let result;
  for (let i = 0; i < RUNS; i += 1) result = fn();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const after = process.memoryUsage().heapUsed;
  return {
    label,
    runs: RUNS,
    queryCount: result.queryCount,
    rows: result.rows,
    averageMs: Number((elapsedMs / RUNS).toFixed(3)),
    heapDeltaKb: Number(((after - before) / 1024).toFixed(1)),
  };
}

const batchIds = postsQuery.all(PAGE_SIZE, 0).map((post) => post.id);
const batchPlaceholders = batchIds.map(() => '?').join(',');
const commentsPlan = db
  .prepare(
    `EXPLAIN QUERY PLAN SELECT id, postId FROM comments WHERE postId IN (${batchPlaceholders}) ORDER BY createdAt ASC`,
  )
  .all(...batchIds)
  .map((row) => row.detail);
const likesPlan = db
  .prepare(
    `EXPLAIN QUERY PLAN SELECT id, postId FROM likes WHERE postId IN (${batchPlaceholders}) ORDER BY createdAt ASC`,
  )
  .all(...batchIds)
  .map((row) => row.detail);

const legacy = measure('legacy-per-post', runLegacy);
const batch = measure('batch-by-page', runBatch);
const output = {
  dataset: {
    posts: POST_COUNT,
    comments: POST_COUNT * COMMENTS_PER_POST,
    likes: POST_COUNT * LIKES_PER_POST,
    pageSize: PAGE_SIZE,
  },
  legacy,
  batch,
  queryReduction: `${legacy.queryCount} -> ${batch.queryCount} (${((1 - batch.queryCount / legacy.queryCount) * 100).toFixed(1)}% fewer)`,
  queryPlan: { comments: commentsPlan, likes: likesPlan },
};

console.log(JSON.stringify(output, null, 2));
db.close();
