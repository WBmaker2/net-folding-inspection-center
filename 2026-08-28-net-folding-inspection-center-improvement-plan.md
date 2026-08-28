# Net Folding Inspection Center Improvement Plan

## Goal

초등학생이 실제로 사용하는 흐름에서 발견된 혼란과 학습 신뢰 문제를 우선 해결합니다. 개선 후에도 정육면체 MVP의 학습 순서(`예측 → 한 면씩 접기 → 진단 → 수리 → 근거 → 완료`), 서버 없는 실행, 개인정보 미수집, 2D 대체 경로, `gi-pulse`, 모션 감소 대체, 업데이트 내역 기록을 유지합니다.

이번 개선은 2026-08-28 학습자 관점 점검 캡처와 현재 소스의 다음 증거를 기준으로 합니다.

- `src/domain/learning/selectors.ts:78`: tracking/opposite 미션에서도 수리 상태가 자동으로 `confirmed`가 됨
- `src/screens/FoldingScreen.tsx`: 단계 전환 뒤 제목으로 포커스를 이동하지 않음
- `src/components/net3d/CubeFoldViewer.tsx:73`, `src/components/net3d/cameraModel.ts:54`: 고정 카메라로 3D 모델이 작고 빈 공간이 큼
- `src/screens/DiagnosisScreen.tsx:31`, `:40`, `:209`, `:252`: 기술적인 축 표기와 일반 오류 선택지가 섞임
- `src/styles/evidence.css:98`: 모바일 비교표에 608px 최소 폭이 있어 가로 스크롤이 생김
- `src/screens/EvidenceScreen.tsx:71`, `:193`, `src/domain/learning/evidence.ts:183`: 두 낱말 선택 칸이 같은 전체 목록을 사용하고 particle 정규화가 면 이름에만 적용됨
- `src/app/App.tsx`, `src/app/AppShell.tsx`: 진행 단계 표시와 미션 재선택 통로가 없음
- `src/screens/CompletionScreen.tsx`: 완료 화면에 배운 점과 다음 행동이 명시되지 않음

## Architecture

### 불변 학습 규칙

1. 판정 권위는 `src/domain/net`과 `src/domain/learning`의 순수 TypeScript 함수에만 둡니다. React, Three.js, Canvas 결과를 판정에 사용하지 않습니다.
2. `AchievementStatus`는 실제로 수행한 증거만 `confirmed`로 만들고, 해당 미션에 없는 활동은 `not-applicable`로 표시합니다. `isComplete`는 `not-applicable`을 완료 조건으로 계산하되 학생 화면에서 확인 완료로 오해하게 만들지 않습니다.
3. 화면 전환은 기존 `learningReducer` 계약을 유지합니다. 새 UI 버튼은 `RESET_MISSION` 또는 이미 존재하는 `RETURN_TO_FOLD_STEP`를 통해서만 상태를 바꿉니다.
4. 어린이에게 보이는 방향은 `오른쪽·왼쪽·위·아래·앞·뒤`로 표시하고, 저장·판정에는 기존 `+x·-x·+y·-y·+z·-z` 값을 그대로 사용합니다.
5. 문장 생성은 미션의 `sentenceFrame`과 허용 어휘를 계속 권위로 사용하며, 조사만 자연스럽게 보정합니다.

### 화면 구조

- `App`은 `stageMeta`와 미션 정보를 계산해 `AppShell`에 전달합니다.
- `AppShell`은 헤더에 현재 단계와 `미션 다시 고르기`를 제공하고, 기존 업데이트 내역·저장 선택 UI를 유지합니다.
- 각 화면은 자신의 `<h1>`을 `useFocusHeading`으로 포커스해 키보드와 스크린 리더의 시작 위치를 명확히 합니다.
- `CompletionScreen`은 미션 종류에 따른 학습 요약을 보여 주고, 비교표는 375px에서도 줄바꿈되는 테이블로 렌더링합니다.
- `CubeFoldViewer`는 계산된 장면의 전체 중심과 범위로 카메라 목표점·zoom을 정해 3D 보조 보기의 빈 공간을 줄입니다. WebGL 실패 시 기존 2D 관계 표를 그대로 사용합니다.

