#!/bin/sh
# Pages 프로젝트가 있는지 확인하고, 없으면 ALLOW_CREATE=true(master production 배포)일 때만 만든다.
# develop·PR 경로는 deploy-target.mjs 가 allowProjectCreation=false 를 주므로 절대 만들지 않고 실패한다.
#   PROJECT=wedding-challenger ALLOW_CREATE=true sh scripts/ensure-pages-project.sh
# WRANGLER 로 명령을 바꿀 수 있다(테스트용 가짜 명령). 기본은 npx wrangler@4.
set -u

WRANGLER=${WRANGLER:-npx --yes wrangler@4}
PROJECT=${PROJECT:-}
ALLOW_CREATE=${ALLOW_CREATE:-false}

if ! printf '%s' "$PROJECT" | grep -Eq '^[a-z0-9][a-z0-9-]*$'; then
  echo "Pages 프로젝트 이름 형식 오류: '$PROJECT'" >&2
  exit 1
fi

if ! list=$($WRANGLER pages project list); then
  echo "Pages 프로젝트 목록 조회 실패" >&2
  exit 1
fi

# 표의 이름 칸과 정확히 일치해야 한다 (wedding-challenger-dev·wedding-challenger.pages.dev 는 불일치)
if printf '%s\n' "$list" | grep -Eq "(^|[^a-z0-9.-])${PROJECT}([^a-z0-9.-]|\$)"; then
  echo "Pages project '$PROJECT' exists"
  exit 0
fi

if [ "$ALLOW_CREATE" != "true" ]; then
  echo "Pages 프로젝트 '$PROJECT' 가 없다. 이 경로(allowProjectCreation=$ALLOW_CREATE)는 만들지 않는다" >&2
  exit 1
fi

$WRANGLER pages project create "$PROJECT" --production-branch=master
