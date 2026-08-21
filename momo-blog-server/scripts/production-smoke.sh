#!/bin/sh
# 对已部署站点执行不带凭据的基础可用性冒烟检查。
# 用法：BASE_URL=https://example.com ./production-smoke.sh

set -eu

BASE_URL="${BASE_URL:-}"
REQUIRE_HTTPS="${REQUIRE_HTTPS:-1}"
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"

if [ -z "$BASE_URL" ]; then
  echo "请设置 BASE_URL，例如 BASE_URL=https://example.com" >&2
  exit 2
fi

case "$BASE_URL" in
  */) BASE_URL=${BASE_URL%/} ;;
esac

case "$BASE_URL" in
  https://*) : ;;
  http://*)
    if [ "$REQUIRE_HTTPS" = "1" ]; then
      echo "生产冒烟默认要求 HTTPS；本地 HTTP 验证请设置 REQUIRE_HTTPS=0" >&2
      exit 2
    fi
    ;;
  *)
    echo "BASE_URL 必须是完整的 http(s) 地址" >&2
    exit 2
    ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "错误: 未找到 curl" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT HUP INT TERM

request() {
  curl --fail --silent --show-error --location --max-time "$CURL_TIMEOUT" \
    --dump-header "$TMP_DIR/headers" --output "$TMP_DIR/body" "$1"
}

assert_header() {
  header_name=$1
  if ! grep -Eiq "^${header_name}:" "$TMP_DIR/headers"; then
    echo "缺少响应头: $header_name" >&2
    exit 1
  fi
}

request "$BASE_URL/"
grep -q 'id="app"' "$TMP_DIR/body" || {
  echo "首页未返回 Vue 应用入口" >&2
  exit 1
}
assert_header 'X-Content-Type-Options'
assert_header 'Content-Security-Policy'
assert_header 'Referrer-Policy'
assert_header 'Permissions-Policy'

request "$BASE_URL/manifest.webmanifest"
grep -Eiq '^content-type:.*application/manifest\+json' "$TMP_DIR/headers" || {
  echo "manifest 的 Content-Type 不是 application/manifest+json" >&2
  exit 1
}

request "$BASE_URL/api/health"
grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' "$TMP_DIR/body" || {
  echo "健康检查未返回 status=ok" >&2
  exit 1
}

request "$BASE_URL/socket.io/?EIO=4&transport=polling&namespace=%2Fnotifications"
grep -q 'sid' "$TMP_DIR/body" || {
  echo "Socket.IO polling 握手失败" >&2
  exit 1
}

echo "线上基础冒烟通过: $BASE_URL"
