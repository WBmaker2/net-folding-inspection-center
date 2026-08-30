# Elementary Web App UX Improvement Plan

- 작성일: 2026-08-30
- 대상: `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center`
- 요청: 초등학생 관점의 교육용 웹앱 점검 및 개선
- 운영 모드: `full`
- 선행 문서: `work/elementary-webapp-ux-bootstrap.md`, `work/elementary-webapp-ux-audit.md`, `design-system/MASTER.md`
- 계획 작성 시점 상태: 계획을 확정한 뒤 구현을 시작할 예정이었고, 당시에는 소스·설정·테스트 파일을 수정하지 않았다. 현재 구현 결과와 검증은 문서 하단 `구현 결과와 남은 검증`에 기록되어 있다.

## 목표

1. 3–6학년 학습자가 현재 해야 할 일을 한 번에 이해하도록 예측 화면의 피드백과 단계 신호를 정리한다.
2. 모바일 320/375px에서 푸터·업데이트 내역·표가 콘텐츠 흐름을 방해하지 않도록 레이아웃을 고친다.
3. `F1`·좌표 같은 내부 도메인 표현을 판정 로직과 분리하고, 화면에는 `1번 면`·방향·자리 언어를 사용한다.
4. tracking 진단이 실제 방향과 목표 방향을 보여 주는 경우에만 기록되도록 상태와 증거를 일치시킨다.
5. 기존 학습 목표, 무점수 판정, 개인정보·안전 경계, `gi-pulse`, reduced-motion, 업데이트 내역, 키보드·스크린 리더 DOM 계약을 보존한다.

## 아키텍처와 경계

- 도메인 진실: `src/domain/net/**`, `src/domain/learning/**`, `src/content/missions/*.json`의 FaceId·GridPoint·판정 함수는 변경하지 않는다.
- 표현 계층: `src/content/learnerCopy.ts`에서 질문의 `F1` 토큰을 어린이용 `1번 면`으로 표시하며 canonical 데이터는 그대로 둔다.
- 공통 라벨: `src/components/net2d/faceLabels.ts`에 FaceId·면 번호 표시 함수를 추가해 완료·근거·수리 화면이 같은 규칙을 사용한다.
- 상태 피드백: `PredictionScreen`은 순서·방향 touched 상태를 별도로 추적하고, 기준면 중복 윗면 시도에 inline error를 낸다.
- 안전한 진단: `DiagnosisScreen`은 tracking decoration의 실제·목표 방향이 유효할 때만 기록하며, 불완전 컨텍스트는 기존 domain evaluator와 함께 차단한다.
- 시각 계층: `src/styles/layout.css`, `src/styles/net2d.css`, `src/styles/repair.css`는 light theme·44px control·reduced-motion 규칙을 유지한다.

## 기술 스택

- Vite 8, React 19, TypeScript strict, Vitest + Testing Library, Playwright 설정은 기존 버전을 유지한다.
- 새 패키지 설치 없음.
- 자동 detector: `/Users/kimhongnyeon/.codex/skills/impeccable/scripts/detect.mjs`를 최종 변경 후 한 번 실행한다.
- 브라우저 증거: Playwright 실행 파일이 준비된 경우에만 실행한다. 현재는 `chrome-headless-shell` 누락으로 정식 브라우저 검증이 차단되어 있으며 설치하지 않는다.

## 제품 사양 연결

| 설계 요구 | 구현 연결 | 합격 조건 |
| --- | --- | --- |
| 학습 목표 | 예측→접기→근거 흐름, 현재 단계 문장 | 각 화면의 h1·intro·primary CTA가 다음 행동을 설명 |
| 기존 앱과의 차별성 | 점수·순위 없는 검수 증거, 방향·무늬 비교 | 점수/순위/타이머/경쟁 카피가 새로 생기지 않음 |
| 핵심 학습 흐름 | Prediction touched feedback, Folding 보조 안내, Diagnosis evidence | 잘못된 입력 후 원인과 회복 방법이 해당 조작 아래에 표시 |
| 콘텐츠·판정 모델 | canonical FaceId/GridPoint/answer 유지 | 기존 domain 테스트와 catalog 검증 통과 |
| 접근성 | 44px, focus-visible, aria-live/label, keyboard | Testing Library 키보드 시나리오와 DOM 검사 통과; VoiceOver는 제외 |
| 개인정보·안전 | sessionStorage opt-in, model boundary | `sessionStorage` 구현은 유지하되 학습자에게는 쉬운 문장으로만 설명; 외부 전송 없음 |
| MVP 범위 | 라벨·피드백·모바일·진단 일치만 수정 | 신규 기능·회원·점수·음성·네트워크 없음 |
| 완료 기준 | lint/typecheck/unit/build/static checks + 가능한 브라우저 | 기존 테스트 회귀 없음, 320/375 레이아웃 CSS 계약 확인, detector 0건 또는 검토 기록 |

