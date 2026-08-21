#!/bin/bash
# SSL 证书到期检查 + 自动续期
set -euo pipefail

# 按部署环境设置，示例值不写入公开仓库。
DOMAINS="${CERT_DOMAINS:-}"
CERT_ROOT="${CERT_ROOT:-/etc/letsencrypt/live}"
LOG="${CERT_LOG:-./logs/cert-renew.log}"
THRESHOLD_DAYS=20

if [ -z "$DOMAINS" ]; then
  echo "请设置 CERT_DOMAINS（可包含多个空格分隔的域名）" >&2
  exit 1
fi

for command_name in openssl date; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "错误: 未找到必需命令 $command_name" >&2
    exit 1
  fi
done

mkdir -p "$(dirname "$LOG")"

for domain in $DOMAINS; do
  CERT="$CERT_ROOT/$domain/fullchain.pem"
  if [ ! -f "$CERT" ]; then
    echo "$(date '+%F %T') [WARN] $domain 证书文件不存在" >> $LOG
    continue
  fi

  # 计算到期剩余天数
  EXPIRY=$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

  echo "$(date '+%F %T') $domain 证书剩余 ${DAYS_LEFT} 天 (到期 $EXPIRY)" >> $LOG

  if [ "$DAYS_LEFT" -le "$THRESHOLD_DAYS" ]; then
    echo "$(date '+%F %T') [RENEW] $domain 续期证书..." >> $LOG
    if certbot renew --quiet --non-interactive >> "$LOG" 2>&1; then
      echo "$(date '+%F %T') [OK] $domain 续期成功" >> $LOG
      if systemctl reload nginx >> "$LOG" 2>&1; then
        echo "$(date '+%F %T') [OK] Nginx 已重新加载" >> "$LOG"
      else
        echo "$(date '+%F %T') [FAIL] Nginx 重新加载失败" >> "$LOG"
        exit 1
      fi
    else
      echo "$(date '+%F %T') [FAIL] $domain 续期失败" >> "$LOG"
      exit 1
    fi
  fi
done
