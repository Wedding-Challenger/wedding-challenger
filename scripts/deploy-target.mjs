// 배포 워크플로의 이벤트·ref·Pages 프로젝트 변수 → 빌드/업로드 대상 정책. 워크플로는 이 출력만 쓴다.
//   EVENT_NAME=push REF_NAME=develop PAGES_PROJECT=wedding-challenger node scripts/deploy-target.mjs
// 출력: {mode, branch, upload, allowProjectCreation, buildModes, project} JSON 한 줄. 허용 밖 입력은 exit 1(stdout 없음).
import { pathToFileURL } from 'node:url'

// develop 업로드는 이 프로젝트일 때만 (같은 Pages 프로젝트의 develop 브랜치 배포)
export const DEVELOP_PROJECT = 'wedding-challenger'
const PROJECT_NAME = /^[a-z0-9][a-z0-9-]*$/
const DEPLOY_EVENTS = new Set(['push', 'workflow_dispatch'])

export function resolveDeployTarget({ eventName, refName, pagesProject }) {
  if (eventName === 'pull_request') {
    // PR 은 secret·프로젝트 없이 두 mode 빌드 검증만
    return { mode: null, branch: null, upload: false, allowProjectCreation: false, buildModes: ['production', 'staging'], project: null }
  }
  if (!DEPLOY_EVENTS.has(eventName)) throw new Error(`지원하지 않는 이벤트: ${eventName || '(없음)'}`)
  if (refName !== 'master' && refName !== 'develop') throw new Error(`배포 브랜치는 master·develop 만: ${refName || '(없음)'}`)
  if (!pagesProject) throw new Error('vars.CLOUDFLARE_PAGES_PROJECT 가 비어 있다')
  if (!PROJECT_NAME.test(pagesProject)) throw new Error(`Pages 프로젝트 이름 형식 오류: ${pagesProject}`)

  if (refName === 'develop') {
    if (pagesProject !== DEVELOP_PROJECT) {
      throw new Error(`develop 배포는 프로젝트 ${DEVELOP_PROJECT} 에만 한다 (현재 ${pagesProject})`)
    }
    return { mode: 'staging', branch: 'develop', upload: true, allowProjectCreation: false, buildModes: ['staging'], project: pagesProject }
  }
  return { mode: 'production', branch: 'master', upload: true, allowProjectCreation: true, buildModes: ['production'], project: pagesProject }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const target = resolveDeployTarget({
      eventName: process.env.EVENT_NAME,
      refName: process.env.REF_NAME,
      pagesProject: process.env.PAGES_PROJECT,
    })
    process.stdout.write(`${JSON.stringify(target)}\n`)
  } catch (e) {
    console.error(`deploy-target: ${e.message}`)
    process.exit(1)
  }
}