## 글로벌 제약

- 한 소스 파일은 500줄 미만으로 유지한다.
- 중요한 학습 CTA 하나만 `gi-pulse`; disabled·선택 버튼·업데이트 내역에는 pulse를 붙이지 않는다.
- `@media (prefers-reduced-motion: reduce)`에서는 pulse·전환이 정적 강조선으로 대체된다.
- light mode와 기존 색·무늬·번호 중복 인코딩을 유지한다.
- 기존 untracked `output/`, `.playwright-cli/`, bootstrap 문서는 읽기 전용으로 보존하고 커밋 대상에 넣지 않는다.
- 코드·문장·테스트는 한국어 학습자 표현을 사용하고 domain ID는 테스트 fixture 안에서만 사용한다.
- 구현 중 커밋·푸시·배포·HVC 등록·브라우저 설치를 실행하지 않는다.

## 예상 파일 구조와 책임

```text
src/
  app/AppShell.tsx                         footer/privacy copy
  content/learnerCopy.ts                   learner-facing FaceId token formatting
  components/net2d/faceLabels.ts           shared face label formatting
  components/net2d/RepairTargetGrid.tsx    direction-first candidate labels
  screens/IntakeScreen.tsx                 learner copy in mission cards
  screens/PredictionScreen.tsx             touched errors and step guidance
  screens/DiagnosisScreen.tsx              validated tracking evidence copy
  screens/EvidenceScreen.tsx               learner-facing pair status
  screens/CompletionScreen.tsx              learner-facing evidence summary
  styles/layout.css                         mobile footer sizing
  styles/net2d.css                          prediction step guidance styles
  styles/repair.css                         direction-first target styling
tests/
  content/learnerCopy.test.ts              token conversion contract
  components/PredictionScreen.test.tsx     duplicate/top and touched-error flow
  components/CompletionScreen.test.tsx     no raw IDs/coordinates
  components/EvidenceScreen.test.tsx       pair status copy
  components/RepairScreen.test.tsx         target label copy and data coordinates
  app/AppShell.test.tsx                    privacy helper wording/layout contract
```

## 작업별 계획과 TDD 순서

### 작업 1 · 모바일 푸터와 개인 저장 안내

Files:

- `tests/app/AppShell.test.tsx`: footer helper text에 `sessionStorage`가 노출되지 않고 `이 탭에 잠시 저장`이 보이는 테스트; `layout.css`의 mobile `flex-basis: auto` 계약 테스트.
- `src/app/AppShell.tsx`: 쉬운 개인정보 문장으로 변경.
- `src/styles/layout.css`: 520px 이하 `.footer-message`, `.footer-tools`에 `flex-basis: auto`, `min-height: 0` 추가.

Interfaces:

- `AppShellProps`와 `onStorageOptInChange` 타입은 유지.
- CSS contract: `.footer-tools`는 mobile에서 콘텐츠 높이를 따르며 `.update-history-trigger`는 footer flow에 남는다.

TDD sequence:

1. 실패 테스트: helper가 `sessionStorage`를 말하지 않고 쉬운 저장 경계를 말해야 한다는 assertion, mobile flex rule assertion을 먼저 추가.
2. 최소 구현: AppShell 문장과 두 CSS 규칙만 수정.
3. 통과 테스트: AppShell suite와 `npm run lint`, `npm run typecheck` 실행.

### 작업 2 · 어린이용 면·질문·완료 라벨

Files:

- `tests/content/learnerCopy.test.ts`: `F1`, `F3`가 `1번 면`, `3번 면`으로 바뀌고 일반 문자열·숫자 범위가 보존되는 실패 테스트.
- `src/content/learnerCopy.ts`: `formatFaceReferences(text: string): string`와 `formatFaceId(faceId: FaceId): string`을 제공.
- `src/screens/IntakeScreen.tsx`, `src/screens/PredictionScreen.tsx`: mission question 표시를 formatter 경유.
- `src/components/net2d/faceLabels.ts`: `faceIdLabel(faceId: FaceId): string` 추가.
- `src/screens/EvidenceScreen.tsx`, `src/screens/CompletionScreen.tsx`: pair, diagnosis, repair, predicted top 기록을 formatter 경유.

Interfaces:

- `formatFaceReferences`는 canonical JSON을 변형하지 않고 렌더 문자열만 반환.
- `faceIdLabel`은 `FaceId`를 `${number}번 면`으로 표시.

TDD sequence:

