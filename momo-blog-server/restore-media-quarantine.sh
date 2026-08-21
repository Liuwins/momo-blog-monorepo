#!/bin/bash
# 恢复 cleanup-images.sh 移入的媒体隔离区。
# 用法：BACKUP_CONFIRMED=1 RESTORE_RUN=20260821_120000 ./restore-media-quarantine.sh

set -euo pipefail

IMAGES_DIR="${UPLOAD_DIR:-./images}"
QUARANTINE_DIR="${QUARANTINE_DIR:-./media-quarantine}"
RESTORE_RUN="${RESTORE_RUN:-}"

if [ "${BACKUP_CONFIRMED:-0}" != "1" ]; then
  echo "恢复前请确认当前数据库和上传目录已备份，并设置 BACKUP_CONFIRMED=1" >&2
  exit 1
fi
if [[ ! "$RESTORE_RUN" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
  echo "RESTORE_RUN 格式必须为 YYYYMMDD_HHMMSS" >&2
  exit 1
fi
case "$IMAGES_DIR" in
  ''|'/'|'.'|'./') echo "拒绝使用过宽的 UPLOAD_DIR：$IMAGES_DIR" >&2; exit 1 ;;
esac
case "$QUARANTINE_DIR" in
  ''|'/'|'.'|'./'|"$IMAGES_DIR"|"$IMAGES_DIR"/*) echo "拒绝使用过宽或位于上传目录内的 QUARANTINE_DIR：$QUARANTINE_DIR" >&2; exit 1 ;;
esac

RUN_DIR="$QUARANTINE_DIR/$RESTORE_RUN"
if [ ! -d "$RUN_DIR" ]; then
  echo "隔离区不存在：$RESTORE_RUN" >&2
  exit 1
fi
mkdir -p "$IMAGES_DIR"

for item in "$RUN_DIR"/*; do
  name=$(basename "$item")
  [ "$name" = "MANIFEST" ] && continue
  destination="$IMAGES_DIR/$name"
  if [ -e "$destination" ]; then
    echo "恢复中止：目标已存在 $destination" >&2
    exit 1
  fi
  mv -- "$item" "$destination"
  echo "已恢复：$name"
done

echo "恢复完成：$RESTORE_RUN"
