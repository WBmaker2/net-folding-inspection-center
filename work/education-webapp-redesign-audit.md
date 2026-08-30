# Education Web App Redesign Audit

## Audit scope and evidence

- 대상: `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center`
- 점검일: 2026-08-29
- 실제 앱: `http://127.0.0.1:4173/` (Vite 개발 서버)
- 확인 폭: 1440×900, 375×812, 320×800
- 확인 경로: 검수 접수 → 첫 미션 선택 → 예측판 → 기준면/윗면/순서/방향 입력 → 한 면씩 접기 → 2단계 접기
- 브라우저 결과: 세 폭 모두 문서 가로 스크롤 없음, 콘솔 오류 없음, 미션 선택 뒤 `prediction-title`로 포커스 이동 확인
- 자동화 역할 상태: `impeccable` unavailable; 아래 내용은 코드·실제 화면·기존 테스트를 근거로 한 수동 감사이며 인간 보조공학 승인이나 VoiceOver 결과가 아님

## 학습 목표와 흐름 대조

설계 문서의 목표는 전개도의 연결 관계를 기준면·접는 순서·면 관계로 설명하는 것입니다. 현재 구현은 8개 정육면체 미션, 예측·단계별 접기·진단·수리·근거·완료 상태를 보존하고 있습니다. `src/domain/net/**`와 `src/domain/learning/**`가 판정과 상태를 담당하며, 화면 리디자인은 이 계약을 변경하지 않아야 합니다.

## Findings

### P1 — 첫 화면의 학습 목적과 다음 행동이 긴 목록에 묻힘

- 근거: `src/screens/IntakeScreen.tsx`는 두 개의 비슷한 안내 문장 뒤에 4개 그룹과 8개 카드를 바로 나열합니다. 1440px 캡처에서 상단 큰 여백 뒤에 카드가 길게 이어지고, 375px/320px에서는 미션 목록이 3,000px 이상 세로로 늘어납니다.
- 영향: 학생이 “무엇을 배우고 지금 무엇을 해야 하는지”보다 카드 제목을 먼저 읽게 됩니다. 첫 CTA가 화면 아래에 있어 초기 행동 발견이 늦습니다.
- 수정: `mission-hero`에 한 문장 목표와 `예측 → 접기 → 설명` 결과를 배치하고, 그룹에 활동 설명·미션 수·명확한 카드 CTA를 추가합니다.

### P1 — 핵심 CTA가 일반 브라우저 버튼처럼 보여 우선순위가 약함

- 근거: `PrimaryAction`은 `gi-pulse` 클래스만 계산하고 공통 `primary-action` 시각 클래스가 없습니다. 일부 화면의 버튼은 기본 회색 브라우저 스타일로 표시됩니다.
- 영향: 첫 미션 선택과 예측 제출처럼 학습을 진행시키는 버튼이 보조 버튼과 같은 무게로 보입니다.
- 수정: `PrimaryAction`에 `primary-action`을 항상 추가하고, 채움 색·hover·disabled·`focus-visible`을 공통 토큰으로 정의합니다. `gi-pulse`는 기존 critical-action 조건에만 남깁니다.

### P1 — 헤더 진행 정보가 한 줄 텍스트에 머물러 현재 위치와 남은 흐름을 빠르게 비교하기 어려움

- 근거: `src/app/AppShell.tsx`의 `stage-progress`는 `1 / 6 · 미션 고르기` 한 줄입니다. 학습 단계 이름 목록이나 진행 선은 없습니다.
- 영향: 모바일에서 제목과 진행 정보가 수직으로 분리되고, 학생이 다음에 거칠 단계를 예측하기 어렵습니다.
- 수정: `StageProgress`를 추가해 텍스트를 유지하면서 장식용 진행 선과 단계 label을 제공합니다. 접근성 이름은 텍스트를 권위로 사용합니다.

### P1 — 예측 화면의 네 입력 구역이 길게 이어져 완료 조건을 기억해야 함

