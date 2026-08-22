/*
 * 生成上传目录媒体统计和孤立文件报告。
 * 默认输出到 stdout；设置 REPORT_FILE 后写入指定文件。
 * 只输出相对上传目录的路径，不输出数据库或服务器绝对路径。
 */
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || './data/momoblog.db';
const uploadDir = process.env.UPLOAD_DIR || './images';
const reportFile = process.env.REPORT_FILE || '';
const maxOrphans = Number.parseInt(process.env.REPORT_MAX_ORPHANS || '1000', 10);

if (!fs.existsSync(dbPath)) throw new Error(`数据库不存在: ${dbPath}`);
if (!fs.existsSync(uploadDir)) throw new Error(`上传目录不存在: ${uploadDir}`);

function normalizeReference(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const value = raw.trim();
  let pathname = value;
  try {
    pathname = new URL(value, 'http://localhost').pathname;
  } catch {
    // 非 URL 字符串按相对路径处理。
  }
  pathname = decodeURIComponent(pathname).replaceAll('\\', '/');
  const marker = '/images/';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex >= 0) pathname = pathname.slice(markerIndex + marker.length);
  pathname = pathname.replace(/^\.?\//, '').replace(/^\//, '');
  if (!pathname || pathname.includes('..')) return null;
  return pathname;
}

function collectReferences(db) {
  const references = new Set();
  const rows = [
    ...db.prepare('SELECT images, videos, music FROM posts').all(),
    ...db.prepare('SELECT avatar, bgImage, bgVideo, bgMusic FROM users').all(),
  ];
  for (const row of rows) {
    for (const value of Object.values(row)) {
      for (const item of String(value || '').split(',')) {
        const normalized = normalizeReference(item);
        if (normalized) references.add(normalized);
      }
    }
  }
  return references;
}

function walkFiles(root) {
  const files = [];
  const stack = [{ directory: root, relative: '' }];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current.directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || (current.relative === '' && entry.name.startsWith('og-cover'))) continue;
      const absolute = path.join(current.directory, entry.name);
      const relative = path.posix.join(current.relative, entry.name);
      if (entry.isDirectory()) stack.push({ directory: absolute, relative });
      else if (entry.isFile()) files.push({ relative, bytes: fs.statSync(absolute).size });
    }
  }
  return files;
}

const db = new Database(dbPath, { readonly: true });
const references = collectReferences(db);
const files = walkFiles(uploadDir);
db.close();

const byExtension = {};
const orphans = [];
let referencedBytes = 0;
let orphanBytes = 0;
let orphanFiles = 0;
for (const file of files) {
  const extension = path.extname(file.relative).toLowerCase() || '[none]';
  const referenced = references.has(file.relative);
  const item = byExtension[extension] || { files: 0, bytes: 0, orphanFiles: 0, orphanBytes: 0 };
  item.files += 1;
  item.bytes += file.bytes;
  if (referenced) referencedBytes += file.bytes;
  else {
    orphanFiles += 1;
    orphanBytes += file.bytes;
    item.orphanFiles += 1;
    item.orphanBytes += file.bytes;
    if (orphans.length < maxOrphans) orphans.push(file);
  }
  byExtension[extension] = item;
}

const report = {
  reportVersion: 1,
  generatedAt: new Date().toISOString(),
  summary: {
    files: files.length,
    bytes: files.reduce((total, file) => total + file.bytes, 0),
    referencedFiles: files.length - orphanFiles,
    referencedBytes,
    orphanFiles,
    orphanBytes,
    orphanListTruncated: orphans.length < orphanFiles,
  },
  byExtension,
  orphans,
};

const output = `${JSON.stringify(report, null, 2)}\n`;
if (reportFile) {
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, output, 'utf8');
} else process.stdout.write(output);
