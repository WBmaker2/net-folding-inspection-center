# Education Web App Redesign Report

## 결과 요약

초등 5~6학년 학습자가 첫 화면에서 “무엇을 배우고 다음에 무엇을 할지”를 먼저
파악하도록 `전개도 포장 검수소`를 리디자인했습니다. 기존 정육면체 판정·학습 상태·
미션 콘텐츠·2D 대체 보기·sessionStorage 선택 저장·개인정보 및 외부 네트워크 금지
경계는 그대로 유지했습니다.

학습 흐름은 다음처럼 유지됩니다.

```text
미션 선택 → 예측(기준면·윗면·순서·방향) → 한 면씩 접기 → 진단 → 수리 → 근거 문장 → 완료
```

이번 승인으로 커밋·푸시·GitHub Pages 배포를 완료했습니다. PR [#1](https://github.com/WBmaker2/net-folding-inspection-center/pull/1)이
`b49aaa3d5db7a144cf040b92fade2b9dcb35313c`로 `main`에 병합되었고, Pages workflow
[33292372449](https://github.com/WBmaker2/net-folding-inspection-center/actions/runs/33292372449)의
build/deploy job이 성공했습니다. HVC 등록은 수행하지 않았습니다. 배포 주소:
[https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/)

## 설계 요구사항 연결

| 요구사항 | 구현 및 근거 |
|---|---|
| 학습 목표 | `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/screens/IntakeScreen.tsx`의 `mission-hero`, `learning-outcomes`에 `예측하기`, `한 면씩 접기`, `근거로 설명하기`를 배치했습니다. |
| 기존 앱과 차별성 | `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/components/common/StageProgress.tsx`의 단계 텍스트·진행 선과 미션별 난이도/완료 상태로 이 앱의 “검수” 흐름을 드러냅니다. |
| 핵심 흐름 | `App`/`useLearningController`/reducer와 기존 callback을 변경하지 않고 `AppShell`, `PredictionScreen`, `FoldingScreen`의 표현 계층만 확장했습니다. |
| 콘텐츠·판정 모델 | `src/domain/net/**`, `src/domain/learning/**`, 미션 JSON, 허용 어휘, 성취 판정을 수정하지 않았습니다. 예측 단계 `data-step-state`는 표현용입니다. |
| 접근성 | skip link, heading focus, `aria-label="학습 진행"`, `접기 조작` 그룹, 키보드 도움말, `focus-visible`, 44px 입력 높이, reduced-motion, forced-colors를 유지·강화했습니다. VoiceOver는 범위에서 제외했습니다. |
| 개인정보·안전 | 학생 이름·학번·이메일·파일·자유 입력을 추가하지 않았습니다. 모델 한계 문장을 접수·접기 화면에 유지하고, 선택 저장은 기존 sessionStorage opt-in만 사용합니다. |
| MVP 범위 | 새 runtime dependency·서버·로그인·음성·자동 회전·점수·순위·이미지 생성을 추가하지 않았습니다. |
| 완료 기준 | 1440/768/375/320px, 키보드, 200% 확대, reduced-motion, forced-colors, axe, 외부 origin, 전체 학습 흐름을 자동화했습니다. 보정 전 고립 실행은 21/21 통과했고, 최신 대비 보정 후 재실행은 macOS Chromium 시작 권한 오류로 차단되어 단위·정적 게이트와 별도 기록했습니다. |

## 구현된 변경

### 화면과 컴포넌트

- `src/components/common/StageProgress.tsx`
  - `StageProgressProps { current, total, label }`을 읽기 전용으로 받고 텍스트와 장식용
    진행 선을 렌더링합니다.
  - 진행 선은 `aria-hidden`이며 잘못된 입력은 0%로 제한합니다.
- `src/app/AppShell.tsx`
  - `본문으로 바로가기`, 서비스 설명, 단계 진행, 미션 재선택, 저장 안내, 업데이트 내역을
    논리적인 header/footer 묶음으로 정리했습니다.
- `src/components/common/PrimaryAction.tsx`
  - 모든 공통 핵심 버튼에 `primary-action` 클래스를 제공하고 기존
    `criticalActionId` 조건에서만 `gi-pulse`를 붙입니다.
- `src/screens/IntakeScreen.tsx`
  - 학습 목적 hero, 3가지 결과, 검수 단계 설명, 미션 수, 기본/도전, 새 미션/완료 상태,
    카드별 한 개 CTA를 추가했습니다.
- `src/screens/PredictionScreen.tsx`
  - 기준면·윗면·접는 순서·접는 방향 4단계 개요와 키보드 조작 도움말을 추가했습니다.
  - 선택 값과 제출 payload는 기존과 같습니다.
- `src/screens/FoldingScreen.tsx`
  - 접힌 면 수, 상태 live region, 이전/다음, range, 보기 옵션을 `접기 조작` 카드로
    묶었습니다.
- `src/screens/DiagnosisScreen.tsx`, `src/screens/RepairScreen.tsx`,
  `src/screens/EvidenceScreen.tsx`, `src/screens/CompletionScreen.tsx`
  - 기존 semantic section과 판정 callback은 유지하고 공통 surface·상태·primary action
    스타일을 적용했습니다.
- `src/App.tsx`, `src/screens/RepairScreen.tsx`, `src/screens/IntakeScreen.tsx`
  - 미션 종류별 실제 학습 경로(5·6·7단계)를 진행 표시와 연결했습니다.
  - 수리 미리보기에서 내부 좌표·face ID 대신 `옮길 면`, 방향, 학습자용 면 번호를
    보여 줍니다.
  - 첫 미션 바로가기 앵커와 추천 카드 표면을 추가하되 첫 CTA 하나의 `gi-pulse`만
    유지했습니다.
- `src/components/net3d/sceneColors.ts`, `src/components/net3d/FoldScene.tsx`,
  `src/styles/tokens.css`
  - WebGL 팔레트를 명명된 모듈로 모으고 상태·뷰어 배경 토큰을 추가했습니다.
  - 상태 카드의 굵은 왼쪽 테두리는 전체 1px 테두리와 위쪽/inset 강조로 바꿨습니다.
  - 장식용 CSS 그라디언트를 제거하고 solid light-mode 표면으로 통일했습니다.

### 스타일과 기록

- `src/styles/tokens.css`, `base.css`, `layout.css`, `components.css`, `net2d.css`,
  `diagnosis.css`, `repair.css`, `evidence.css`, `motion.css`
  - 라이트 종이 배경, 잉크/청록 대비, 카드 표면, 44px 조작 영역, 320px 최소 폭,
    모바일 단일 열, 768px 학습판 2열, 200% 확대 줄바꿈을 토큰으로 통일했습니다.
  - 접기 조작은 520px 이하에서 2열 grid로 재배치해 375px·200%에서 버튼이 화면 밖으로
    밀리지 않게 했습니다.
  - 수리 상태 카드의 전경을 `--accent-strong`으로 분리해 `--accent-soft` 배경 대비를
    5.59:1로 맞췄습니다.
- `src/content/changelog.ts`
  - `2026-08-29` 리디자인 기록과 `2026-08-30` 진행 경로·수리 표현 보정 기록을
    추가했습니다.
- `playwright.config.ts`, `e2e/helpers/keyboard-flow.ts`,
  `e2e/privacy-safety.spec.ts`
  - `PLAYWRIGHT_PORT`, `PLAYWRIGHT_BASE_URL`, Vite `--strictPort`를 지원해 다른 프로젝트
    서버를 조용히 재사용하지 않게 했습니다. 개인정보 origin 검사는 실제 실행 origin을
    사용합니다.

### 문서와 자산

- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/work/education-webapp-redesign-plan.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/work/education-webapp-redesign-audit.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/work/education-webapp-redesign-assets.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/design-system/MASTER.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/docs/qa/manual-accessibility-checklist.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/docs/qa/release-evidence.md`

자산은 `public/favicon.svg`, inline SVG 면 기호, Three.js 기하 mesh만 존재합니다.
학습 정보를 담은 자산을 자동 교체하지 않았고 `imagegen`은 실행하지 않았습니다.

## TDD 및 품질 검증

### UI 계약 TDD

1. 실패 확인: 새 `StageProgress`, intake hero/CTA 계약과 미션별 진행·수리 표현 회귀
   assertions를 구현 전 실행해 모듈·클래스·문구
   부재 실패를 확인했습니다.
2. 최소 구현: `StageProgress`, shell/intake markup, `primary-action`, 예측 개요, 접기 그룹을
   추가했습니다.
3. 회귀 실패 확인: 예측·접기 개요 테스트가 먼저 `예측 단계 안내`와 `접기 조작` 부재로
   실패했습니다.
4. 통과 구현: 두 화면의 semantic markup과 반응형 CSS를 추가했습니다.
5. 통과 재검증: 관련 6개 파일 38개 테스트, 예측·접기 26개 테스트가 통과했습니다.
6. 업데이트 내역 기록 추가 후 고정 길이·최신 날짜 assertion을 13개 기록에 맞게
   갱신했습니다.

### 최종 명령 결과

실행 조건:

```bash
PLAYWRIGHT_PORT=4176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4176 CI=1 npm run verify
```

| 검사 | 결과 |
|---|---|
| `npm run lint` | PASS — 오류·경고 없음 |
| `npm run typecheck` | PASS |
| `npm test -- --run` | PASS — 31 files, 262 tests (오프라인 경계 테스트의 의도된 악성 fixture 오류 출력은 테스트 내부에서 검증) |
| `npm run test:e2e` | BLOCKED — 최신 대비 보정 후 관리형 macOS Chromium이 모든 케이스에서 `MachPortRendezvous ... Permission denied`로 page 생성 전에 종료됨. 보정 전 동일 고립 실행은 21/21 통과 |
| `npm run check:file-size` | PASS — 작성 파일 모두 500줄 미만 |
| `npm run check:offline-boundary` | PASS — `src`에 외부 client/URL 없음 |
| `npm run build` | PASS — Vite build 완료, 기존 Three.js chunk advisory만 출력 |

### 브라우저 및 접근성 결과

| 폭/조건 | 결과 |
|---|---|
| 1440×900 | 초기 미션 hero·카드 2열, 문서 overflow 0, 콘솔 오류 0 |
| 768×900 | hero/미션 2열, 문서 overflow 0, 첫 미션 선택 후 `prediction-title` focus |
| 375×812 | 카드 단일 열, 문서 overflow 0, 콘솔 오류 0 |
| 320×800 | 최소 폭에서 카드·CTA 유지, 문서 overflow 0, 콘솔 오류 0 |
| 375×812 + root font 200% | 접기 primary/range가 조작 카드 안에서 줄바꿈, document `scrollWidth=375`, `clientWidth=375` |
| 키보드 전용 | skip link, Tab/Shift+Tab, NetGrid 방향키, Enter/Space, Escape, live region 통과 |
| reduced-motion | pulse `animation-name: none`, 정적 3px outline, 접기 단계 즉시 전환 |
| forced-colors | 보정 전 고립 실행에서 번호·무늬·accessible name·Highlight outline 유지, 심각 axe 위반 0; 최신 보정 후 재실행은 Chromium 권한 오류로 차단 |
| 개인정보·안전 | 외부 origin 0, 개인 필드 0, sessionStorage opt-in/opt-out 경계 통과 |

브라우저 실행 중 `THREE.Clock` deprecation warning 1건은 기존 React Three Fiber 의존성
경고이며 콘솔 error가 아닙니다. 한 번의 비격리 E2E 실행은 4173 포트에 남은 다른 앱
서버를 잘못 재사용했으므로 제품 증거로 사용하지 않았습니다. `strictPort`와 4176
격리 실행에서 보정 전 21개 전체가 통과했으며, 이번 대비 보정 후 재실행은 관리형
macOS Chromium의 `MachPortRendezvous` 권한 오류로 브라우저 시작 전에 차단되었습니다.
정적 대비 계산은 `#0f6685` on `#def3f4` = `5.59:1`로 확인했습니다.

## 범위와 남은 승인

- `impeccable`, `ui-ux-pro-max`, `redesign-existing-projects` 지원 역할을 확인하고,
  각각의 스캔·진단·타깃 보정 지침과 독립 `impeccable` 코드 감사를 반영했습니다.
  `imagegen`은 자산 안전성 검토 결과 실행하지 않았습니다.
- 인간 초등학생·교사 사용자의 실제 관찰, Safari 수동 확인, VoiceOver + Safari 검증은
  수행하지 않았습니다. 이는 자동화 PASS와 별도의 수동 승인 단계입니다.
- 커밋·푸시·배포는 완료했습니다. HVC 등록은 별도 승인 범위가 아니어서 수행하지
  않았습니다.
- 기존 `output/` 디렉터리는 사용자 작업으로 보고 수정·삭제하지 않았습니다.

## 2026-08-30 독립 점검 후속 구현

프로젝트 규칙과 기존 계획을 다시 확인한 뒤 `impeccable`, `ui-ux-pro-max`,
`redesign-existing-projects` 지침을 적용했습니다. 독립 점검에서 나온 우선순위 항목은
다음처럼 보정했습니다.

- 미션 종류에 따라 `StageProgress`가 5·6·7단계 경로를 보여 주도록 `STAGE_PATHS`와
  `MissionKind` 타입을 연결했습니다. tracking `2 / 6`, opposite `2 / 5`,
  collision/repair `2 / 7`을 컴포넌트 테스트로 확인합니다.
- 수리 미리보기의 내부 좌표·face ID 문구를 제거하고 `옮길 면`, `옮길 곳`,
  `오른쪽 빈 칸`, `6번 면`처럼 초등 학습자가 읽을 수 있는 표현으로 바꿨습니다.
- 긴 미션 목록 위에 `첫 미션부터 시작하기` 앵커를 두고 첫 카드만 `.is-featured`로
  표시했습니다. 핵심 선택 버튼 하나의 `gi-pulse` 규칙은 그대로입니다.
- 상태 색상 토큰(`--success-soft`, `--error-soft`, `--viewer-surface`)과 WebGL 전용
  `src/components/net3d/sceneColors.ts`를 추가하고, 두꺼운 왼쪽 색 테두리를 위쪽/inset
  강조로 바꿨습니다. Three.js DPR은 실측 없이 변경하지 않았습니다.

### 후속 검증 결과

| 명령 | 결과 |
|---|---|
| `npm run lint` | PASS — 오류·경고 없음 |
| `npm run typecheck` | PASS |
| `npm test -- --run` | PASS — 31 files, 262 tests |
| `npm run check:file-size` | PASS — authored files under 500 lines |
| `npm run check:offline-boundary` | PASS — `src` 외부 client/URL 없음 |
| `npm run build` | PASS — Vite build 완료, 기존 Three.js chunk advisory만 출력 |
| `git diff --check`·자리표시자 검색 | PASS — 공백 오류와 지정 자리표시자 없음 |
| `impeccable` detector 1회 | PASS after fix — 진행 막대의 width transition 경고를 `transform: scaleX`로 교체 |
| 최신 Playwright·axe | BLOCKED — 관리형 macOS Chromium이 반복적으로 page 생성 전 `MachPortRendezvous ... Permission denied`로 종료되어 재시도하지 않음 |

Vitest 출력에 보인 오프라인 경계 fixture의 외부 client·symbolic link 오류는 악성 입력을
거부하는 하위 테스트의 의도된 출력이며 전체 테스트는 통과했습니다. 브라우저·axe는
보정 전 격리 실행 21/21을 역사적 증거로만 유지하며, 이번 보정 후 PASS로 간주하지
않습니다. VoiceOver와 Safari 수동 검증, 초등학생·교사 human sign-off도 수행하지
않았습니다.

## 자체 검토

- 설계 문서의 학습 목표, 차별성, 흐름, 콘텐츠·판정, 접근성, 개인정보·안전, MVP,
  완료 기준을 위 표와 실제 파일에 연결했습니다.
- `rg` 기반으로 미확정 토큰이나 자리표시자 문구가 계획·보고 문서에 남지 않았는지 확인했습니다.
- `StageProgressProps`, `PredictionScreenProps`, `FoldingScreenProps`,
  `PrimaryActionProps` 명명과 기존 `LearningAction`/submission 타입을 일관되게 유지했습니다.
- `src/styles/components.css` 467줄, `src/styles/net2d.css` 421줄 등 직접 작성 파일은
  500줄 미만입니다. 진단 스타일은 `src/styles/diagnosis.css`로 분리했습니다.
