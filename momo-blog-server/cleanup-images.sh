#!/bin/bash
# 清理未引用的图片文件（文章删除/编辑后遗留的）
# 默认只报告，不删除；确认引用范围后设置 DRY_RUN=0 再执行。

set -euo pipefail

IMAGES_DIR="${UPLOAD_DIR:-./images}"
DB="${DB_PATH:-./data/momoblog.db}"
LOG="${CLEANUP_LOG:-./logs/momo-blog-cleanup.log}"
DRY_RUN="${DRY_RUN:-1}"

case "$IMAGES_DIR" in
  ''|'/'|'.'|'./')
    echo "拒绝使用过宽的 UPLOAD_DIR：$IMAGES_DIR" >&2
    exit 1
    ;;
esac

mkdir -p "$(dirname "$LOG")"

echo "$(date '+%Y-%m-%d %H:%M:%S') 开始清理..." >> "$LOG"

# 收集所有媒体引用（动态图片/视频/配乐、头像、封面和背景音乐）。
# simple-array 字段以逗号保存，统一拆分后再与 images 根目录下的随机目录比较。
REFERENCES=$(sqlite3 "$DB" "
  SELECT images FROM posts WHERE images != ''
  UNION ALL SELECT videos FROM posts WHERE videos != ''
  UNION ALL SELECT music FROM posts WHERE music != ''
  UNION ALL SELECT avatar FROM users WHERE avatar != ''
  UNION ALL SELECT bgImage FROM users WHERE bgImage != ''
  UNION ALL SELECT bgMusic FROM users WHERE bgMusic != '';
" | tr ',' '\n' | sed 's|^/images/||' | sort -u)

if [ -z "$REFERENCES" ]; then
  echo "数据库没有媒体引用，将报告所有未忽略媒体项" >> "$LOG"
fi

# 统计
DELETED=0
DELETED_SIZE=0

# 检查所有文件和目录
for item in "$IMAGES_DIR"/*; do
  name=$(basename "$item")
  
  # og-cover 和 .开头的隐藏文件跳过
  if [[ "$name" == "og-cover"* ]] || [[ "$name" == .* ]]; then
    continue
  fi
  
  # 检查是否被引用
  found=false
  while IFS= read -r ref; do
    if [[ "$ref" == "$name" ]] || [[ "$ref" == "$name/"* ]]; then
      found=true
      break
    fi
  done <<< "$REFERENCES"
  
  if [ "$found" = false ]; then
    # 未引用：默认只报告，显式 DRY_RUN=0 才删除
    size=$(du -sb "$item" 2>/dev/null | awk '{print $1}')
    if [ "$DRY_RUN" = "0" ]; then
      if [ -d "$item" ]; then
        rm -rf "$item"
        echo "删除目录: $name ($(numfmt --to=iec $size 2>/dev/null || echo ${size}B))" >> "$LOG"
      else
        rm -f "$item"
        echo "删除文件: $name ($(numfmt --to=iec $size 2>/dev/null || echo ${size}B))" >> "$LOG"
      fi
    else
      echo "仅报告未引用项: $name ($(numfmt --to=iec $size 2>/dev/null || echo ${size}B))" >> "$LOG"
    fi
    DELETED=$((DELETED + 1))
    DELETED_SIZE=$((DELETED_SIZE + size))
  fi
done

if [ $DELETED -gt 0 ]; then
  echo "清理完成：删除 $DELETED 项，释放 $(numfmt --to=iec $DELETED_SIZE 2>/dev/null || echo ${DELETED_SIZE}B)" >> "$LOG"
else
  echo "清理完成：无需删除" >> "$LOG"
fi
