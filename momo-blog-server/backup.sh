#!/bin/bash
# MomoBlog 数据库每日备份 + 上传到阿里云 OSS
set -euo pipefail

# 按部署环境设置，不要把服务器路径、bucket 或 AccessKey 写入脚本。
DB_PATH="${DB_PATH:-./data/momoblog.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
OSS_ENDPOINT="${OSS_ENDPOINT:-}"
OSS_BUCKET="${OSS_BUCKET:-}"
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/momoblog.db.$DATE.bak"

# 保留本地最近7天
find "$BACKUP_DIR" -name "momoblog.db.*" -mtime +7 -delete

# 用 sqlite backup 命令保证一致性
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'" 2>/dev/null || \
  cp "$DB_PATH" "$BACKUP_FILE"

echo "本地备份完成: $BACKUP_FILE"

# 上传到 OSS（凭据必须由运行环境注入，不从仓库或固定路径读取）
if [ -n "${ALIYUN_AK_ID:-}" ] && [ -n "${ALIYUN_AK_SECRET:-}" ] && [ -n "$OSS_ENDPOINT" ] && [ -n "$OSS_BUCKET" ]; then
  python3 - "$BACKUP_FILE" "$DATE" << 'PYEOF'
import oss2, sys, os
from oss2.resumable import resumable_upload

local_file = sys.argv[1]
date_str = sys.argv[2]
object_key = f"backups/momoblog.db.{date_str}.bak"

auth = oss2.Auth(os.environ['ALIYUN_AK_ID'], os.environ['ALIYUN_AK_SECRET'])
bucket = oss2.Bucket(auth, os.environ['OSS_ENDPOINT'], os.environ['OSS_BUCKET'])

resumable_upload(bucket, object_key, local_file)
print(f"OSS 上传成功: {object_key}")
PYEOF
else
  echo "提示: OSS_ENDPOINT、OSS_BUCKET 和 AccessKey 未完整设置，跳过 OSS 上传"
fi