- 근거: `src/screens/PredictionScreen.tsx`는 네 개의 `prediction-step`을 독립 카드로 렌더링하지만 상단에 전체 순서 요약이 없습니다. 마지막 CTA는 모든 선택이 끝나야 활성화됩니다.
- 영향: 학생이 기준면·윗면·순서·방향 중 어디까지 했는지 스크롤로 다시 확인해야 합니다.
- 수정: 화면 상단에 장식용 4단계 개요와 현재 선택 상태 안내를 추가하고, 순서/방향 컨트롤의 그룹 표면을 통일합니다. 선택 데이터와 완료 판정은 변경하지 않습니다.

### P2 — 접기 컨트롤과 관계 표의 시각적 묶음이 약함

- 근거: `src/screens/FoldingScreen.tsx`는 상태, range, 이전/다음 버튼, 보기 옵션, 3D/2D 결과를 연속으로 렌더링합니다. 데스크톱 캡처에서 컨트롤과 결과 사이 빈 공간이 커 보입니다.
- 영향: “한 면씩 확인”이라는 핵심 행동과 보조 보기 전환의 관계가 약하고, 모바일에서는 조작 대상이 세로로 흩어집니다.
- 수정: 컨트롤을 `fold-control-card`로 묶고 `다음 면 접기`를 카드 안의 유일한 강조 CTA로 정렬합니다. 2D 관계 표와 WebGL fallback은 그대로 둡니다.

### P2 — 진단·수리·근거·완료 화면의 카드/상태 표현이 화면마다 다름

- 근거: `src/styles/net2d.css`, `src/styles/repair.css`, `src/styles/evidence.css`가 각각 비슷한 border/padding을 반복하지만 radius, button height, success/error 표면이 조금씩 다릅니다.
- 영향: 단계가 바뀔 때마다 새로운 조작 규칙처럼 보이고, 오류/성공 상태가 색상에 의존할 가능성이 있습니다.
- 수정: 토큰화한 카드 표면·상태 배지·버튼 규칙을 공통으로 적용하고 텍스트를 함께 유지합니다. 기존 어린이용 방향 문구와 `not-applicable` 문구는 보존합니다.

### P2 — 업데이트 내역과 저장 안내는 존재하지만 footer에서 분리되어 보임

- 근거: `AppShell` footer에 저장 checkbox, 설명, `업데이트 내역` 버튼이 한 줄 flex 구조로 있습니다. 모바일에서는 길게 쌓이지만 섹션 제목이 없어 기능 구분이 약합니다.
- 영향: 학생이 학습 CTA와 개인정보/저장 선택을 혼동할 수 있습니다.
- 수정: footer를 `학습 기록 저장`과 `앱 정보` 두 묶음으로 정렬하고, 업데이트 버튼은 작은 보조 행동으로 유지합니다. 저장 선택과 sessionStorage 계약은 변경하지 않습니다.

## Accessibility and safety checks

- 현재 모든 버튼과 입력은 최소 44px 높이를 갖도록 전역 규칙이 있습니다. 리디자인에서도 이 값을 유지합니다.
- `NetGrid`는 화살표 키·Enter/Space를 지원하고, 화면 heading은 `useFocusHeading`으로 이동합니다. 새 장식용 진행 선은 `aria-hidden`으로 두고 의미 텍스트를 중복 읽지 않게 합니다.
- `gi-pulse`와 3D/접기 애니메이션은 `prefers-reduced-motion: reduce`에서 정적 외곽선·무애니메이션으로 대체됩니다.
- `forced-colors: active` 규칙은 유지하고, 색상만으로 선택/오류를 구분하지 않도록 텍스트와 border를 함께 사용합니다.
- 현재 앱은 이름·학번·이메일·자유 입력·외부 네트워크를 사용하지 않습니다. 리디자인에서 추가하지 않습니다.
- VoiceOver는 이 프로젝트의 명시적 범위 밖이며 이번 감사에서 실행하지 않았습니다.