## Tech Stack

기존 Vite + React 19 + TypeScript strict + Three.js/React Three Fiber + Vitest + Testing Library + Playwright + 정적 CSS를 유지합니다. 새 패키지를 추가하지 않습니다. 프로젝트 기준 Node는 `>=24.13.1`입니다.

## Spec

기준 설계 문서는 `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/2026-08-26-net-folding-inspection-center-design.md`이며, 기존 구현 계획은 `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/2026-08-26-net-folding-inspection-center-implementation-plan.md`입니다. 이번 문서는 두 문서의 MVP·접근성·개인정보·안전·완료 기준을 유지하면서 실제 사용성 점검에서 발견된 회귀를 고치는 후속 계획입니다.

## Global Constraints

- 직접 작성하는 `.ts`, `.tsx`, `.css`, `.mjs`, `.json` 파일은 500줄 미만으로 유지합니다. 500줄에 가까워지는 파일은 기능별 모듈로 분리합니다.
- 통합 학습 흐름의 user-event 테스트가 병렬 실행에서도 환경 지연으로 오판되지 않도록 `vite.config.ts`의 Vitest 기본 `testTimeout`을 10초로 유지합니다.
- 수리하지 않은 미션에 `수리 확인함` 또는 `필요한 근거를 모두 확인했습니다.`를 표시하지 않습니다.
- 점수·순위·속도·타이머·개인정보 입력·외부 네트워크·학생용 음성 재생을 추가하지 않습니다.
- 현재 핵심 버튼 하나만 `gi-pulse`를 유지하며, `prefers-reduced-motion: reduce`에서는 애니메이션 없이 굵은 윤곽선으로 대체합니다.
- 업데이트 내역에 실제 개선 날짜와 짧은 요약을 추가합니다.
- 모바일 375px, 키보드 전용, 200% 확대, 고대비, reduced-motion과 접근성 트리를 자동화 검증으로 기록합니다. VoiceOver 구현·검증은 범위에서 제외합니다.
- 이번 작업에서는 Git 커밋·푸시·배포를 실행하지 않습니다. 구현과 검증 결과를 먼저 사용자에게 보고하고 별도 지시를 기다립니다.

## 핵심 인터페이스 변경

```ts
export type AchievementStatus = 'confirmed' | 'practicing' | 'not-applicable';

export interface AppStageMeta {
  readonly current: number;
  readonly total: number;
  readonly label: string;
  readonly canReselect: boolean;
}

export interface AppShellProps {
  readonly stageMeta?: AppStageMeta;
  readonly onReselectMission?: () => void;
}

export function axisLabel(direction: AxisDirection): string;

export function getEvidenceTermOptions(
  mission: MissionDefinition,
): Readonly<{ relationship: readonly GeometryTerm[]; path: readonly GeometryTerm[] }>;

export function buildCameraPose(
  view: CubeFoldView,
  baseFace: Pick<SceneFace, 'normal' | 'right' | 'down' | 'frame' | 'id'> | undefined,
  sceneFaces?: readonly Pick<SceneFace, 'frame' | 'transform'>[],
): CameraPose;
```

## 예상 파일 구조와 책임

