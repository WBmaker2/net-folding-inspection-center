# Task 16 릴리스 증거

실행일: 2026-08-27 (KST)

환경: macOS 26.5.2 (25F84), Darwin 25.5.0, Apple arm64, Node v25.6.1,
npm 11.9.0

브라우저: Google Chrome for Testing 151.0.7922.34

Playwright: 1.62.1

확인 명령: `.../chrome-headless-shell --version` → Google Chrome for Testing
151.0.7922.34, `npx playwright --version` → Version 1.62.1, `node --version` →
v25.6.1, `npm --version` → 11.9.0, `sw_vers` → macOS 26.5.2 (25F84).

모든 browser 실행은 `--workers=1`로 수행했습니다. 관리형 macOS sandbox에서는
병렬 여부와 관계없이, `workers=1`인 실행도 page 생성 전에 Chromium MachPort
권한 오류로 차단되었습니다. 이는 병렬 실행에만 해당하는 실패가 아닙니다. 관리형
sandbox 밖의 승인된 escalated standalone 실행에서는 focused/full E2E와 최종 verify가
통과했으며, 실행 환경 차단과 앱 assertion 실패를 구분합니다.

## 명령별 최신 결과

| 시각 (KST) | 명령 | 결과 |
|---|---|---|
| 02:46:55–02:47:01 | `npx playwright test e2e/responsive.spec.ts --workers=1` | PASS — 3/3 |
| 02:51:23–02:51:50 | `npm run test:e2e` (verify 내부) | PASS — 20/20, 단일 worker |
| 02:51:16–02:51:21 | `npm test -- --run` (verify 내부) | PASS — 29 files, 235 tests |
| 02:51:10 | `npm run lint` 및 `npm run typecheck` (verify 내부) | PASS |
| 02:51:50 | `npm run check:file-size` 및 `npm run check:offline-boundary` (verify 내부) | PASS |
| 02:51:50–02:51:51 | `npm run build` (verify 내부) | PASS — Three.js chunk advisory만 출력 |
| 02:51:10–02:51:51 | `npm run verify` (관리형 sandbox 밖, escalated) | PASS — lint/type/unit 235 tests/E2E 20/20/file-size/offline/build 모두 통과 |
| 약 02:56 | reviewer `npm run verify` (관리형 sandbox, `workers=1`) | BLOCKED — lint/type/unit은 통과했으나 모든 browser case가 page 생성 전 MachPort 권한 오류로 차단됨. `workers=1`에서도 발생했으며 병렬 전용 실패가 아님 |
| 03:07:02–03:07:18 | reviewer 후 재검증 `npm run verify` (관리형 sandbox, `workers=1`) | BLOCKED — lint/type/unit은 통과했으나 20개 browser launch가 page 생성 전 MachPort 권한 오류로 차단됨 |
| 03:09:33–03:09:47 | `npx playwright test e2e/responsive.spec.ts e2e/accessibility.spec.ts --workers=1` (관리형 sandbox 밖, escalated) | PASS — 9/9 |
| 03:09:50–03:10:17 | `npm run test:e2e` (관리형 sandbox 밖, escalated) | PASS — 20/20 |
| 03:10:25–03:10:31 | `npm test -- --run` | PASS — 29 files, 238 tests |
| 03:11:07–03:11:50 | 최종 `npm run verify` (관리형 sandbox 밖, escalated) | PASS — lint/type/unit 238 tests/E2E 20/20/file-size/offline/build 모두 통과 |
| 03:37:58–03:38:06 | `npm test -- --run` | PASS — 29 files, 246 tests |
| 03:40:24–03:40:33 | `npx playwright test e2e/learner-flow.spec.ts --workers=1` | PASS — 5/5 (불가능 순서 복귀·수정 재제출 회귀 포함) |
| 03:40:38–03:41:06 | `npm run test:e2e` | PASS — 21/21, 단일 worker |
| 03:41–03:42 | 최종 `npm run verify` (관리형 sandbox 밖, escalated) | PASS — lint/type/unit 246 tests/E2E 21/21/file-size/offline/build 모두 통과 |

## 2026-08-28 개선 wave 로컬 검증

