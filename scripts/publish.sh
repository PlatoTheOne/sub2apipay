#!/usr/bin/env bash
# scripts/publish.sh
# 构建并发布 Docker 镜像到 Docker Hub
# 在构建服务器（us-asaki-root）上运行
#
# 发布流程：
#   1. 本地开发完成后打 tag：git tag v1.2.3 && git push origin v1.2.3
#   2. 构建服务器拉取：git pull --tags
#   3. 运行此脚本：bash scripts/publish.sh
#
# 规则：
#   - 当前 commit 必须有精确 git tag，否则拒绝构建
#   - tag 格式支持 v1.2.3 或 1.2.3（推送时自动去掉前缀 v）
#   - 同时推送具体版本号和 latest 两个标签

set -euo pipefail

REGISTRY="touwaeriol/sub2apipay"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

# ── 读取版本号：必须来自当前 commit 的 git tag ────────────────────────────
RAW_TAG="$(git describe --exact-match --tags HEAD 2>/dev/null || true)"

if [[ -z "$RAW_TAG" ]]; then
  echo "✗ 构建中止：当前 commit 没有 git tag" >&2
  echo "" >&2
  echo "  请先打 tag 再运行此脚本：" >&2
  echo "    git tag v1.2.3" >&2
  echo "    git push origin v1.2.3" >&2
  echo "    git pull --tags   # 在构建服务器上同步" >&2
  exit 1
fi

# 去掉 v 前缀作为 Docker tag（v1.2.3 → 1.2.3）
VERSION="${RAW_TAG#v}"

echo "=============================="
echo "  git tag : $RAW_TAG"
echo "  版本号  : $VERSION"
echo "  镜像    : $REGISTRY"
echo "=============================="
echo ""

# ── 1. 构建 ────────────────────────────────────────────────────────────────
echo "[1/3] 构建镜像..."
docker compose build

# ── 2. 打标签 ──────────────────────────────────────────────────────────────
echo "[2/3] 打标签: $VERSION 和 latest..."
docker tag sub2apipay-app:latest "$REGISTRY:$VERSION"
docker tag sub2apipay-app:latest "$REGISTRY:latest"

# ── 3. 推送 ────────────────────────────────────────────────────────────────
echo "[3/3] 推送到 Docker Hub..."
docker push "$REGISTRY:$VERSION"
docker push "$REGISTRY:latest"

echo ""
echo "✓ 发布完成"
echo "  $REGISTRY:$VERSION"
echo "  $REGISTRY:latest"
echo ""
echo "━━━ 部署命令 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "# 含自带数据库"
echo "IMAGE_TAG=$VERSION docker compose -f docker-compose.hub.yml pull"
echo "IMAGE_TAG=$VERSION docker compose -f docker-compose.hub.yml up -d"
echo ""
echo "# 仅应用（外部数据库）"
echo "IMAGE_TAG=$VERSION docker compose -f docker-compose.app.yml pull"
echo "IMAGE_TAG=$VERSION docker compose -f docker-compose.app.yml up -d"
