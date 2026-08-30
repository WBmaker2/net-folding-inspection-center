# Education Web App Redesign Plan

## Goal

`전개도 포장 검수소`를 초등 5~6학년 학생이 첫 화면에서 학습 목적과 다음 행동을 이해하고, `미션 선택 → 예측 → 접기 → 진단 → 수리 → 근거 → 완료`를 안정적으로 따라갈 수 있도록 안전하게 리디자인합니다. 기존 정육면체 기하 판정, 미션 콘텐츠, 서버 없는 실행, 개인정보 미수집, 선택형 탭 저장, 2D 대체 보기, `gi-pulse` 핵심 버튼, `prefers-reduced-motion` 대체, 업데이트 내역 기록을 보존합니다.

성공 기준은 다음과 같습니다.

- 1440px에서 학습 목적·현재 단계·주요 행동이 첫 시선에 보이고, 375px과 320px에서 가로 스크롤 없이 같은 흐름을 완료합니다.
- 학생이 미션 카드에서 활동 종류·난이도·완료 상태를 읽고 한 번의 명확한 CTA로 시작합니다.
- 모든 핵심 단계 화면에 현재 단계와 다음 행동이 표시되고, 키보드 포커스·Enter/Space 조작·`focus-visible`이 유지됩니다.
- 기존 판정 결과와 저장 payload를 변경하지 않고, 자동 회전·점수·순위·음성 기능·외부 서비스·개인정보 입력을 추가하지 않습니다.
- 직접 작성 파일은 500줄 미만이며 기존 테스트와 새 UI 계약 테스트가 모두 통과합니다.

## Audit and role availability

초기 실제 브라우저 점검은 2026-08-29에 로컬 Vite 앱을 1440×900, 375×812, 320×800으로 열어 수행했습니다. 콘솔 오류는 없었고 세 폭 모두 `document.documentElement.scrollWidth === window.innerWidth`였습니다. 상세 근거는 `work/education-webapp-redesign-audit.md`에 기록합니다.

지원 역할 상태는 다음과 같습니다.

- `impeccable`: unavailable; 초기·최종 감사는 이 문서와 감사 문서의 수동 증거로 기록합니다.
- `ui-ux-pro-max`: unavailable; 디자인 토큰과 화면 규칙은 이 계획과 `design-system/MASTER.md`에 직접 정의합니다.
- `redesign-existing-projects`: unavailable; 기존 Vite/React 구조를 보존하는 구현을 직접 수행합니다.
- `imagegen`: not run; 현재 자산은 favicon과 기하 도형용 inline SVG뿐이며 생성·교체가 학습 목표를 높이지 않습니다.

프로젝트 우선 문서 확인 결과 `AGENTS.md`, `EDUCATION_DESIGN.md`, `design-system/MASTER.md`는 저장소에 없었습니다. 사용자 제공 작업 규칙, `2026-08-26-net-folding-inspection-center-design.md`, `2026-08-28-net-folding-inspection-center-improvement-plan.md`, `README.md`를 근거로 삼고 누락 문서는 추측하지 않습니다.

## Scope

### 변경하는 범위

- `AppShell`의 브랜드·단계 진행 표시·스킵 링크·미션 재선택 버튼의 시각 위계
- 미션 접수 화면의 학습 목표 안내, 미션 그룹/카드 구조, CTA 스타일
- 예측·접기 화면의 단계 안내, 선택 상태, 컨트롤 그룹, 모바일 세로 흐름
- 진단·수리·근거·완료 화면의 공통 카드 표면, 상태 대비, 행동 우선순위
- 라이트 테마 토큰, 버튼·입력·포커스·반응형·고대비·모션 감소 CSS
- 날짜가 있는 `CHANGELOG` 항목과 이 계획의 자동·수동 검증 기록

### 변경하지 않는 범위

- `src/domain/net/**`, `src/domain/learning/**`의 판정 알고리즘과 저장 schema
- 미션 JSON의 질문·정답·허용 어휘
- React Three Fiber의 기하 계산, WebGL fallback, 2D 관계 표의 의미
- 서버·로그인·외부 네트워크·학생 음성 재생/녹음·파일 업로드
- 이미지 생성, 사실·증거 자산 교체, Git 커밋·푸시·배포·HVC 등록