## Asset audit summary

`public/favicon.svg`와 `src/components/net2d/FaceTile.tsx`의 inline SVG는 브랜드·기하 정보 자산입니다. 사진, 배경 이미지, `srcset`, CSS `url()`은 발견되지 않았습니다. 따라서 `imagegen`은 호출하지 않고 자산을 그대로 보존합니다. 상세 기록은 `work/education-webapp-redesign-assets.md`에 둡니다.

## Prioritized redesign acceptance

1. P1 학습 목표·CTA·진행 표시가 첫 화면과 모든 단계에서 명확해야 합니다.
2. P1 375px/320px에서 카드·컨트롤·표가 가로로 넘치지 않고 키보드 포커스가 보이어야 합니다.
3. P2 화면 표면과 상태 표현을 토큰으로 통일하되 domain 판정·콘텐츠·안전 경계는 그대로여야 합니다.

## 2026-08-29 redesign re-audit

구현 후 동일한 학습 경로를 다시 확인했습니다. `StageProgress`, 미션 안내 hero,
예측 4단계 개요, 접기 조작 카드, 공통 primary action 표면, 진단·수리·근거·완료
상태 표면을 적용했습니다. 접기 조작은 375px에서 루트 글자 크기를 200%로 올렸을
때도 버튼·range가 카드 안에서 줄바꿈되도록 모바일 grid를 사용합니다.

| 확인 항목 | 결과 | 증거 |
|---|---|---|
| 1440×900, 375×812, 320×800 초기 화면·첫 미션 선택 | PASS | `node /tmp/net-folding-redesign-audit.cjs`; 세 폭 모두 `scrollWidth === viewportWidth`, 콘솔 오류 0, 선택 후 `prediction-title` 포커스 |
| 예측·접기·진단·수리·근거·완료 learner path | PASS | `node /tmp/net-folding-redesign-full.cjs`; 각 단계 캡처와 완료 heading 확인 |
| 375×812 + 루트 글자 크기 200% 접기 조작 | PASS | 접기 단계의 document `scrollWidth=375`, `clientWidth=375`; primary action은 카드 폭 안에서 전체 너비로 배치 |
| 키보드·Enter/Space·pulse 단일성 | PASS (보정 전 기준) | 격리 포트 E2E accessibility/learner-flow 21개 전체 통과; 최신 대비 보정 후 재실행은 Chromium 시작 권한 오류로 차단 |
| reduced-motion·forced-colors·axe 심각 위반 | PASS (보정 전 기준) | 격리 포트 E2E accessibility 항목 통과; 최신 대비 보정 후 재실행은 Chromium 시작 권한 오류로 차단; VoiceOver는 범위 제외 |
| 개인정보·외부 트래픽·sessionStorage 경계 | PASS | `privacy-safety.spec.ts` 3개 통과; 실행 origin은 `PLAYWRIGHT_BASE_URL`로 주입 |
| 포트 혼용 방지 | PASS | `playwright.config.ts`가 `PLAYWRIGHT_PORT`/`PLAYWRIGHT_BASE_URL`과 Vite `--strictPort`를 사용 |

초기 전체 E2E 한 번은 포트 4173에 남아 있던 다른 프로젝트 개발 서버를 재사용해
오탐이 발생했습니다. 해당 실행은 현재 앱의 제품 증거로 사용하지 않았고, 포트
주입·strictPort를 추가한 뒤 4176 격리 서버에서 재실행했습니다. 다른 프로젝트
서버는 종료하거나 변경하지 않았습니다.

