# Elementary Webapp UX Orchestrator: Language and Simulation Plan

## Goal

`전개도 포장 검수소`의 이번 보완 범위를 새로 추가된 두 기능으로 제한합니다.

1. **단어·문장 표현 검사**: 초등학교 5~6학년 학습자가 화면의 안내, 오류, 상태, 근거 문장을 한 번에 읽고 다음 행동을 알 수 있도록 표현을 구체화합니다. 수학 용어(면, 모서리, 맞은편, 겹침, 접는 방향)는 유지하고, 내부 면 ID(`F1`~`F6`)는 학습자 화면에 노출하지 않습니다.
2. **시뮬레이션 검사 2단계**: 접기 시뮬레이션에서 학습자가 `한 번에 한 변수만 바꾸기 → 관찰 → 설명 → 되돌리기`를 수행할 수 있는지 검증하고, 명시적인 초기화 행동을 추가합니다. 3D 장면은 보조 시각화이며 판정 권위는 기존 접기 엔진과 2D 관계 표에 둡니다.

이번 계획은 기존 학습 목표(전개도의 면 관계와 접는 순서를 예측하고, 결과를 관찰한 뒤 근거 문장으로 설명하기), 기존 앱과의 차별성(점수 대신 근거와 재시도 중심), 단계 흐름(`미션 고르기 → 예측 → 접기 → 진단/수리 → 근거 → 완료`), 콘텐츠·판정 모델, 접근성·개인정보·안전 경계를 보존하면서 두 영역만 개선하는 것을 완료 목표로 삼습니다.

## Architecture

- **판정 권위**: `src/domain/net/foldEngine.ts`의 `FoldSequence`/`FoldSnapshot`과 기존 `FaceRelationTable`을 계속 사용합니다. 새 UI는 판정 로직이나 미션 정답을 복제하지 않습니다.
- **시뮬레이션 상태**: `FoldingScreen`의 `stepIndex`가 유일한 접기 단계 변수입니다. `singleFaceMode`와 3D 시점 선택은 모델을 바꾸지 않는 보기 옵션으로 분리합니다.
- **관찰 채널**: 2D 관계 표와 `LiveRegion`의 문장을 항상 제공하고, WebGL Canvas는 `aria-hidden="true"`인 보조 보기로 유지합니다. WebGL 미지원 시에도 동일한 2D 학습 경로가 동작해야 합니다.
- **설명 채널**: `EvidenceScreen`의 선택형 문장 생성 모델(`buildEvidenceSentence`)과 기존 기하 용어 집합을 유지합니다. 표현 개선은 표시 문구와 도움말에만 적용하고, 저장되는 `EvidenceSubmission` 값은 변경하지 않습니다.
- **초기화 계약**: `FoldingScreen`에 `stepIndex`를 0으로 되돌리는 명시적 버튼을 추가합니다. 초기화는 `onStepChange(0)`을 호출하고, 현재 접기 결과를 지우거나 미션 판정을 완료 처리하지 않습니다.
- **접근성 계약**: native range, 버튼, checkbox, `aria-live`/`role="status"`, 표의 캡션을 유지합니다. 새 버튼은 고유한 accessible name을 사용하고, 주요 단계 버튼 하나만 `gi-pulse`를 유지합니다. VoiceOver/TTS/음성 녹음 기능은 추가하거나 검증하지 않습니다.

## Tech Stack

- React 19 + TypeScript 6 + Vite 8
- Vitest 4 + Testing Library + `user-event`
- `@react-three/fiber`/Three.js는 기존 보조 보기만 사용
- 별도 패키지 설치 없음. 기존 `node_modules`와 `package-lock.json`을 사용합니다.

## Spec

### A. 단어·문장 표현 검사

검사 기준은 `references/child-language-rubric.md`의 구체성·행동 지시·비난 없는 오류 안내·일관된 용어입니다.