1. 실패 테스트: 질문·상태·비교표에 raw `/\bF[1-6]\b/` 및 좌표가 나타나지 않는 assertion을 추가.
2. 최소 구현: formatter와 화면 연결, error type은 `겹침`·`빈 면`·`무늬 방향`으로 learner copy map을 둔다.
3. 통과 테스트: content, Evidence, Completion, AppFlow 관련 suite를 실행하고 domain snapshot은 변경하지 않는다.

### 작업 3 · 예측 화면의 순차 피드백

Files:

- `tests/components/PredictionScreen.test.tsx`: 같은 기준면을 윗면으로 눌렀을 때 inline error, 순서 touched 전 조기 error 없음, 특정 방향 touched 전 다른 필드 error 없음.
- `src/screens/PredictionScreen.tsx`: `topSelectionError`, `orderInteracted`, `directionInteracted: Set<FaceId>` 상태를 추가하고 입력 성공 시 해당 오류를 지움.
- `src/styles/net2d.css`: inline error와 current step 안내가 44px control·focus-visible을 해치지 않는 최소 스타일.

Interfaces:

- `PredictionScreenProps` 및 `PredictionRecord`는 변경하지 않는다.
- `selectTop`, `addFaceToOrder`, `setDirection`은 기존 domain callback 계약을 유지한다.

TDD sequence:

1. 실패 테스트: base=1, top=1 클릭 후 오류, base만 선택 시 alert 0건, face 2 방향만 touched 시 face 2 오류만 확인.
2. 최소 구현: 로컬 UI 상태와 조건부 메시지만 추가; 제출 가능 조건·record shape는 그대로 둔다.
3. 통과 테스트: PredictionScreen 전체, integrated AppFlow prediction 단계, keyboard path.

### 작업 4 · tracking 진단의 증거 일치

Files:

- `tests/components/DiagnosisScreen.test.tsx`: 유효한 decoration에서 실제/목표 방향 문장 노출, 누락 decoration에서 `진단 확인` callback 미호출 및 회복 문구 확인.
- `src/screens/DiagnosisScreen.tsx`: `evaluationUnavailableForTracking` 상태에 맞는 안내와 제출 차단을 명확히 연결하고, 유효 결과는 `실제 방향 · 목표 방향 · 비교`로 보여 준다.
- `src/styles/diagnosis.css`: 비교 문장을 읽기 쉬운 inline evidence panel로 유지.

Interfaces:

- `DiagnosisScreenProps.decoration?: DecorationOrientationResult` 타입을 유지.
- `onSubmit`은 context-valid diagnosis에만 호출.

TDD sequence:

1. 실패 테스트: undefined/shape-invalid decoration에서 callback 0회와 안내 문구, valid decoration에서 방향 문구.
2. 최소 구현: render guard와 feedback copy만 조정; `evaluateDiagnosis` domain은 변경하지 않는다.
3. 통과 테스트: DiagnosisScreen, AppFlow tracking/collision regression.

### 작업 5 · 수리 후보와 접기 보조 보기의 관계 언어

Files:

- `tests/components/RepairScreen.test.tsx`: target button accessible name와 visible label에 좌표가 없고 방향 문장이 있으며 `data-grid-x/y`는 유지.
- `src/components/net2d/RepairTargetGrid.tsx`: visible strong와 aria-label을 `relativeText` 기반 방향 언어로 교체; coordinate data attributes는 유지.
- `src/screens/FoldingScreen.tsx`: eyebrow와 보조 설명을 `3D 보조 보기`·`면 관계 표` 역할로 정리.
- `src/styles/repair.css`, 필요한 경우 `src/styles/net2d.css`: 방향 label wrapping과 mobile overflow만 조정.

Interfaces:

- `RepairTargetGridProps`와 `GridPoint` callback은 유지.
- 2D 관계 표는 3D보다 권위라는 기존 설계 원칙을 유지.

TDD sequence:

1. 실패 테스트: `/\(-?\d+, -?\d+\)/`가 사용자 텍스트에 없고 방향 문장이 존재한다는 assertion.
2. 최소 구현: label 텍스트만 교체하고 hidden data attributes는 보존.
3. 통과 테스트: RepairScreen, FoldingScreen, responsive CSS contract.

## 향후 실행할 명령과 예상 결과

아래 명령은 계획 이후 구현·검증 단계에서 실행할 항목이며 이 계획 작성 중에는 실행하지 않는다.