```text
net-folding-inspection-center/
├── 2026-08-28-net-folding-inspection-center-improvement-plan.md
├── vite.config.ts                           # 통합 Vitest 실행 시간 제한
├── src/
│   ├── App.tsx                              # 단계 메타·미션 재선택 연결
│   ├── app/AppShell.tsx                     # 단계 표시·미션 변경 버튼
│   ├── components/net3d/cameraModel.ts     # 장면 범위 기반 카메라 계산
│   ├── domain/net/directionLabels.ts       # 내부 축 값을 어린이용 방향으로 변환
│   ├── domain/learning/evidence.ts         # 자연스러운 조사·역할별 낱말 옵션
│   ├── domain/learning/selectors.ts         # 해당 없음 성취 상태 계산
│   ├── domain/learning/types.ts             # AchievementStatus 확장
│   ├── screens/CompletionScreen.tsx         # 학습 요약·해당 없음 표시
│   ├── screens/DiagnosisScreen.tsx          # 어린이용 오류·방향 문구
│   ├── screens/EvidenceScreen.tsx           # 역할별 낱말 선택 UI
│   ├── screens/FoldingScreen.tsx            # 제목 포커스
│   ├── styles/evidence.css                  # 375px 비교표·힌트
│   ├── styles/layout.css                    # 단계 표시·미션 변경 버튼
│   └── content/changelog.ts                 # 2026-08-28 개선 기록
└── tests/
    ├── learning/evidenceReducer.test.ts    # 해당 없음·완료 조건
    ├── domain/evidence.test.ts              # 조사·옵션 역할
    ├── components/{CompletionScreen,DiagnosisScreen,EvidenceScreen,FoldingScreen}.test.tsx
    ├── components/CubeFoldViewer.test.tsx  # 카메라 입력 계약
    ├── app/AppShell.test.tsx                # 진행·미션 변경 버튼
    └── app/AppFlow.test.tsx                 # 실제 단계 이동 회귀
```

## 작업 순서

### Task 1 — P0: 성취 상태가 해당 미션의 활동만 확인하도록 수정

**Files**

- Modify: `src/domain/learning/types.ts`
- Modify: `src/domain/learning/selectors.ts`
- Modify: `src/screens/CompletionScreen.tsx`
- Modify: `tests/learning/evidenceReducer.test.ts`, `tests/components/CompletionScreen.test.tsx`

**Interfaces**

- `AchievementStatus = 'confirmed' | 'practicing' | 'not-applicable'`
- `getAchievementEvidence(state, mission): AchievementEvidence`
- `statusText()`는 `not-applicable`을 `이번 미션에는 없음`으로 렌더링

**TDD 순서**

- [x] 실패 테스트: tracking/opposite 완료 상태에서 `repair === 'not-applicable'`, 화면에 `수리 · 이번 미션에는 없음`이 있고 `수리 확인함`이 없는지 검증
- [x] 실패 확인: 새 상태 리터럴이 없어 TypeScript 또는 기대값이 실패하는지 확인
- [x] 최소 구현: `not-applicable` 타입과 미션 종류별 상태 계산을 추가하고 `isComplete`만 해당 없음으로 통과시키기
- [x] 통과 확인: `npm test -- --run tests/learning/evidenceReducer.test.ts tests/components/CompletionScreen.test.tsx` — 7 tests passed

**합격 조건**

- collision/repair만 수리 상태를 계산합니다.
- opposite는 분석 상태를 `not-applicable`로 표시합니다.
- 완료 문구는 실제 네 가지 성취 상태 중 `practicing`이 남지 않을 때만 표시됩니다.

### Task 2 — P1: 근거 낱말 역할과 한국어 문장 조사 정리

**Files**

- Modify: `src/domain/learning/evidence.ts`
- Modify: `src/screens/EvidenceScreen.tsx`
- Modify: `src/styles/evidence.css`
- Modify: `tests/domain/evidence.test.ts`, `tests/components/EvidenceScreen.test.tsx`

**Interfaces**

- `getEvidenceTermOptions(mission)`은 `relationship`와 `path` 배열을 별도로 반환
- `buildEvidenceSentence()`는 `면/모서리/맞은편/접는 방향/겹침/빈 면` 뒤의 `과·와`, `이·가`, `을·를`, `은·는`을 자연스럽게 보정

**TDD 순서**

- [x] 실패 테스트: `모서리을`, `면와`, `겹침이`가 생성되지 않고 각 미션의 역할별 옵션이 전체 어휘 목록과 다름을 검증
- [x] 실패 확인: 구현 전 `getEvidenceTermOptions` 부재와 새 label 부재로 관련 테스트가 실패함을 확인
- [x] 최소 구현: 명시적인 기하 용어 조사 맵과 역할별 옵션 함수를 추가하고 select의 label을 `관계를 나타내는 낱말`, `까닭을 나타내는 낱말`로 변경
- [x] 통과 확인: `npm test -- --run tests/domain/evidence.test.ts tests/components/EvidenceScreen.test.tsx` — 2 files, 19 tests passed

**합격 조건**