| 파일 | 표현 변경 | 합격 조건 |
| --- | --- | --- |
| `src/screens/FoldingScreen.tsx` | `슬라이더나 버튼으로...`를 `막대를 움직이거나 버튼을 눌러...`로 바꾸고 초기화 버튼을 `처음부터 다시 보기`로 표시 | 초등 학습자가 조작 방법과 결과를 행동 문장으로 이해하며, range label은 `접기 단계`로 유지 |
| `src/components/net3d/CubeFoldViewer.tsx` | 시점 그룹을 `보기 시점 선택`으로, 버튼을 `정면에서 보기`, `오른쪽에서 보기`, `위에서 보기`, `기준면 중심으로 보기`로 표시 | `aria-label`과 visible label이 동일하고 `aria-pressed`가 선택 상태를 반영 |
| `src/screens/EvidenceScreen.tsx` | 도움말·빈 미리보기 문장을 짧고 구체적인 `...낱말이에요`/`...나타나요` 표현으로 조정 | `관계를 나타내는 낱말`과 `까닭을 나타내는 낱말`의 역할이 보존되고 저장 payload가 동일 |
| `src/screens/RepairScreen.tsx` | `다른 정보는 그대로 두세요`를 `색과 무늬는 그대로 두세요`로 구체화 | 한 면 위치만 바꾸고 시각 정보는 유지해야 한다는 제약이 명확 |
| `src/app/useLearningController.ts` | 기술적인 `저장소 상태`를 `브라우저 저장 설정`으로 바꿈 | 개인정보 경계(선택한 진행만 이 탭에 임시 저장, 탭 종료 시 삭제)를 바꾸지 않음 |
| `src/content/changelog.ts` | 현재 날짜(2026-08-30)의 두 영역 개선 내역을 한 건 추가 | 업데이트 내역 버튼에서 날짜와 변경 요지가 읽힘 |

`src/content/missions/*.json`의 내부 질문/힌트에 있는 `F1`~`F6`은 콘텐츠 원본으로 유지하되, 학습자에게 표시되는 질문은 기존 `formatFaceReferences`를 통해 `n번 면`으로 변환되는지 검사 문서에 기록합니다. 이번 범위에서는 음성, 자동 읽기, 다크 모드, 개인정보 수집을 추가하지 않습니다.

### B. 시뮬레이션 검사 2단계

시뮬레이션은 자동 시간 애니메이션이 아니라 학습자가 직접 한 단계씩 조작하는 결정적 모델입니다.

- **한 변수씩 바꾸기**: `stepIndex`를 range 또는 `이전 접기`/`다음 면 접기`로 한 칸씩 변경합니다. `singleFaceMode`와 카메라 시점은 관찰 보조 옵션이며 접기 결과를 변경하지 않습니다.
- **관찰**: `0 / 5면 접힘` 형식의 상태, `LiveRegion` 문장, 2D 관계 표의 `아직 접지 않음`/방향/맞은편 정보를 함께 확인합니다.
- **설명**: 단계 완료 후 기존 진단·근거 문장 단계로 이동하며, 이번 작업에서는 설명 판정 모델을 변경하지 않습니다.
- **되돌리기/초기화**: `처음부터 다시 보기`로 0단계로 돌아가며 `접기 전 상태로 돌아왔습니다.`를 status로 알립니다. 0단계에서는 버튼이 disabled가 됩니다.
- **모션·안전**: `prefers-reduced-motion`이면 3D 장면이 snap/instant 모드로 표시되고, 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않는다는 기존 경계 문구를 유지합니다.
- **모바일·키보드**: 320px 폭에서도 컨트롤이 겹치지 않고, Tab/Shift+Tab 순서로 range·이전·초기화·다음·보기 옵션을 조작할 수 있어야 합니다.

## Global Constraints

- 이번 실행에서 검사·수정할 파일은 위 표와 직접 연결된 소스·테스트·검사 문서뿐입니다. 진단 판정, 수리 알고리즘, 미션 콘텐츠 정답, 저장 스키마, 라우팅을 변경하지 않습니다.
- authored source/test file은 500줄 미만으로 유지합니다. 새 로직은 기존 컴포넌트 경계를 재사용하고 거대 파일로 합치지 않습니다.
- 교육 단계의 핵심 버튼 `다음 면 접기`, `근거 확인`, `수리 확인` 등 기존 `gi-pulse` 정책을 유지합니다. 초기화·보기 버튼에는 pulse를 부여하지 않습니다.
- `prefers-reduced-motion`에서 애니메이션을 강제하지 않습니다.
- 업데이트 내역 버튼/날짜 기록을 유지하고 이번 변경을 changelog에 기록합니다.
- 브라우저 자동화 CLI가 브라우저 바이너리 부재로 실행되지 않으면 의존성을 설치하지 않고, 가능한 in-app 브라우저 수동 증거와 Vitest 결과를 분리해 보고합니다.
- 커밋·푸시·배포·HVC 등록은 이 계획의 실행 단계에 포함하지 않습니다.