## Architecture

현재 `App`과 `useLearningController`의 상태 머신을 단일 진실 공급원으로 유지합니다. `AppShell`은 화면 장식과 진행 맥락만 렌더링하고, 화면 컴포넌트는 기존 callback과 순수 domain 함수를 그대로 사용합니다.

```text
learningReducer/domain ──> App ──> AppShell + current screen
        │                    │             │
        └── existing facts ──┴── visual tokens/components ──> responsive CSS
```

새 `StageProgress`는 `{ current, total, label }`만 받아 텍스트와 장식용 진행 선을 함께 렌더링합니다. 진행 선은 `aria-hidden`이고, 현재 단계 텍스트가 접근성 정보의 권위입니다. `PrimaryAction`은 `primary-action` 클래스를 항상 제공하고 기존 `criticalActionId` 판정으로 `gi-pulse`를 선택적으로 붙입니다.

## Tech Stack

- Vite 8 + React 19 + TypeScript strict
- 기존 React Three Fiber/Three.js, Vitest + Testing Library, Playwright 유지
- CSS custom properties와 기존 분리 CSS 파일 재사용
- 새 runtime dependency 없음
- Node `>=24.13.1`, npm lockfile 변경 없음

## Design system

`design-system/MASTER.md`를 새 기준 문서로 만들고 다음 토큰을 정의합니다.

- 색: 잉크 `#16324a`, 보조 잉크 `#587084`, 종이 `#fffaf1`, 표면 `#ffffff`, 선 `#d8e6eb`, 청록 강조 `#147da1`, 노랑 보조 `#fff1bf`, 성공 `#1d6b43`, 오류 `#a3342a`
- 형태: 카드 반경 `1rem`, 큰 학습판 반경 `1.25rem`, 버튼 반경 `0.65rem`, 최소 터치 높이 `44px`
- 간격: `0.5rem` 단위, 화면 여백 `clamp(1.25rem, 4vw, 4rem)`
- 서체: 기존 Pretendard/Apple SD Gothic Neo/Noto Sans KR 순서, 제목 `clamp()`와 `text-wrap: balance`
- 버튼: 핵심 CTA만 채움 + `gi-pulse`, 보조 행동은 흰 표면, 위험/오류 행동은 오류색 외곽선
- 상태: 선택됨(청록 외곽선+연한 배경), 완료(녹색), 진행 중(노란색), 비활성(선·불투명도)
- 반응형: 320px 최소, 520px 이하 단일 열, 768px 이상 학습판 2열
- 포커스: `3px solid var(--accent)`와 `3px` offset, 강제 색상 모드에서 `Highlight`
- 모션: 기본 전환은 짧게, `prefers-reduced-motion: reduce`에서 모든 전환·애니메이션 제거 및 정적 외곽선 사용

## Spec by screen

### App shell

`src/components/common/StageProgress.tsx`의 `StageProgressProps`는 `current`, `total`, `label`을 읽기 전용으로 받고 `aria-label="학습 진행"`을 유지합니다. `AppShell`에는 본문으로 건너뛰는 `a.skip-link`, 서비스 설명, 단계 진행, `미션 다시 고르기`를 배치합니다. 스킵 링크는 키보드 포커스 때만 보입니다.

### Intake

`IntakeScreen`은 한 문장의 미션 안내와 세 가지 학습 결과(`예측하기`, `한 면씩 접기`, `근거로 설명하기`)를 `mission-hero`에 표시합니다. 그룹 제목에는 활동 종류와 미션 수를 함께 보여 주고, 카드에는 `기본/도전`, 질문, `완료한 미션/아직 시작하지 않음`, 하나의 `미션 선택` CTA를 유지합니다. 첫 미션의 CTA만 현재 `criticalActionId`일 때 `gi-pulse`를 받습니다.

### Prediction and folding

예측 화면 상단에 `1 기준면 → 2 윗면 → 3 접는 순서 → 4 방향`을 장식용 단계 목록으로 제공하고 현재 입력 섹션에는 `aria-current`에 해당하는 상태 문장을 둡니다. 기존 `NetGrid` 키보드 이동과 모든 선택 값은 변경하지 않습니다. 접기 화면은 접힌 면 수, 이전/다음 버튼, 슬라이더, 보기 옵션을 하나의 `fold-control-card`로 묶고 2D 관계 표를 보조 설명으로 남깁니다.

