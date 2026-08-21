#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const result = spawnSync('git', ['ls-files'], { encoding: 'utf8' });
if (result.error || result.status !== 0) {
  console.error('无法读取 Git 已跟踪文件，请在仓库根目录执行此脚本。');
  process.exit(1);
}

const forbidden = /(^|\/)(\.env($|\.)|.*\.(sqlite|db|log|pem|key|p12|pfx)$|dist|images|uploads|screenshots)(\/|$)|.*screenshot\.(png|jpg|jpeg)$/i;
const tracked = result.stdout.split(/\r?\n/).filter(Boolean);
const matches = tracked.filter((file) => forbidden.test(file) && !/(^|\/)\.env\.example$/.test(file));

if (matches.length > 0) {
  console.error('敏感或生成文件不允许进入公开仓库：');
  for (const file of matches) console.error(`- ${file}`);
  process.exit(1);
}

const whitespace = spawnSync('git', ['diff', '--check'], { encoding: 'utf8' });
if (whitespace.status !== 0) {
  process.stderr.write(whitespace.stdout || whitespace.stderr || '发现空白错误。\n');
  process.exit(1);
}

console.log(`仓库卫生检查通过：${tracked.length} 个已跟踪文件，无敏感/生成文件，空白检查通过。`);
