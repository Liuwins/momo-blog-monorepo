#!/bin/bash
# MomoBlog 数据库每日备份 + 上传到阿里云 OSS
set -euo pipefail

# 按部署环境设置，不要把服务器路径、bucket 或 AccessKey 写入脚本。
DB_PATH="${DB_PATH:-./data/momoblog.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
UPLOAD_DIR="${UPLOAD_DIR:-./images}"
OSS_ENDPOINT="${OSS_ENDPOINT:-}"
OSS_BUCKET="${OSS_BUCKET:-}"
mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "错误: SQLite 数据库不存在: $DB_PATH" >&2
  exit 1
fi
if [ ! -d "$UPLOAD_DIR" ]; then
  echo "错误: 上传目录不存在，无法创建数据库与媒体成对备份: $UPLOAD_DIR" >&2
  exit 1
fi

DATE=$(date +%Y%m%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/momoblog.db.$DATE.bak"
MEDIA_BACKUP_FILE="$BACKUP_DIR/momoblog-images.$DATE.tar.gz"

# 保留本地最近 7 天：只有同一时间戳的数据库与媒体归档都存在且都过期时才成对清理。
# 孤立备份不自动删除，避免破坏最后一个可恢复的单边证据。
for db_backup in "$BACKUP_DIR"/momoblog.db.*.bak; do
  [ -f "$db_backup" ] || continue
  stamp=${db_backup##*/momoblog.db.}
  stamp=${stamp%.bak}
  media_backup="$BACKUP_DIR/momoblog-images.$stamp.tar.gz"
  if [ -f "$media_backup" ] \
    && find "$db_backup" -maxdepth 0 -type f -mtime +7 -print -quit | grep -q . \
    && find "$media_backup" -maxdepth 0 -type f -mtime +7 -print -quit | grep -q .; then
    rm -- "$db_backup" "$media_backup"
    echo "已清理成对过期备份：$stamp"
  fi
done

# 必须使用 SQLite backup，避免在线数据库直接 cp 产生不一致快照。
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "错误: 未找到 sqlite3，无法创建一致性备份" >&2
  exit 1
fi
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
if [ "$(sqlite3 "$BACKUP_FILE" 'PRAGMA integrity_check;' | tr -d '\r\n')" != "ok" ]; then
  echo "错误: SQLite 备份完整性校验失败" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "本地备份完成: $BACKUP_FILE"

# 上传目录与数据库必须成对保存，恢复时才能保留媒体引用。
tar -czf "$MEDIA_BACKUP_FILE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
echo "媒体备份完成: $MEDIA_BACKUP_FILE"

# 上传到 OSS（凭据必须由运行环境注入，不从仓库或固定路径读取）
if [ -n "${ALIYUN_AK_ID:-}" ] && [ -n "${ALIYUN_AK_SECRET:-}" ] && [ -n "$OSS_ENDPOINT" ] && [ -n "$OSS_BUCKET" ]; then
  python3 - "$BACKUP_FILE" "$MEDIA_BACKUP_FILE" "$DATE" << 'PYEOF'
import oss2, sys, os
from oss2.resumable import resumable_upload

db_file = sys.argv[1]
media_file = sys.argv[2]
date_str = sys.argv[3]

auth = oss2.Auth(os.environ['ALIYUN_AK_ID'], os.environ['ALIYUN_AK_SECRET'])
bucket = oss2.Bucket(auth, os.environ['OSS_ENDPOINT'], os.environ['OSS_BUCKET'])

for local_file, object_key in [
    (db_file, f"backups/momoblog.db.{date_str}.bak"),
    (media_file, f"backups/momoblog-images.{date_str}.tar.gz"),
]:
    if os.path.exists(local_file):
        resumable_upload(bucket, object_key, local_file)
        print(f"OSS 上传成功: {object_key}")
PYEOF
else
  echo "提示: OSS_ENDPOINT、OSS_BUCKET 和 AccessKey 未完整设置，跳过 OSS 上传"
fi