### Diagnosis, repair, evidence, completion

각 화면의 첫 행동을 채움 CTA로 구분하고, 오류·성공·도움말 상태를 카드 안에서 색과 텍스트로 동시에 표시합니다. 진단의 어린이용 방향 라벨, 수리의 `면 선택 → 칸 선택 → 확인`, 근거의 역할별 낱말, 완료의 `배운 점`·`다음에는`은 기존 문구와 domain 계약을 유지한 채 간격·표면·모바일 줄바꿈만 정리합니다.

## Global constraints

- 기존 상태 전이와 `LearningAction` 이름을 변경하지 않습니다.
- `getAchievementEvidence`, `validateCubeNet`, `evaluateDiagnosis`, `evaluateEvidenceSubmission` 결과를 UI 스타일 코드에서 재계산하지 않습니다.
- `gi-pulse`는 `PrimaryAction`의 기존 조건을 통해 필요한 핵심 버튼에만 적용합니다.
- `prefers-reduced-motion`, `forced-colors`, 200% 확대, 키보드 포커스와 44px 터치 영역을 유지합니다.
- 라이트 모드만 사용하며 `prefers-color-scheme: dark`를 추가하지 않습니다.
- 업데이트 내역에 실제 개선 날짜 `2026-08-29`와 짧은 요약을 추가합니다.
- VoiceOver 구현·검증은 수행하지 않고, 자동 접근성 트리·키보드·스크린 리더용 텍스트 계약만 기록합니다.
- 이미지 자산은 새로 만들지 않습니다. favicon과 inline SVG 도형은 정보/브랜드 자산으로 보존합니다.
- 기존 변경 `output/` 디렉터리는 사용자 작업으로 간주하여 수정·삭제·추가하지 않습니다.

## 예상 파일 구조와 책임

```text
net-folding-inspection-center/
├── work/
│   ├── education-webapp-redesign-plan.md       # 본 계획
│   ├── education-webapp-redesign-audit.md      # 초기·최종 감사
│   ├── education-webapp-redesign-assets.md     # 자산 판정과 롤백
│   └── education-webapp-redesign-report.md     # 구현·검증 결과
├── design-system/MASTER.md                     # 공통 토큰과 컴포넌트 규칙
├── src/
│   ├── app/AppShell.tsx                        # 스킵 링크·브랜드·진행·저장
│   ├── components/common/StageProgress.tsx    # 접근 가능한 단계 진행 표시
│   ├── components/common/PrimaryAction.tsx    # 핵심 CTA 공통 클래스·pulse
│   ├── screens/IntakeScreen.tsx               # 미션 안내·카드 위계
│   ├── screens/PredictionScreen.tsx           # 예측 단계 안내
│   ├── screens/FoldingScreen.tsx              # 접기 컨트롤 카드
│   ├── screens/DiagnosisScreen.tsx            # 진단 상태 표면
│   ├── screens/RepairScreen.tsx               # 수리 단계 표면
│   ├── screens/EvidenceScreen.tsx             # 근거 입력 표면
│   ├── screens/CompletionScreen.tsx           # 결과 요약 표면
│   ├── content/changelog.ts                    # 2026-08-29 기록
│   └── styles/{tokens,base,layout,components,net2d,diagnosis,repair,evidence,motion}.css
└── tests/
    ├── components/IntakeScreen.test.tsx       # 카드·CTA·상태 계약
    ├── components/StageProgress.test.tsx      # 단계 진행 접근성
    ├── components/PrimaryAction.test.tsx      # 공통 클래스·pulse 회귀
    ├── app/AppShell.test.tsx                  # 스킵·미션 재선택·저장
    ├── components/{PredictionScreen,FoldingScreen,CompletionScreen}.test.tsx
    └── e2e/{learner-flow,responsive,accessibility}.spec.ts
```

## 작업 순서 and TDD contracts

### Task 1 — Baseline documents and design system

**Files**

- Add: `work/education-webapp-redesign-audit.md`
- Add: `work/education-webapp-redesign-assets.md`
- Add: `design-system/MASTER.md`