최신 수리 상태 카드 대비 보정은 `#147da1`에서 `#0f6685`(`--accent-strong`)로 전환했으며,
`#def3f4`(`--accent-soft`) 배경 대비를 정적 계산으로 `5.59:1` 확인했습니다. 보정 후
`npm run lint`, `npm run typecheck`, Vitest 260개, 파일 크기, 오프라인 경계, 빌드는
통과했지만, 관리형 macOS Chromium은 Playwright page 생성 전
`MachPortRendezvous ... Permission denied`로 종료되어 최신 E2E/axe 재검증은 별도 승인된
브라우저 환경에서 다시 실행해야 합니다.

인간 초등학생·교사·보조공학 사용자의 승인 테스트와 VoiceOver + Safari 검증은 이
문서의 자동화 결과에 포함하지 않습니다. 실제 수업 전에는 별도 동의·관찰 절차로
수동 확인해야 합니다.

## 2026-08-30 독립 점검 및 보정

`impeccable` 지원 역할의 독립 코드 감사를 추가로 확인했습니다. 아래 보정은 기존
학습 판정·저장·개인정보 경계를 건드리지 않는 화면 표현 변경입니다.

| 우선순위 | 발견 | 보정 및 확인 |
|---|---|---|
| P1 | 미션 종류와 무관하게 진행 표시가 `6`으로 고정됨 | `src/App.tsx`의 `STAGE_PATHS`를 미션 종류별로 분리했습니다. tracking은 6단계, opposite는 5단계, collision/repair는 7단계이며 `tests/app/AppShell.test.tsx`에서 2/5·2/6·2/7을 확인합니다. |
| P1 | 수리 미리보기에 `(x, y)`, `원본 위치`, `현재 위치`, `F6` 같은 내부 표현이 노출됨 | `src/screens/RepairScreen.tsx`가 `옮길 면`, `옮길 곳`, 방향 기반 `오른쪽 빈 칸`, 학습자용 `6번 면`으로 설명합니다. 수리 상태 live region도 같은 표현을 사용하며 `tests/components/RepairScreen.test.tsx`가 기술 용어 부재를 확인합니다. |
| P1 | 첫 미션 CTA가 긴 목록 아래에서 약하게 보임 | `src/screens/IntakeScreen.tsx`에 `첫 미션부터 시작하기` 앵커와 `.is-featured` 첫 카드 표면을 추가했습니다. 첫 미션의 실제 버튼 하나만 기존 `gi-pulse` 조건을 유지하고 `tests/components/IntakeScreen.test.tsx`가 단일 강조와 앵커를 확인합니다. |
| P2 | 상태 색상과 WebGL 색상 선언이 여러 파일에 흩어짐 | `--success-soft`, `--error-soft`, `--viewer-surface` 토큰을 추가하고 상태 CSS가 토큰을 사용하도록 정리했습니다. WebGL은 CSS 변수를 읽을 수 없으므로 `src/components/net3d/sceneColors.ts`에 명명된 팔레트를 모았습니다. |
| P2 | 두꺼운 왼쪽 색 테두리가 장식으로 사용됨 | 상태 카드에는 1px 전체 테두리와 위쪽 강조선을, 관계 행에는 inset 강조를 사용해 학습 상태를 유지하면서 장식 규칙을 정리했습니다. |
| P2 | 장식용 그라디언트가 정보보다 먼저 시선을 끌 수 있음 | `base.css`, `components.css`, `layout.css`의 배경·진행 막대를 solid token 표면으로 정리해 대비와 reduced-motion 예측 가능성을 높였습니다. |
| P2 | Three.js DPR 비용을 측정하지 않은 상태 | 이번 변경에서는 `dpr={[1, 2]}`와 2D fallback을 유지했습니다. 저사양 기기 최적화는 실측 자료와 별도 승인 후 판단합니다. |

이번 보정 후 `src/content/changelog.ts`에 `2026-08-30` 기록을 추가했습니다. 지원 역할의
경로와 자산 판단은 `work/education-webapp-redesign-plan.md`의 continuation plan에
기록되어 있으며, 이미지 생성은 사용할 사진·배경 자산이 없어 실행하지 않았습니다.