이번 개선은 아직 커밋·푸시·배포하지 않은 작업 트리에서 확인했습니다. 기존 공개
Pages 주소는 이전 배포 증거로만 남아 있으며, 아래 결과가 공개 사이트에 반영되었다고
해석하지 않습니다.

| 명령 | 결과 |
|---|---|
| `npm run lint` | PASS — 오류·경고 없음 |
| `npm run typecheck` | PASS |
| `npm test -- --run` | PASS — 29 files, 254 tests |
| `npm run check:file-size` | PASS — authored files under 500 lines |
| `npm run check:offline-boundary` | PASS — `src` 외부 클라이언트·URL 없음 |
| `npm run build` | PASS — Vite build 완료, Three.js chunk advisory만 출력 |
| `npm run test:e2e` | PASS — 21/21, 단일 worker |

추가로 375px, 200% 글자 크기, reduced-motion, forced-colors, WebGL 비활성,
키보드 전용 흐름과 단계 제목 포커스를 Playwright·axe로 확인했습니다. VoiceOver 구현·검증은
새 사용자 지침에 따라 범위에서 제외했습니다.

이번 wave의 완료 비교표는 375px에서 고정 최소 폭을 사용하지 않고 칸 안에서
줄바꿈합니다. 2026-08-27 기록의 “가로 스크롤로 마지막 열에 도달” 문장은 당시
구현의 역사적 결과이며, 현재 작업 트리의 새 결과는 가로 스크롤 없이 읽히는 것입니다.

## 고정 환경 결과

- 375×812: PASS. 가로 overflow가 없고 현재 action box가 viewport와 교차합니다. ([responsive-375.png](evidence/responsive-375.png))
- 375×812 + 루트 글자 크기 200%: PASS. 긴 완료 표를 실제로 가로 스크롤해 마지막 열에 도달했고, action·update trigger와 footer 콘텐츠의 비겹침 및 dialog viewport 내부 배치를 확인했습니다. ([responsive-375-200-root-font.png](evidence/responsive-375-200-root-font.png))
- 데스크톱 + 루트 글자 크기 200%: PASS. 긴 표, storage label/helper, footer 문장과 trigger의 비겹침을 확인했습니다. ([responsive-200-root-font.png](evidence/responsive-200-root-font.png))
- `prefers-reduced-motion: reduce`: PASS. pulse pseudo-element가 존재하고 computed `animation-name: none`, persistent `3px` outline입니다. ([reduced-motion.png](evidence/reduced-motion.png))
- forced-colors: PASS (자동 Chromium + axe). 번호·무늬·accessible label을 확인했습니다. ([forced-colors.png](evidence/forced-colors.png))
- WebGL 비활성: PASS. 앱 부팅 전 context를 차단하고 Canvas 0개, 정확한 fallback·관계 표로 네 mission을 완료했습니다. ([webgl-disabled.png](evidence/webgl-disabled.png))
- 키보드 전용: PASS (자동 Playwright). Tab/Shift+Tab, NetGrid 화살표, Space/Enter, Escape와 live-region을 확인했습니다. ([keyboard-complete.png](evidence/keyboard-complete.png))

## 증거 파일

- [responsive-375.png](evidence/responsive-375.png)
- [responsive-375-200-root-font.png](evidence/responsive-375-200-root-font.png)
- [responsive-200-root-font.png](evidence/responsive-200-root-font.png)
- [keyboard-complete.png](evidence/keyboard-complete.png)
- [reduced-motion.png](evidence/reduced-motion.png)
- [forced-colors.png](evidence/forced-colors.png)
- [webgl-disabled.png](evidence/webgl-disabled.png)

## VoiceOver 범위 제외

macOS VoiceOver + Safari: **범위 제외**. 학생용 VoiceOver·음성 안내를 구현하지 않으며,
VoiceOver 수동 보조기술 검증도 수행하지 않습니다. 키보드·axe·접근성 트리 자동화 결과만
현재 릴리스 범위의 접근성 증거로 사용합니다.

## 공개 배포 확인