**Interfaces and acceptance**

- Audit lists P0/P1/P2 findings with viewport, evidence, affected path, and proposed fix.
- Asset record lists every `public`/`src` image reference and marks favicon/inline SVG as retained information/brand assets with no generated replacement.
- Design system names every token used by the implementation and records light mode, motion reduction, focus, touch, and 500-line constraints.

**TDD order**

- [ ] Failing documentation check: verify the three paths do not exist or lack required headings.
- [ ] Minimal implementation: write the audit, asset record, and master rules.
- [ ] Passing check: headings, support-role statuses, and asset decisions are searchable with no placeholder terms.

### Task 2 — Shell, progress, and common actions

**Files**

- Add: `src/components/common/StageProgress.tsx`
- Modify: `src/app/AppShell.tsx`, `src/components/common/PrimaryAction.tsx`
- Modify: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/layout.css`, `src/styles/components.css`, `src/styles/motion.css`
- Add: `tests/components/StageProgress.test.tsx`
- Modify: `tests/components/PrimaryAction.test.tsx`, `tests/app/AppShell.test.tsx`

**Interfaces**

- `StageProgressProps { current: number; total: number; label: string }`
- `StageProgress({ current, total, label }): React.JSX.Element`
- `PrimaryAction` always includes `primary-action`; `gi-pulse` is present only when the existing critical-action predicate is true.

**TDD order**

- [ ] Failing tests: expect skip link, `학습 진행` accessible name, current label, and `primary-action` class; expect no pulse when disabled or non-critical.
- [ ] Minimal implementation: add component, shell markup, common class, tokenized button/focus styles, and static reduced-motion fallback.
- [ ] Passing tests: targeted Vitest for StageProgress, PrimaryAction, and AppShell.

**Acceptance**

- Tab from the header reaches skip link, stage context, and mission switcher in logical order.
- 44px minimum controls remain visible at 320px and 200% zoom.
- No dark-mode media rule or new network request is introduced.

### Task 3 — Intake mission library redesign

**Files**

- Modify: `src/screens/IntakeScreen.tsx`
- Modify: `src/styles/layout.css`, `src/styles/components.css`
- Add: `tests/components/IntakeScreen.test.tsx`

**Interfaces**

- Keep `IntakeScreenProps` unchanged.
- Add internal readonly `kindDescriptions` map keyed by `MissionDefinition['kind']`; keep `kindLabels` and `difficultyFor` deterministic.

**TDD order**

- [ ] Failing tests: render eight missions and expect the hero outcome labels, four group counts, one primary CTA per card, completed status, and only the first critical CTA to contain `gi-pulse`.
- [ ] Minimal implementation: add hero/outcome markup, group count text, stable card classes, and button hierarchy.
- [ ] Passing tests: new IntakeScreen tests plus existing AppFlow and PrimaryAction tests.

**Acceptance**

- A learner can identify what to do before reading the full mission list.
- Card questions remain verbatim from mission JSON; no answer or score is revealed.
- Desktop cards use two columns; mobile cards use one column without horizontal overflow.

### Task 4 — Prediction and folding interaction framing

**Files**

- Modify: `src/screens/PredictionScreen.tsx`, `src/screens/FoldingScreen.tsx`
- Modify: `src/styles/net2d.css`, `src/components/net3d/cube-fold-viewer.css`
- Modify: `tests/components/PredictionScreen.test.tsx`, `tests/components/FoldingScreen.test.tsx`, `tests/app/AppFlow.test.tsx`

**Interfaces**

- Keep `PredictionScreenProps` and `FoldingScreenProps` unchanged.
- Add presentational `data-step-state` values only; prediction records and fold callbacks remain identical.

**TDD order**

- [ ] Failing tests: expect the four-step prediction overview, keyboard help text, fold control grouping, existing heading focus, and unchanged `2D 관계 보기` fallback.
- [ ] Minimal implementation: add overview/control wrappers and responsive styles without moving domain logic.
- [ ] Passing tests: targeted PredictionScreen/FoldingScreen/AppFlow tests and existing CubeFoldViewer tests.

**Acceptance**

- The next available action is visually distinct but no disabled button pulses.
- Slider, previous/next, view toggles, and relation table remain keyboard operable.
- At 375px the fold viewer and relation table stack vertically with no page-level horizontal scroll.

### Task 5 — Feedback, repair, evidence, and completion surfaces

**Files**

- Modify: `src/screens/DiagnosisScreen.tsx`, `src/screens/RepairScreen.tsx`, `src/screens/EvidenceScreen.tsx`, `src/screens/CompletionScreen.tsx`
- Modify: `src/styles/net2d.css`, `src/styles/repair.css`, `src/styles/evidence.css`
- Modify: `tests/components/DiagnosisScreen.test.tsx`, `tests/components/RepairScreen.test.tsx`, `tests/components/EvidenceScreen.test.tsx`, `tests/components/CompletionScreen.test.tsx`

**Interfaces**

- Keep `AchievementStatus`, `EvidenceSubmission`, `DiagnosisSubmission`, `RepairSubmission`, and all existing callbacks unchanged.
- Use existing `directionLabel`, `statusText`, and evidence option functions; add no new scoring state.

**TDD order**

- [ ] Failing tests: expect readable status labels, one visually primary action per screen, no technical axis terms, completion takeaway/next-step text, and 375px comparison-table wrapping.
- [ ] Minimal implementation: add semantic section classes and shared feedback/action styles.
- [ ] Passing tests: targeted screen tests and full learner-flow regression.

**Acceptance**

- Error and success states use text plus non-color cues.
- Completion still distinguishes `이번 미션에는 없음` from `확인함` and never invents a score.
- Evidence and comparison tables remain readable at 200% zoom.

### Task 6 — Changelog, asset record, and verification

**Files**

- Modify: `src/content/changelog.ts`
- Modify: `docs/qa/manual-accessibility-checklist.md`, `docs/qa/release-evidence.md`
- Modify: `playwright.config.ts`, `e2e/helpers/keyboard-flow.ts`, `e2e/privacy-safety.spec.ts`
- Add: `work/education-webapp-redesign-report.md`

**TDD and verification order**

- [ ] Failing policy checks: run targeted UI tests and file-size/offline checks before the final style pass.
- [ ] Minimal implementation: add the dated changelog entry and record actual command/browser results.
- [ ] Passing automation: `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run test:e2e`, `npm run check:file-size`, `npm run check:offline-boundary`, `npm run build`.
- [ ] Passing browser checks: 1440px, 768px, 375px, and 320px learner path; keyboard-only path; reduced motion; forced colors; 200% zoom; console error scan. VoiceOver remains explicitly not run.

Playwright는 `PLAYWRIGHT_PORT`와 `PLAYWRIGHT_BASE_URL` 환경 변수로 격리 실행할 수 있고,
Vite 서버는 `--strictPort`로 다른 프로젝트 서버를 조용히 재사용하지 않습니다. 개인정보
트래픽 검사는 같은 환경 변수의 origin을 기준으로 비교합니다.

**Acceptance**

- Every command has exit status and core output in the report.
- Browser evidence separates product assertions from local browser-environment errors.
- Asset record confirms no image generation or replacement and provides rollback to current inline SVG/favicon references.

## Failure handling and rollback

- If a test or browser check fails, isolate the smallest changed file and revert only the redesign patch with `git restore -- <path>` after confirming the path is ours; never reset unrelated work.
- If the new StageProgress or hero markup causes a regression, remove the new component/import and restore the previous `AppShell`/`IntakeScreen` structure while retaining token variables that do not affect behavior.
- If a CSS change creates overflow, first remove the offending rule, rerun the 320/375 responsive check, and leave the prior layout intact until a narrow fix is proven.
- If the same failure repeats three times, stop and report evidence, likely cause, safe alternatives, and the decision needed from the user.

## Commands to run later and expected results

```bash
npm test -- --run tests/components/StageProgress.test.tsx tests/components/PrimaryAction.test.tsx tests/app/AppShell.test.tsx tests/components/IntakeScreen.test.tsx
# Expected: new shell/intake contracts pass; no domain tests are changed.

