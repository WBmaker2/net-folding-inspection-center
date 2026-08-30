# Language and Simulation Improvement Report

## 범위

이번 실행은 사용자가 지정한 두 기능만 검토·개선했습니다.

1. 단어·문장 표현 검사
2. 시뮬레이션 검사 2단계

후보 인벤토리는 103개 파일·4,384개 문자열을 triage했고, 실제 학습자에게 보이는 두 영역만 수정했습니다.

전체 디자인 재설계, 진단·수리 판정 변경, 새 음성 기능, VoiceOver 검증, HVC는 실행하지 않았습니다. 커밋·푸시·배포는 구현 검토 세션과 분리한 릴리스 절차에서 확인합니다.

## 구현 결과

### 단어·문장 표현

- 접기 조작 안내를 `막대를 움직이거나 버튼을 눌러...`로 바꾸어 화면에서 보이는 조작 방법을 먼저 설명했습니다.
- 3D 시점 그룹과 버튼을 `보기 시점 선택`, `정면에서 보기`, `오른쪽에서 보기`, `위에서 보기`, `기준면 중심으로 보기`로 바꾸어 구현 용어인 “고정” 대신 학습자 행동을 표시했습니다.
- 근거 단계 도움말을 `첫 번째 낱말은 면의 관계, 두 번째 낱말은 그 까닭을 나타내요.`로, 빈 미리보기를 `면 두 개와 낱말 두 개를 고르면 문장이 나타나요.`로 바꾸었습니다.
- 수리 제약을 `한 면의 위치만 바꾸고, 색과 무늬는 그대로 두세요.`로 구체화했습니다.
- 저장 해제 실패 안내에서 내부 용어 `저장소`를 제거하고 `브라우저 저장 설정`을 확인하도록 안내했습니다.
- `src/content/changelog.ts`에 2026-08-30 개선 날짜와 내역을 추가했습니다.

### 시뮬레이션 2단계

- `FoldingScreen`에 `처음부터 다시 보기`를 추가했습니다. 단계가 0이면 disabled이고, 1~5단계에서 누르면 `stepIndex=0`, `onStepChange(0)`, `접기 전 상태로 돌아왔습니다.`가 함께 반영됩니다.
- `stepIndex`만 접기 모델 변수로 유지하고, `한 면씩 보기`와 3D 시점은 결과를 바꾸지 않는 보기 옵션으로 유지했습니다.
- 2D 관계 표·live status를 판정 권위로 유지하고, WebGL Canvas는 `aria-hidden` 보조 보기 및 fallback으로 유지했습니다.
- `gi-pulse`는 기존 핵심 진행 버튼에만 남기고 초기화·시점 버튼에는 추가하지 않았습니다.
- reduced-motion의 `instant`/`snap`, 실제 종이 안전성 비보장 문구, 모바일·키보드 구조를 유지했습니다.

## 변경 파일

### 소스

- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/screens/FoldingScreen.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/components/net3d/CubeFoldViewer.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/screens/EvidenceScreen.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/screens/RepairScreen.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/app/useLearningController.ts`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/src/content/changelog.ts`

### 테스트

- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/tests/components/FoldingScreen.test.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/tests/components/CubeFoldViewer.test.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/tests/components/EvidenceScreen.test.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/tests/components/RepairScreen.test.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/tests/learning/storageErrors.test.ts`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/tests/app/AppFlow.test.tsx`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/tests/components/UpdateHistoryDialog.test.tsx`

### 감사·계획·증거

- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/work/elementary-webapp-ux-language-simulation-plan.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/work/elementary-webapp-ux-language-audit.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/work/elementary-webapp-ux-simulation-decision.md`
- `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center/work/elementary-webapp-ux-simulation-test.md`

## 설계 요구사항 대조

| 설계 요구사항 | 대조 결과 |
| --- | --- |
| 학습 목표 | 예측→한 면씩 접기→관찰→근거 문장 흐름을 유지하고, 표현만 구체화했습니다. |
| 기존 앱과의 차별성 | 점수·순위 대신 관찰·근거·재시도 중심 구조를 유지했습니다. |
| 핵심 학습 흐름 | 단계 전환과 판정 권위를 변경하지 않고 접기 단계에서 초기화 행동만 보강했습니다. |
| 콘텐츠·판정 모델 | canonical geometry terms, `FoldSequence`, `EvidenceSubmission` payload를 변경하지 않았습니다. |
| 접근성 | native range, 키보드 순서, `role=status`, 표, `aria-pressed`, reduced-motion, 2D fallback을 검증했습니다. VoiceOver는 제외했습니다. |
| 개인정보·안전 | 개인 입력·원격 전송·저장 schema를 추가하지 않았고, 가상 접기 안전성 경계 문구를 유지했습니다. |
| MVP 범위 | 정육면체 접기·관계 확인·근거 설명 안에서만 개선했으며 새 엔진을 만들지 않았습니다. |
| 완료 기준 | 단위/정적 검증 통과, in-app learner path 통과, 320/375/1280px overflow 없음, CLI E2E는 브라우저 바이너리 부재로 차단됨을 분리 기록했습니다. |

## 검증 결과

- `npm test -- --run`: 32개 파일, 267개 테스트 통과
- 대상 TDD 테스트: 6개 파일, 67개 테스트 통과
- `npm run lint`: 성공, warning 0
- `npm run typecheck`: 성공
- `npm run build`: 성공 (번들 크기 경고는 기존 Vite 경고)
- `npm run check:file-size`: 성공, authored files 500줄 미만
- `npm run check:offline-boundary`: 성공
- `npm run test:e2e`: Chromium 실행 파일 부재로 차단; 설치하지 않음
- in-app 브라우저: 접기 초기화·관찰·시점 선택·근거 문장 생성·모바일·reduced-motion 확인

## 자체 검토

- 설계 문서의 학습·접근성·안전·MVP 요구사항을 위 표로 대조했습니다.
- 계획·감사·결정·보고 문서의 미완성 자리표시자 표현을 검색해 0건으로 확인했습니다.
- 변경 파일을 대상으로 TypeScript typecheck와 lint를 실행해 타입·명명 불일치가 없음을 확인했습니다.
- 신규 소스/테스트 파일은 없으며 기존 authored 파일 모두 500줄 미만입니다.
- `.playwright-cli/`, `.playwright-mcp/`, `output/` 기존 산출물은 수정·스테이징하지 않았습니다.

## 릴리스 경계

구현 검토 세션에서는 커밋, 푸시, 배포, HVC 등록을 실행하지 않았습니다. 릴리스 세션은 변경 파일과 `work/` 증거 문서를 재검토하고, 검증 결과·커밋·PR 병합·Pages 주소를 아래에 별도로 기록합니다.