- 선택한 두 면과 낱말 조합으로 어색한 조사 문장이 화면에 나타나지 않습니다.
- 잘못된 조합은 여전히 `isCorrectDraft === false`이며 판정 권위를 우회하지 않습니다.
- 키보드 방향키로 select를 바꿀 수 있고, 현재 `gi-pulse` 핵심 버튼 규칙을 유지합니다.

### Task 3 — P1: 접기 단계 전환 후 제목 포커스와 흐름 안내

**Files**

- Modify: `src/screens/FoldingScreen.tsx`
- Modify: `tests/components/FoldingScreen.test.tsx`
- Modify: `e2e/learner-flow.spec.ts`, `e2e/accessibility.spec.ts` when selectors require the new focus assertion

**Interfaces**

- `FoldingScreen`은 `useFocusHeading<HTMLHeadingElement>()`을 사용
- `h1#folding-title`은 `tabIndex={-1}`이고 단계 화면이 새로 열릴 때 `document.activeElement`가 됩니다.

**TDD 순서**

- [x] 실패 테스트: FoldingScreen 마운트 후 `#folding-title`이 active element인지 검증
- [x] 실패 확인: 구현 전 제목 ref가 없어 active element가 `body`로 남는지 확인
- [x] 최소 구현: hook과 ref를 추가하고 기존 오류 화면·정상 화면 모두에 동일 제목 ID를 유지
- [x] 통과 확인: `npm test -- --run tests/components/FoldingScreen.test.tsx` — 1 file, 16 tests passed

**합격 조건**

- 예측 제출 뒤 접기 화면에서 데스크톱·모바일 모두 제목으로 읽기 위치가 이동합니다.
- `gi-pulse`, reduced-motion, 2D 관계 표가 회귀하지 않습니다.

### Task 4 — P1: 진단 문장을 어린이용 표현으로 정리

**Files**

- Modify: `src/screens/DiagnosisScreen.tsx`
- Add: `src/domain/net/directionLabels.ts`
- Modify: `tests/components/DiagnosisScreen.test.tsx`, `tests/domain/diagnosis.test.ts`

**Interfaces**

- `axisLabel(direction: AxisDirection): string`은 `+x/-x/+y/-y/+z/-z`를 각각 `오른쪽/왼쪽/위/아래/앞/뒤`로 변환
- `errorChoices`는 mission kind에 맞는 핵심 오류를 먼저 보여 주며, 화면 문구에는 `법선`과 축 기호를 노출하지 않음

**TDD 순서**

- [x] 실패 테스트: collision 화면에 `오른쪽 방향` 등 어린이용 레이블이 보이고 `+x 방향`과 `법선`이 보이지 않는지 검증
- [x] 실패 확인: 구현 전 DOM에서 기술 축 문자열과 `법선`이 그대로 노출됨을 확인
- [x] 최소 구현: 표시용 레이블 맵과 mission별 설명 문구를 추가하고 평가에 전달하는 값은 기존 enum을 유지
- [x] 통과 확인: `npm test -- --run tests/components/DiagnosisScreen.test.tsx tests/domain/diagnosis.test.ts` — 2 files, 28 tests passed

**합격 조건**

- tracking은 `무늬 방향이 달라요`, collision/repair는 `두 면이 같은 자리에 있어요`처럼 의미가 즉시 이해됩니다.
- 스크린 리더가 선택 단계와 현재 선택 면을 읽을 수 있습니다.

### Task 5 — P1: 3D 보조 보기의 중심·크기 개선

**Files**

- Modify: `src/components/net3d/cameraModel.ts`
- Modify: `src/components/net3d/FoldScene.tsx`
- Modify: `src/components/net3d/CubeFoldViewer.tsx`
- Modify: `tests/components/CubeFoldViewer.test.tsx`

**Interfaces**

- `buildCameraPose(view, baseFace, sceneFaces?)`는 전체 장면 bounds를 사용해 front/right/top의 공통 target과 제한된 zoom을 계산
- `FoldScene`의 시각적 opacity·충돌 강조·자동 회전 끄기 계약은 유지

**TDD 순서**

