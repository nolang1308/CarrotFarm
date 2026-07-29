#!/usr/bin/env bash
# ===================================================================
# 당근농장 릴리스 스크립트
#
# 사용법:
#   npm run release 0.0.3
#   npm run release 0.0.3 "이번 버전 변경사항 요약"
#
# 하는 일 (버전 갱신 → 빌드 → GitHub 릴리스 → 푸시 → Vercel 자동 배포):
#   1. package.json + website Download.tsx 버전 갱신
#   2. macOS(dmg)·Windows(exe) 빌드
#   3. GitHub 릴리스 생성 + 설치 파일·latest.yml(자동 업데이트 메타) 업로드
#   4. 커밋 & 푸시 → Vercel 이 웹사이트 자동 배포
# ===================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${1:-}"
NOTES="${2:-}"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ 버전을 x.y.z 형식으로 주세요. 예: npm run release 0.0.3"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "❌ GitHub CLI 로그인이 필요합니다: gh auth login"
  exit 1
fi

if gh release view "v$VERSION" >/dev/null 2>&1; then
  echo "❌ v$VERSION 릴리스가 이미 있습니다. 다른 버전 번호를 쓰세요."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  커밋되지 않은 변경이 있습니다. 릴리스 커밋에 함께 포함됩니다."
  read -r -p "계속할까요? (y/N) " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || exit 1
fi

echo ""
echo "🥕 [1/5] 버전 갱신 → $VERSION"
npm version "$VERSION" --no-git-tag-version >/dev/null
sed -i '' "s/const VERSION = '[0-9.]*'/const VERSION = '$VERSION'/" \
  website/src/components/Download.tsx

echo "🥕 [2/5] macOS 빌드 (dmg)"
npm run electron:build:mac

echo "🥕 [3/5] Windows 빌드 (exe)"
npm run electron:build:win

# 산출물 확인 (latest.yml 이 없으면 Windows 자동 업데이트가 죽으므로 필수 검사)
FILES=(
  "release/CarrotFarm-$VERSION-arm64.dmg"
  "release/CarrotFarm-$VERSION.dmg"
  "release/CarrotFarm-Setup-$VERSION.exe"
  "release/CarrotFarm-Setup-$VERSION.exe.blockmap"
  "release/latest.yml"
)
for f in "${FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ 빌드 산출물이 없습니다: $f"
    exit 1
  fi
done

echo "🥕 [4/5] GitHub 릴리스 생성 + 업로드 (파일이 커서 수 분 걸립니다)"
gh release create "v$VERSION" "${FILES[@]}" \
  --title "CarrotFarm v$VERSION" \
  --notes "${NOTES:-CarrotFarm v$VERSION}"

echo "🥕 [5/5] 커밋 & 푸시 (Vercel 이 웹사이트 자동 배포)"
git add -A
git commit -m "v$VERSION 릴리스"
git push

echo ""
echo "✅ v$VERSION 릴리스 완료!"
echo "   릴리스:   https://github.com/nolang1308/CarrotFarm/releases/tag/v$VERSION"
echo "   웹사이트: 잠시 후 Vercel 자동 배포로 다운로드 버튼이 v$VERSION 을 가리킵니다"
echo "   기존 사용자: Windows 는 자동 업데이트, macOS 는 앱 실행 시 안내창이 뜹니다"