- 원격 저장소: [WBmaker2/net-folding-inspection-center](https://github.com/WBmaker2/net-folding-inspection-center)
- GitHub Pages: [https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/)
- 최종 개선 wave 검증 workflow run: [33146726323](https://github.com/WBmaker2/net-folding-inspection-center/actions/runs/33146726323) — `5917daf` 기준 build/deploy job 모두 성공
- 공개 루트와 [favicon.svg](https://wbmaker2.github.io/net-folding-inspection-center/favicon.svg): HTTP 200
- 공개 HTML의 문서 제목은 `전개도 포장 검수소`이며 Vite asset 경로는 `/net-folding-inspection-center/` base를 사용합니다.
- 공개 learner path: 검수 접수 → 면 위치 추적 미션 → 기준면·예상 윗면·접는 순서·방향 입력 → 한 면씩 접기 → 접힌 결과 진단하기까지 완료했습니다.
- 최종 공개 브라우저 확인에서 console error는 0건입니다. `THREE.Clock` deprecation warning 1건은 `@react-three/fiber` 의존 경고로 기능 실패가 아닙니다.
- 당시 공개 업데이트 내역 dialog에는 2026-08-28 개선·VoiceOver 범위 제외 기록을 포함한 11개 항목이 표시되었습니다.

## 교육적 모형 한계

이 앱은 면 인접·접힘 순서·법선·맞은편·겹침·빈 방향을 보여 주는 결정적 기하
모형입니다. 종이 두께·휘어짐·접착 탭·재료 강도·제조 품질·실제 포장 안전성을
측정하거나 보장하지 않습니다. 실제 종이 활동과 함께 사용해야 합니다.

## 범위 경계

원격 저장소 생성, push, GitHub Pages 공개와 workflow 배포를 수행했습니다. HVC
서비스 등록은 이번 요청 범위에 포함하지 않아 수행하지 않았습니다. 최종 수정 wave에서
불가능한 접기 순서의 복귀·재제출과 중첩 symbolic link fail-closed 경계를 추가했고,
Pages-safe favicon을 배포했습니다. VoiceOver + Safari 구현·검증은 사용자 지침에 따라
범위에서 제외했습니다.

## 2026-08-29 교육 웹앱 리디자인 로컬 검증 (배포 전 기록)

이번 리디자인은 현재 작업 트리에서만 구현·검증했으며 커밋·푸시·배포하지 않았습니다.
기존 공개 Pages URL은 아래 작업의 결과를 포함한다고 주장하지 않습니다.

### 변경 요약

- `AppShell`에 본문 건너뛰기 링크, 브랜드 설명, 접근 가능한 `StageProgress`, 미션 재선택
  버튼을 배치했습니다.
- `IntakeScreen`에 학습 결과 3가지, 단계·난이도·완료 상태, 명확한 미션 CTA를 추가했습니다.
- `PredictionScreen`에 기준면·윗면·접는 순서·방향 4단계 개요와 키보드 도움말을 추가했습니다.
- `FoldingScreen`의 상태·range·이전/다음·보기 옵션을 `접기 조작` 카드로 묶고 375px·200%
  확대용 grid를 추가했습니다.
- 진단·수리·근거·완료 표면, primary action, 성공/오류 상태를 토큰으로 통일했습니다.
- 2026-08-29 업데이트 내역을 기록했고, Playwright 포트 주입·`--strictPort`로 다른 앱
  서버 재사용을 fail-fast로 바꿨습니다.

### 명령별 결과

| 명령 | 결과 |
|---|---|
| `PLAYWRIGHT_PORT=4176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4176 CI=1 npm run verify` | PASS — lint, typecheck, Vitest 31 files/260 tests, Playwright E2E 21/21, file-size, offline-boundary, Vite build |
| `node /tmp/net-folding-redesign-audit.cjs` | PASS — 1440×900, 375×812, 320×800; 각 폭 overflow 0·콘솔 오류 0·미션 선택 후 `prediction-title` focus |
| `node /tmp/net-folding-redesign-full.cjs` | PASS — 예측→접기→진단→수리→근거→완료 heading 및 1280px 캡처 확인 |
| `node /tmp/net-folding-overflow.cjs` | PASS — 375px·200% 접기 단계 document `scrollWidth=375`, `clientWidth=375` |

Vitest 전체 결과는 31개 파일·260개 테스트 통과입니다. Playwright는 accessibility,
learner-flow, privacy-safety, responsive를 포함해 21개가 통과했고, reduced-motion·forced-
colors·axe 심각 위반 0·외부 origin 0을 확인했습니다. 빌드 출력에는 기존 Three.js
chunk advisory만 있습니다.

초기 `npm run verify` 한 번은 4173 포트의 다른 프로젝트 서버를 재사용해 잘못된 앱의
브라우저 assertion을 냈습니다. 해당 결과는 릴리스 증거에서 제외하고, 설정에
`PLAYWRIGHT_PORT`, `PLAYWRIGHT_BASE_URL`, Vite `--strictPort`를 반영한 뒤 4176에서
재실행했습니다. 다른 프로젝트 서버는 종료·변경하지 않았습니다.

### 2026-08-29 당시 릴리스 상태

- 커밋·푸시·배포: **수행하지 않음**
- HVC 등록: **수행하지 않음**
- 기존 공개 URL: [https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/) — 리디자인 전 배포본
- 다음 승인 단계: 실제 초등학생·교사 수동 사용성 관찰과 배포 승인 후 별도 release gate
- VoiceOver + Safari: **범위 제외**

### 2026-08-29 대비 보정 후 재검증

- 수리 상태 카드 전경색을 `#147da1`에서 `#0f6685`(`--accent-strong`)로 바꾸고
  `#def3f4`(`--accent-soft`) 배경 대비를 정적 계산 `5.59:1`로 확인했습니다.
- `npm run lint`, `npm run typecheck`, `npm test -- --run`(31 files/260 tests),
  `npm run check:file-size`, `npm run check:offline-boundary`, `npm run build`는 모두
  통과했습니다.
- 동일한 `PLAYWRIGHT_PORT=4176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4176 CI=1 npm run verify`
  재실행은 관리형 macOS Chromium이 모든 브라우저 케이스에서 page 생성 전
  `MachPortRendezvous ... Permission denied`로 종료되어 **BLOCKED**입니다. 보정 전
  고립 실행의 E2E 21/21 결과와 구분하며, 최신 axe 결과를 통과로 표시하지 않습니다.
- 브라우저 권한이 가능한 별도 실행 환경에서 `npm run test:e2e`를 다시 실행한 뒤
  배포 release gate를 열 수 있습니다. 이 작업에서는 커밋·푸시·배포·HVC 등록을
  수행하지 않았습니다.

### 2026-08-30 학습자 표현·진행 경로 보정 (배포 전 기록)

이 보정은 커밋·푸시·배포 전에 현재 작업 트리에 적용했습니다. 미션
종류별 단계 수를 진행 표시와 연결하고, 수리 미리보기에서 내부 좌표·ID를 제거했으며,
첫 미션 바로가기·추천 카드와 SVG 장식을 추가했습니다. 판정·저장·오프라인 경계는
변경하지 않았습니다. 장식용 CSS 그라디언트는 solid light-mode 토큰으로 교체했습니다.

| 검사 | 결과 |
|---|---|
| `npm run lint` | PASS — 오류·경고 없음 |
| `npm run typecheck` | PASS |
| `npm test -- --run` | PASS — 31 files, 262 tests |
| `npm run check:file-size` | PASS — authored files under 500 lines |
| `npm run check:offline-boundary` | PASS — `src` 외부 client/URL 없음 |
| `npm run build` | PASS — Vite build 완료, Three.js chunk advisory만 출력 |
| 최신 `npm run test:e2e` | BLOCKED — 반복된 관리형 macOS Chromium `MachPortRendezvous ... Permission denied`가 page 생성 전에 발생하여 재실행하지 않음 |

`npm test` 출력에 포함된 오프라인 경계 fixture의 symbolic link·외부 client 오류는
악성 입력을 거부하는 하위 테스트가 의도적으로 출력한 내용이며 전체 테스트는 통과했습니다.
브라우저·axe 결과는 보정 전 격리 실행 21/21을 역사적 증거로만 유지하고, 이번 보정 후
결과로 표시하지 않습니다.

## 2026-08-30 최종 Pages 배포

리디자인 릴리스 브랜치의 네 개 커밋을 PR [#1](https://github.com/WBmaker2/net-folding-inspection-center/pull/1)로
`main`에 병합했습니다. 최종 병합 커밋은
`b49aaa3d5db7a144cf040b92fade2b9dcb35313c`이며, GitHub Actions
[33292372449](https://github.com/WBmaker2/net-folding-inspection-center/actions/runs/33292372449)의
`build`와 `deploy` job이 모두 성공했습니다.

- 공개 Pages: [https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/)
- 공개 HTML: HTTP 200, 제목 `전개도 포장 검수소`, `/net-folding-inspection-center/assets/` 경로 확인
- 배포된 JS/CSS/favicon: 각각 HTTP 200, `첫 미션부터 시작하기`, `stage-progress-fill`,
  `--viewer-surface` marker 확인
- 현재 작업 트리: `output/`만 사용자 산출물로 남아 있으며 커밋하지 않았습니다.
- HVC 등록: 별도 승인 범위가 아니어서 수행하지 않았습니다.

로컬 Playwright/axe는 관리형 macOS Chromium이 page 생성 전에
`MachPortRendezvous ... Permission denied`로 종료되어 최신 변경의 자동 브라우저 PASS를
주장하지 않습니다. 보정 전 격리 실행의 21/21 결과는 역사적 증거로 남겼습니다.

## 2026-08-30 초등 학습자 UX 개선 배포

초등학생 관점의 전체 UX 점검 결과를 구현한 커밋 `de53d0f`를 `main`에 푸시했습니다.
GitHub Actions [33311820565](https://github.com/WBmaker2/net-folding-inspection-center/actions/runs/33311820565)의
`build`와 `deploy` job이 모두 성공했습니다.

- 공개 Pages: [https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/)
- 공개 HTML: HTTP 200, 제목 `전개도 포장 검수소`
- 공개 자산: 새 JS/CSS/favicon 모두 HTTP 200
- 공개 산출물 확인: `기준면과 다른 면을 윗면으로 골라 주세요.`, `모바일 단계 게이트`,
  `접기 결과 비교` 문구가 배포 JS에 포함됨
- 로컬 검증: Vitest 32 files/265 tests, lint, typecheck, build, file-size,
  offline-boundary 통과
- in-app 브라우저: 320×800·375×812·1280×720 가로 넘침 없음, console error 0건
- 정식 로컬 Playwright CLI: `chrome-headless-shell` 누락으로 실행하지 않음
- HVC 등록: 실행하지 않음

## 2026-08-30 단어·문장 표현 및 시뮬레이션 2단계 배포

이번 릴리스는 단어·문장 표현과 접기 시뮬레이션 2단계만 다뤘습니다. PR
[#2](https://github.com/WBmaker2/net-folding-inspection-center/pull/2)의 두 커밋을
`main`에 병합했고, 병합 커밋은 `b1af7e556693ff8c09bb0d4a3af35c422b89bd63c`입니다.

| 항목 | 결과 |
|---|---|
| 애플리케이션 단위 테스트 | PASS — 32개 파일, 267개 테스트 |
| lint / typecheck / build | PASS — Vite build 완료, Three.js chunk advisory만 출력 |
| file-size / offline-boundary | PASS |
| Playwright CLI E2E | BLOCKED — 호스트에 Chromium 실행 파일이 없어 browser launch 단계에서 중단; 설치하지 않음 |
| GitHub Pages workflow | PASS — [33315502932](https://github.com/WBmaker2/net-folding-inspection-center/actions/runs/33315502932)의 build/deploy job 성공 |
| 공개 루트 | PASS — [https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/) HTTP 200 |

공개 HTML 제목은 `전개도 포장 검수소`이며, `/net-folding-inspection-center/assets/`
base 경로의 JS 자산과 `favicon.svg`가 HTTP 200입니다. 공개 JS 번들에서
`처음부터 다시 보기`, `정면에서 보기`, `첫 번째 낱말은 면의 관계` 문구를 확인했습니다.
in-app 브라우저에서는 320·375·1280px 가로 넘침 없음, 접기 초기화, 시점
`aria-pressed`, reduced-motion, 근거 문장 생성을 확인했습니다.

이번 릴리스에서 HVC 등록은 실행하지 않았습니다. `.playwright-cli/`,
`.playwright-mcp/`, `output/`, 대용량 후보 원본 문서는 사용자 산출물 또는 생성 원본으로
스테이징하지 않았습니다.