## 예상 파일 구조와 책임

```text
src/
  app/useLearningController.ts       # 저장 실패 안내 문구만 조정
  components/net3d/CubeFoldViewer.tsx # 시점 버튼 학습자 표현과 accessible name
  content/changelog.ts                # 날짜별 변경 기록
  screens/FoldingScreen.tsx           # 단계 조작, 초기화 버튼, 관찰 안내
  screens/EvidenceScreen.tsx          # 문장 선택 도움말과 빈 상태 문구
  screens/RepairScreen.tsx            # 수리 제약 문구
tests/
  components/FoldingScreen.test.tsx  # 단계·초기화·관찰·키보드 계약
  components/CubeFoldViewer.test.tsx  # 시점 이름·pressed 상태 계약
  components/EvidenceScreen.test.tsx  # 문장 UI 표현과 payload 보존
  components/RepairScreen.test.tsx    # 수리 제약 표현
  app/useLearningController.test.tsx  # 저장 실패 안내 표현(기존 테스트 확장)
work/
  elementary-webapp-ux-bootstrap-language-simulation.md # Stage 0 결과
  elementary-webapp-ux-language-candidates.md            # 후보 인벤토리
  elementary-webapp-ux-language-audit.md                 # 문구 검사 결과
  elementary-webapp-ux-simulation-decision.md             # 시뮬레이션 판정 ledger
  elementary-webapp-ux-simulation-test.md                # 실행 증거
  elementary-webapp-ux-language-simulation-report.md     # 최종 범위 보고
```

## 작업별 Files·Interfaces

### 1. 표현 기준과 후보 감사 기록

- **Files**: `work/elementary-webapp-ux-language-audit.md`, `work/elementary-webapp-ux-language-candidates.md`
- **Interfaces**: `formatFaceReferences(text: string): string`, `faceNumber(face): string`, `buildEvidenceSentence(...)`
- **검사 대상**: 위 Spec 표의 모든 표시 문자열, 원본 `F1` 노출 여부, 오류 문구의 행동 지시, 근거 문장 payload 불변성
- **합격 조건**: 각 후보가 `수정`, `유지`, `학습자 비노출` 중 하나로 근거와 함께 분류되고 미완성 자리표시자 표현이 없음

### 2. 시뮬레이션 결정 ledger

- **Files**: `work/elementary-webapp-ux-simulation-decision.md`
- **Interfaces**: `FoldSequence`, `FoldSnapshot`, `FoldingScreenProps.onStepChange`, `CubeFoldViewerProps`
- **검사 대상**: 변수 경계, 관찰 채널, 설명 연결, 초기화/되돌리기, reduced motion, WebGL fallback, 모바일/키보드
- **합격 조건**: 각 정책 질문에 `implement` 또는 `not-needed`와 근거가 있으며 새 시뮬레이션 엔진 추가가 없음

### 3. 실패 테스트 먼저 작성

- **Files**: `tests/components/FoldingScreen.test.tsx`, `tests/components/CubeFoldViewer.test.tsx`, `tests/components/EvidenceScreen.test.tsx`, `tests/components/RepairScreen.test.tsx`, 해당 저장 컨트롤러 테스트
- **Interfaces**: visible text, `role="button"`, `aria-label`, `aria-pressed`, `role="status"`, `onStepChange`
- **합격 조건**: 새 기대값이 구현 전 실패하고, 실패가 문구/초기화 계약에 직접 연결됨. 기존 회귀 테스트는 변경하지 않은 상태로 모두 유지

### 4. 최소 구현

- **Files**: `src/screens/FoldingScreen.tsx`, `src/components/net3d/CubeFoldViewer.tsx`, `src/screens/EvidenceScreen.tsx`, `src/screens/RepairScreen.tsx`, `src/app/useLearningController.ts`, `src/content/changelog.ts`
- **Interfaces**: 새 `resetFold` 내부 함수는 `setFoldStep(0)`만 호출하며, 기존 `FoldingScreenProps` 외부 계약을 확장하지 않음
- **합격 조건**: 새 테스트 통과, 저장/판정 payload 불변, source 파일 500줄 미만, 다른 학습 단계 문자열/동작 변경 없음

### 5. 통합 검증과 증거

