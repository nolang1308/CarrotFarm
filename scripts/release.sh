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

# macOS 서명·공증 자격증명 로드 (.env.release — 커밋 안 됨)
if [[ -f .env.release ]]; then
  set -a
  source .env.release
  set +a
fi

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
# sed 가 조용히 실패하지 않았는지 확인 (파일 구조가 바뀌면 여기서 잡힘)
if ! grep -q "const VERSION = '$VERSION'" website/src/components/Download.tsx; then
  echo "❌ website Download.tsx 버전 갱신 실패 — VERSION 상수를 찾지 못했습니다"
  exit 1
fi

# 공증 자격증명 확인 (없으면 서명은 되어도 공증이 빠져 Gatekeeper 경고가 남음)
if [[ -z "${APPLE_ID:-}" || -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" || -z "${APPLE_TEAM_ID:-}" ]]; then
  echo "⚠️  .env.release 의 공증 자격증명(APPLE_ID/APPLE_APP_SPECIFIC_PASSWORD/APPLE_TEAM_ID)이 비어 있습니다."
  echo "    이대로 빌드하면 맥 공증이 생략됩니다. (.env.release.example 참고)"
  read -r -p "계속할까요? (y/N) " ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || exit 1
fi

echo "🥕 [2/5] macOS 빌드 (dmg + zip, 서명·공증 포함 — 공증은 수 분 걸릴 수 있음)"
npm run electron:build:mac

echo "🥕 [3/5] Windows 빌드 (exe)"
npm run electron:build:win

# 산출물 수집: 파일 이름은 electron-builder 의 artifactName 이 정하므로
# 여기서 다시 적지 않고 버전이 들어간 결과물을 글롭으로 줍는다
shopt -s nullglob
FILES=(
  release/*"$VERSION"*.dmg
  release/*"$VERSION"*.zip
  release/*"$VERSION"*.exe
  release/*"$VERSION"*.exe.blockmap
  release/*"$VERSION"*.zip.blockmap
)
shopt -u nullglob

if [[ ${#FILES[@]} -lt 4 ]]; then
  echo "❌ 빌드 산출물이 부족합니다 (dmg/zip/exe 확인): ${FILES[*]:-없음}"
  exit 1
fi
# 자동 업데이트 메타데이터: latest.yml(Windows) / latest-mac.yml(macOS) 필수
for meta in release/latest.yml release/latest-mac.yml; do
  if [[ ! -f "$meta" ]]; then
    echo "❌ $meta 이 없습니다 (자동 업데이트 필수 파일)"
    exit 1
  fi
done
FILES+=(release/latest.yml release/latest-mac.yml)

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