- [x] 실패 테스트: 평면 전개도가 넓게 퍼진 snapshot에서 pose target이 기준면 하나가 아닌 장면 중심에 가깝고 zoom이 유효 범위인지 검증
- [x] 실패 확인: 구현 전 pose가 모든 view에서 `zoom: 3.8`이고 base center만 target으로 쓰는지 확인
- [x] 최소 구현: face frame center bounds와 여백 상수를 계산해 camera pose에 전달
- [x] 통과 확인: `npm test -- --run tests/components/CubeFoldViewer.test.tsx && npm run typecheck` — 12 tests passed, typecheck passed

**합격 조건**

- 캡처 기준 3D 모델이 화면의 중심과 읽을 수 있는 크기로 보입니다.
- WebGL 미지원에서는 기존 `2D 관계 보기를 유지합니다.`가 표시됩니다.
- Canvas는 계속 `aria-hidden`이고, 의미 정보는 2D 표와 live region에 남습니다.

### Task 6 — P1: 모바일 비교표와 완료 학습 요약 개선

**Files**

- Modify: `src/styles/evidence.css`
- Modify: `src/screens/CompletionScreen.tsx`
- Modify: `tests/components/CompletionScreen.test.tsx`
- Modify: `e2e/responsive.spec.ts`, `e2e/learner-flow.spec.ts`

**Interfaces**

- 모바일 `.completion-comparison table`은 `min-width: 0`과 고정 레이아웃·줄바꿈 규칙을 사용
- `CompletionScreen`에 `learning-takeaway`와 `next-step` 영역을 추가

**TDD 순서**

- [x] 실패 테스트: 375px에서 비교표 `scrollWidth <= clientWidth`, `배운 점`, `다음에는` 문구를 검증
- [x] 실패 확인: 구현 전 608px 최소 폭과 요약 부재를 확인
- [x] 최소 구현: 모바일 표 CSS를 줄바꿈 중심으로 바꾸고 mission kind별 두 문장 요약을 추가
- [x] 통과 확인: `npm test -- --run tests/components/CompletionScreen.test.tsx && npm run typecheck` — 4 tests passed, typecheck passed

**합격 조건**

- 학생이 마지막 화면에서 무엇을 배웠는지와 다음에 무엇을 해 볼지 말할 수 있습니다.
- 비교표는 가로 스크롤 없이 375px에서 읽을 수 있고, 200% 확대에서도 필수 정보가 잘리지 않습니다.

### Task 7 — P2: 단계 진행 표시와 미션 재선택 통로

**Files**

- Modify: `src/App.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/styles/layout.css`, `src/styles/components.css`
- Modify: `tests/app/AppShell.test.tsx`, `tests/app/AppFlow.test.tsx`

**Interfaces**

- `AppStageMeta`는 `intake`를 1, `prediction`을 2, `folding`을 3, `diagnosis`를 4, `repair`를 5, `evidence/complete`를 6으로 표시
- `AppShell`의 `미션 다시 고르기`는 `onReselectMission`을 호출하고 `intake` 외 단계에서만 보임

**TDD 순서**

- [x] 실패 테스트: 진행 표시가 `3 / 6 · 접기`처럼 보이고 버튼 클릭이 `RESET_MISSION`으로 이어지는지 검증
- [x] 실패 확인: 구현 전 header에 서비스명만 있고 재선택 버튼이 없음을 확인
- [x] 최소 구현: stage meta를 App에서 계산하고 AppShell에 전달, 작은 화면에서는 버튼이 줄바꿈되도록 CSS 추가
- [x] 통과 확인: `npm test -- --run tests/app/AppShell.test.tsx && npm run typecheck` — 5 tests passed, typecheck passed

**합격 조건**

- 학생은 현재 위치와 남은 단계를 알 수 있습니다.
- 진행 중 미션을 잃지 않고 명시적으로 다시 고를 때만 초기화됩니다.

### Task 8 — 날짜 기록과 전체 검증

**Files**

- Modify: `src/content/changelog.ts`
- Modify: `vite.config.ts`
- Modify: `docs/qa/manual-accessibility-checklist.md`
- Modify: `docs/qa/release-evidence.md`

**TDD 및 검증 순서**