- **Files**: `work/elementary-webapp-ux-simulation-test.md`, `work/elementary-webapp-ux-language-simulation-report.md`
- **Interfaces**: Playwright in-app browser DOM, Vitest output, `npm run typecheck`, `npm run lint`, `npm run build`
- **합격 조건**: 320px/375px/1280px에서 overflow 없음, cold start→예측→접기→1단계→초기화→완료 경로가 관찰 가능, 콘솔 error 없음, 자동화 제한은 별도 명시

## 체크박스 단계 (TDD 순서)

- [ ] `work/elementary-webapp-ux-language-simulation-plan.md`를 기준 문서로 고정하고, 후보 인벤토리에서 이번 두 영역의 수정/유지 목록을 확정합니다.
- [ ] `work/elementary-webapp-ux-language-audit.md`에 기존 표현과 변경 표현, 용어 사전, `F1` 변환 결과, 제외 범위를 기록합니다.
- [ ] `work/elementary-webapp-ux-simulation-decision.md`에 시뮬레이션 정책 질문별 결정을 기록합니다.
- [ ] 새 문구·초기화·시점 이름을 검증하는 테스트를 먼저 추가하고 `npm test -- --run <target>`이 의도대로 실패하는지 확인합니다.
- [ ] `FoldingScreen`에 `처음부터 다시 보기` 버튼과 초기화 status를 최소 구현하고, 표현 문구를 표의 파일별 계약에 맞게 수정합니다.
- [ ] `CubeFoldViewer`의 네 시점 버튼 이름을 학습자 행동 문장으로 바꾸고 `aria-label`/`aria-pressed`를 동기화합니다.
- [ ] `EvidenceScreen`, `RepairScreen`, `useLearningController`의 표현만 구체화하고 도메인 값·저장 값은 그대로 둡니다.
- [ ] `src/content/changelog.ts`에 2026-08-30 날짜와 두 영역 개선 내역을 추가합니다.
- [ ] 동일 테스트를 다시 실행해 통과시키고 `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:file-size`, `npm run check:offline-boundary`를 실행합니다.
- [ ] in-app 브라우저에서 320px, 375px, 1280px을 확인하고, 키보드 Tab/Shift+Tab, reduced-motion, WebGL fallback, 한 단계 진행·관찰·초기화를 기록합니다. VoiceOver는 실행하지 않습니다.
- [ ] 표현 후보 재검색, 설계 요구사항 대조, 타입·명명 일관성, 파일 크기, untracked 산출물 범위를 자체 검토하고 `work/elementary-webapp-ux-language-simulation-report.md`를 완성합니다.

## 향후 실행할 명령과 예상 결과

아래 명령은 계획 실행 시에만 사용하며, 계획 작성 단계에서는 실행하지 않습니다.

```bash
npm test -- --run tests/components/FoldingScreen.test.tsx tests/components/CubeFoldViewer.test.tsx tests/components/EvidenceScreen.test.tsx tests/components/RepairScreen.test.tsx
# Expected: 새 초기화·문구 계약을 포함한 대상 테스트가 모두 passed

npm run lint
# Expected: ESLint 0 errors

npm run typecheck
# Expected: tsc -b 성공, diagnostics 0

npm run build
# Expected: Vite production build 성공, dist 생성

npm run check:file-size
# Expected: 500줄 이상 authored source/test 파일 없음

npm run check:offline-boundary
# Expected: 외부 네트워크/원격 저장 로직 위반 없음

npm run dev -- --host 127.0.0.1 --port 4177
# Expected: local learner app at http://127.0.0.1:4177/
```

브라우저 바이너리가 없는 환경에서는 `npm run test:e2e`를 억지로 설치하지 않고 `work/elementary-webapp-ux-simulation-test.md`에 차단 원인과 in-app 브라우저 증거를 분리 기록합니다.

## 향후 커밋 단계

이번 실행에서는 커밋하지 않습니다. 이후 사용자가 명시적으로 릴리스를 승인할 때만 다음 순서를 사용합니다.

1. `git diff --check`와 대상 테스트/정적 검증 결과를 확인합니다.
2. `git add`에는 두 영역의 소스·테스트·`work/` 문서만 포함하고 `.playwright-cli/`, `.playwright-mcp/`, `output/` 등 기존 산출물은 제외합니다.
3. `git commit -m "fix: improve learner language and folding simulation reset"`으로 단일 논리 변경을 커밋합니다.
4. `git push origin main` 후 CI/Pages 결과와 실제 공개 학습자 URL을 별도 확인합니다.
5. 커밋·푸시·배포가 모두 성공한 경우에만 URL, workflow run, 수동 acceptance를 최종 보고합니다.