```sh
npm run lint
# 예상: ESLint 오류 0건

npm run typecheck
# 예상: TypeScript 오류 0건

npm test -- --run
# 예상: 기존 단위/컴포넌트 테스트와 새 learner-copy/UX 테스트 전체 통과

npm run build
# 예상: dist 생성 및 Vite production build 성공

node scripts/check-file-size.mjs
# 예상: 500줄 이상 소스 파일 없음

node scripts/check-offline-boundary.mjs
# 예상: 외부 네트워크 경계 위반 없음

node /Users/kimhongnyeon/.codex/skills/impeccable/scripts/detect.mjs --json src/screens src/components src/app src/styles
# 예상: 새 UI detector finding 0건; 결과가 있으면 false positive 여부를 audit에 기록

npx playwright test --project=chromium
# 예상: 브라우저 실행 파일이 준비된 환경에서 learner-flow/accessibility/responsive/e2e 통과
# 현재 환경에서는 chrome-headless-shell 누락으로 차단될 수 있으며 브라우저를 설치하지 않는다.
```

## 수동 검증 시나리오와 합격 조건

- 320px/375px: 페이지 가로 스크롤 없음, footer tools의 큰 빈 공간 없음, 업데이트 내역 버튼이 footer 안에서 보임.
- 키보드: 각 NetGrid에서 화살표로 면을 이동하고 Enter로 선택; Tab focus ring이 사라지지 않음; duplicate top 선택은 live/alert 메시지로 회복.
- 스크린 리더 DOM: h1 focus, `aria-labelledby`, `aria-live`, fieldset legend, 버튼 accessible name을 Testing Library로 확인. VoiceOver 실행은 제외.
- learner language: 화면 텍스트에 `F1`–`F6` 또는 좌표 괄호가 기본 노출되지 않음; domain fixture와 `data-grid-*`는 허용.
- privacy/safety: 저장 checkbox 기본 해제, opt-in 전 저장 callback 없음, model boundary 문장 유지, 외부 요청 없음.
- motion: reduced-motion에서 `gi-pulse`가 정적 강조선으로 낮아지고 학습 CTA는 하나만 강조.

## 롤백과 실패 처리

- 각 작업은 한정된 파일과 테스트를 함께 변경하며, 실패 시 해당 작업의 변경만 되돌리고 도메인 판정 파일은 복원 대상에서 제외한다.
- 브라우저 실행 파일 누락이 반복되면 설치를 시도하지 않고 정식 브라우저 결과를 `blocked`로 보고하며 static/unit evidence를 별도 표시한다.
- 같은 종류의 검증 실패가 세 번 반복되면 추가 시도 대신 사용자에게 중단·대안(로컬 static 검사 또는 브라우저 설치 승인)을 협의한다.

## 구현 결과와 남은 검증

- 작업 1–5를 계획한 파일에 구현했습니다. canonical mission JSON, 도메인 판정 타입·함수, `gi-pulse`, reduced-motion, light theme, opt-in 저장 경계는 유지했습니다.
- 추가된 `src/content/learnerCopy.ts`와 `src/components/net2d/faceLabels.ts`로 화면용 면 이름을 한 곳에서 관리하고, 질문·예측·근거·수리·완료 경로에 연결했습니다.
- 모바일 단계 게이트, 중복 윗면 오류, touched 기반 오류, tracking 방향 비교, 방향 중심 수리 후보, 접기 보조 보기 안내, 2026-08-30 업데이트 기록을 반영했습니다.
- TDD 결과: `npm test -- --run` 32개 파일·265개 테스트 통과, `npm run lint`, `npm run typecheck`, `npm run build`, file-size/offline-boundary/diff-check 통과.
- in-app Playwright에서 320×800·375×812·1280×720 가로 넘침 없음과 footer/update-history 흐름을 확인했습니다. 정식 CLI Playwright는 `chrome-headless-shell` 누락으로 blocked이며 브라우저 설치는 실행하지 않았습니다.
- 남은 선택 작업은 힌트 패널을 어린이용 문장으로 직접 노출할지 결정하는 콘텐츠 작업과, 브라우저 실행 파일이 제공된 환경에서 정식 Playwright를 다시 실행하는 일입니다. 이 작업들은 현재 MVP의 P0/P1 차단 사항이 아닙니다.

## 향후 커밋 단계(실행하지 않음)

1. 계획·감사 문서와 구현 변경을 검토하고 `git diff --check` 통과.
2. 테스트·lint·typecheck·build·file-size·offline-boundary 결과를 확인.
3. UX 개선 단위별로 커밋 메시지를 만든다: `fix(ux): clarify learner feedback and mobile flow`.
4. 사용자가 별도로 승인한 경우에만 push·배포·공개 URL 검증을 수행한다.

## 실제 릴리스 결과

- 구현 커밋: `de53d0f` (`fix(ux): clarify learner feedback and mobile flow`)
- 원격: `main` push 완료
- GitHub Actions: [33311820565](https://github.com/WBmaker2/net-folding-inspection-center/actions/runs/33311820565) `build`·`deploy` 성공
- 공개 주소: [https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/)
- HVC 등록: 실행하지 않음