- [x] `CHANGELOG`에 `2026-08-28` 개선 항목 추가
- [x] 실패 테스트를 먼저 모두 실행: 관련 Vitest 컴포넌트·도메인 테스트
- [x] 최소 구현 후 좁은 테스트를 통과시킴
- [x] `npm run lint` — PASS
- [x] `npm run typecheck` — PASS
- [x] `npm test -- --run` — PASS, 29 files·254 tests
- [x] `npm run check:file-size` — PASS
- [x] `npm run check:offline-boundary` — PASS
- [x] `npm run build` — PASS, Three.js chunk advisory만 출력
- [x] `npm run test:e2e`는 브라우저 기동 결과와 제품 assertion을 분리 기록 — PASS, 21/21
- [x] VoiceOver 구현·검증은 사용자 지침에 따라 범위에서 제외하고 자동화 접근성 결과만 기록
- [x] `vite.config.ts`의 Vitest `testTimeout: 10_000`으로 병렬 통합 테스트의 환경 지연 오판 방지

**합격 조건**

- 모든 자동화 테스트와 파일 크기·오프라인·빌드 검사가 통과합니다.
- 브라우저 기동 권한 오류가 있으면 제품 결함으로 보고하지 않고 정확한 오류와 미검증 수동 게이트를 기록합니다.
- 변경 날짜와 검증 결과가 문서에 남습니다.

## 향후 실행할 명령과 예상 결과

```bash
npm test -- --run tests/learning/evidenceReducer.test.ts tests/domain/evidence.test.ts tests/components/CompletionScreen.test.tsx tests/components/EvidenceScreen.test.tsx
# 예상: P0 성취 상태, 자연스러운 조사, 역할별 낱말 옵션 테스트가 모두 PASS

npm test -- --run tests/components/FoldingScreen.test.tsx tests/components/DiagnosisScreen.test.tsx tests/components/CubeFoldViewer.test.tsx
# 예상: 제목 포커스, 어린이용 방향 문구, 장면 중심 카메라 테스트가 모두 PASS

npm test -- --run tests/app/AppShell.test.tsx tests/app/AppFlow.test.tsx
# 예상: 진행 표시와 미션 재선택 회귀 테스트가 모두 PASS

npm run lint
npm run typecheck
npm test -- --run
npm run check:file-size
npm run check:offline-boundary
npm run build
# 예상: ESLint·TypeScript·전체 Vitest·정책 검사·Vite build가 exit code 0

npm run test:e2e
# 예상: assertion 결과와 macOS 브라우저 기동 권한 결과를 별도로 기록
```

## 향후 커밋 단계

구현 중에는 커밋하지 않습니다. 사용자가 별도로 승인한 경우에만 다음 순서로 커밋합니다.

1. `fix: make achievement evidence mission-aware`
2. `fix: clarify evidence language for young learners`
3. `fix: restore heading focus after fold transition`
4. `fix: improve diagnosis labels and 3d framing`
5. `fix: make completion review mobile-friendly`
6. `feat: add learner stage progress and mission switcher`
7. `docs: record student ux improvement verification`

각 커밋 전에는 해당 Task의 좁은 테스트를 실행하고, 마지막 커밋 전에는 전체 검증 명령을 다시 실행합니다. 푸시·Pages 배포·공개 URL 검증은 별도 사용자 지시가 있을 때만 진행합니다.

## 완료 정의

- P0 상태 오표시가 사라지고 해당 없음이 명확히 표시됩니다.
- 근거 문장이 어린이에게 자연스럽고 역할별 낱말 선택이 명확합니다.
- 접기 단계 제목 포커스, 3D 중심/크기, 진단 방향 문구가 개선됩니다.
- 375px·200%에서 비교표와 완료 요약을 읽을 수 있습니다.
- 단계 진행 표시와 미션 재선택이 키보드로 작동합니다.
- `gi-pulse`, reduced-motion, 2D 대체, 개인정보·오프라인 경계, 업데이트 내역이 유지됩니다.
- 자동화·정책·빌드 검증 결과가 기록되고 VoiceOver 구현·검증 범위 제외가 명시됩니다.