npm test -- --run tests/components/PredictionScreen.test.tsx tests/components/FoldingScreen.test.tsx tests/components/DiagnosisScreen.test.tsx tests/components/RepairScreen.test.tsx tests/components/EvidenceScreen.test.tsx tests/components/CompletionScreen.test.tsx tests/app/AppFlow.test.tsx
# Expected: existing learning interactions and presentational assertions pass.

npm run lint
npm run typecheck
npm test -- --run
npm run test:e2e
npm run check:file-size
npm run check:offline-boundary
npm run build
# Expected: all exit 0; build may print the existing Three.js chunk advisory only.
```

## Future commit steps

No commit, push, release, deploy, or HVC action is part of this redesign turn. If the user later authorizes commits, use these isolated steps after the full verification passes:

1. `docs: add education redesign audit and design system`
2. `feat: clarify learner shell and mission intake`
3. `style: frame prediction and folding interactions`
4. `style: unify feedback and completion surfaces`
5. `docs: record redesign verification`

Each commit must contain only the files named in its task, and the final report must link the actual deployed URL only after a separately authorized deployment.

## Rollback checkpoint

Before implementation, preserve the current `git status` (`output/` remains untracked and untouched). The redesign is reversible by restoring only the new/modified files listed above; all `src/domain/**`, mission JSON, and existing deployment evidence remain unchanged.

## 2026-08-30 continuation plan

### Rules and evidence checked before edits

- Project-local `AGENTS.md`: not found under the repository or its parent project folders.
- `EDUCATION_DESIGN.md`: not found in the repository; no replacement rules are invented.
- Existing plan: this document, including the prior redesign scope, TDD contracts, rollback
  checkpoint, and no-release boundary.
- Existing visual authority: `design-system/MASTER.md`, current source CSS/components, and
  `work/education-webapp-redesign-audit.md`.
- Product truth: `2026-08-26-net-folding-inspection-center-design.md`,
  `2026-08-28-net-folding-inspection-center-improvement-plan.md`, and `README.md`.

### Support-role check

The following files were read on 2026-08-30 before the continuation review:

- `impeccable`: available at `/Users/kimhongnyeon/.agents/skills/impeccable/SKILL.md`;
  `reference/new-work.md`, `reference/operate.md`, `reference/craft-floor.md`, and
  `reference/audit.md` were consulted. The independent audit pass is recorded in the audit
  document; no unsupported human approval is claimed.
- `ui-ux-pro-max`: available at `/Users/kimhongnyeon/.agents/skills/ui-ux-pro-max/SKILL.md`.
  Its local design-system search returned a light, playful educational direction and its UX
  search confirmed progress indicators, visible focus, focus-not-obscured, keyboard order,
  semantic React controls, and 44px targets. Existing project tokens remain authoritative;
  no external font or runtime package is introduced.
- `redesign-existing-projects`: available at
  `/Users/kimhongnyeon/.agents/skills/redesign-existing-projects/SKILL.md`; its scan →
  diagnose → targeted-fix sequence is followed without a framework rewrite.
- `imagegen`: available at `/Users/kimhongnyeon/.codex/skills/imagegen/SKILL.md`; the required
  asset-safety reference was read from
  `/Users/kimhongnyeon/.codex/skills/education-webapp-redesign/references/asset-safety.md`.
  No eligible general image asset exists, so generation remains not run and instructional
  SVG/Three.js geometry is retained.

### Continuation scope and acceptance

- Preserve all existing `src/domain/**`, mission JSON, callbacks, storage schema, 2D fallback,
  privacy boundary, and light-mode decision.
- Re-audit the rendered shell, mission intake, prediction/folding controls, feedback surfaces,
  update history, and 320/375/768/1440 layouts for decorative glyph use, contrast, focus
  visibility, card hierarchy, and single-primary-action clarity.
- If a mechanical or semantic defect is found, add a failing regression assertion first,
  implement the smallest component/CSS change, then rerun targeted tests and the non-browser
  verification gate. Keep every authored source file under 500 lines.
- Update the audit/report with the 2026-08-30 role status and exact evidence. Do not mark
  browser checks as passing when Chromium fails before page creation.
- Do not install packages, generate images, commit, push, deploy, register HVC, or modify the
  pre-existing untracked `output/` directory during this continuation.

### Planned checks

```bash
node /Users/kimhongnyeon/.agents/skills/impeccable/scripts/detect.mjs --json src/app/AppShell.tsx src/components/common/PrimaryAction.tsx src/components/common/StageProgress.tsx src/screens/IntakeScreen.tsx src/screens/PredictionScreen.tsx src/screens/FoldingScreen.tsx src/screens/DiagnosisScreen.tsx src/screens/RepairScreen.tsx src/screens/EvidenceScreen.tsx src/screens/CompletionScreen.tsx src/styles
npm test -- --run
npm run lint
npm run typecheck
npm run check:file-size
npm run check:offline-boundary
npm run build
```

The detector is run once after this review's UI edits. A browser E2E rerun is attempted only
once in an isolated `PLAYWRIGHT_PORT`; a macOS Chromium launch failure is recorded as an
environment blocker rather than retried through a workaround.

The single detector run reported only a `layout-transition` warning for the stage progress
bar's `transition: width` at `src/styles/layout.css:124`. The implementation changed the fill
to `transform: scaleX(...)` with `transform-origin: left center`; the focused test now asserts
the transform value. The detector is not rerun because this plan intentionally uses one
post-review detector pass.

### Independent 2026-08-30 audit findings and implementation order

The delegated `impeccable` review found three learner-facing priority issues and two
non-blocking maintenance opportunities. The implementation order below is now part of the
active plan and is covered by regression assertions before the corresponding source change.

1. `src/App.tsx` previously reported `6` stages for every mission even though the catalog has
   three distinct paths. Add a typed `STAGE_PATHS: Record<MissionKind, readonly LearningStage[]>`
   map and pass `mission?.kind` to `getStageMeta`. The tracking path has 6 stages, the opposite
   path has 5, and collision/repair paths have 7. Add `tests/app/AppShell.test.tsx` cases that
   select `cube-opposite-01` and `cube-collision-01` and assert `2 / 5 · 예측` and
   `2 / 7 · 예측` respectively, while retaining the 6-stage tracking assertion.
2. `src/screens/RepairScreen.tsx` exposed coordinates and internal face IDs in the preview.
   Replace `원본 위치`, `현재 위치`, and raw `F6` output with `옮길 면`, `옮길 곳`, and a
   direction phrase such as `오른쪽 빈 칸`; describe changed faces as learner-facing face
   numbers. Update the live status to use the same direction phrase. Extend
   `tests/components/RepairScreen.test.tsx` to assert the new labels and the absence of the
   removed technical labels/IDs.
3. `src/screens/IntakeScreen.tsx` still made the first action compete with a long mission list.
   Add a keyboard-visible `#mission-group-tracking` anchor named `첫 미션부터 시작하기`
   and mark the first mission card as `.is-featured` while preserving the single
   `select-mission` `gi-pulse` CTA. Cover the link and featured class in
   `tests/components/IntakeScreen.test.tsx`.
4. Consolidate status colors into `src/styles/tokens.css` (`--success-soft`, `--error-soft`,
   `--viewer-surface`) and use semantic variables in diagnosis, repair, evidence, net2d, and
   CubeFoldViewer styles. Replace thick colored left borders with a 1px card border plus a
   top accent or an inset emphasis so the craft-floor rule remains satisfied. Keep the
   Three.js palette in `src/components/net3d/sceneColors.ts` because WebGL materials cannot
   read CSS custom properties. Remove decorative CSS gradients and use the existing solid
   light-mode tokens for predictable contrast and reduced visual noise.
5. The Three.js DPR cap remains a measured-device follow-up: `dpr={[1, 2]}` is retained for
   this pass because no browser/device benchmark is available. The existing 2D fallback and
   reduced-motion behavior remain the supported low-power path; do not change camera or
   rendering behavior without a separate performance measurement.

### Continuation TDD and verification record

- [x] Failing regression assertions were observed for dynamic stage totals and learner-facing
  repair labels before their implementations were changed.
- [x] Minimal implementation now passes the stage, repair, and intake component tests.
- [ ] Run the complete non-browser gate after the final style pass: lint, typecheck, all Vitest
  tests, file-size, offline-boundary, and build.
- [ ] Attempt the isolated browser gate once. If Chromium fails before page creation, record the
  error and keep the previous isolated learner-path result as historical evidence; do not
  claim a post-change browser pass.
