# Elementary Web App UX Audit

- 점검일: 2026-08-30
- 대상: `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center`
- 모드: `full`
- 점검 범위: 초등 3–6학년 학습자 관점의 문장·상호작용·시각 위계·모바일·키보드·스크린 리더 DOM
- 개인정보·안전 범위: 외부 전송, 점수·순위·타이머, 학생 음성 기능을 추가하지 않는지 확인
- VoiceOver: 실행하지 않음(프로젝트 규칙에 따라 제외)

## 증거 출처와 상태

| 출처 | 상태 | 범위와 한계 |
| --- | --- | --- |
| Assessment A 독립 리뷰 | 완료 | Browser skill의 DOM snapshot·스크린샷·실제 클릭 흐름, 1280×720 및 375×800. Playwright CLI는 브라우저 실행 파일 누락으로 실패 |
| Assessment B 자동 detector | 완료 | `node /Users/kimhongnyeon/.codex/skills/impeccable/scripts/detect.mjs --json src/screens src/components src/app src/styles` 실행 결과 `[]`(0건) |
| Assessment B 정식 Playwright | 차단 | `chrome-headless-shell`이 `/Users/kimhongnyeon/Library/Caches/ms-playwright/`에 없어 실행하지 않음. 브라우저 설치는 승인 없이 하지 않음 |
| Stage 0 preflight | 통과 | `work/elementary-webapp-ux-bootstrap.md`, 필수 런타임 ready. `ui-ux-pro-max`는 filesystem-only라 자동 specialist로 호출하지 않음 |
| 역사적 화면 캡처 | 참고만 | 기존 `output/`의 2026-08-28 캡처에서 raw `F3`, 좌표, 모바일 표 클리핑을 관찰했지만 현재 릴리스 증거로 주장하지 않음 |

## 베이스라인

- 학습 목표: `예측 → 한 면씩 접기 → 근거로 설명하기`가 화면의 주요 흐름으로 드러남.
- 강점: 면 번호·색·무늬와 키보드 이동을 함께 제공하며, 점수 대신 `확인함`·`연습 중`을 사용함.
- Nielsen 독립 점수: 25/40.
- detector: 0건. 자동 규칙이 0건이어도 어린 학습자 언어·밀도·의미 일치는 수동 점검 대상임.

## 발견 사항

### UX-001 · P1 · 모바일 푸터 높이와 업데이트 내역 발견성

- 관찰: 375px에서 `.footer-tools`가 약 480px 높이로 늘어나 업데이트 내역 버튼이 아래로 밀림.
- 근거: `src/styles/layout.css`의 `.footer-tools { flex: 1 1 30rem; }`와 520px 이하 레이아웃.
- 학습자 영향: 완료 후 다음 행동과 업데이트 기록이 앱의 끝에서 분리되어 앱이 끝났는지 헷갈림.
- 원인 가설: 세로 flex 컨테이너에서 `flex-basis: 30rem`이 콘텐츠 높이 대신 큰 최소 기반을 만듦.
- 판정 기준: 320/375px에서 푸터가 콘텐츠 높이만 차지하고 업데이트 내역이 첫 viewport의 footer 흐름에 존재.

### UX-002 · P1 · 잘못된 윗면 선택의 무음 처리

- 관찰: 기준면과 같은 면을 예상 윗면으로 눌러도 선택 상태와 설명이 변하지 않음.
- 근거: `src/screens/PredictionScreen.tsx`의 `selectTop`이 기준면과 같은 선택을 반환 처리.
- 학습자 영향: 클릭이 실패했는지, 기준면을 다시 골라야 하는지 알 수 없음.
- 판정 기준: 기준면과 같은 면 클릭 뒤 `기준면과 다른 면을 윗면으로 골라 주세요.`가 해당 영역에 나타나며, 유효한 선택 시 사라짐.

### UX-003 · P1 · 예측 오류 메시지의 조기·전역 노출

- 관찰: 기준면만 고른 순간 순서 오류가 표시되고, 순서 입력 후 모든 방향 필드에 오류가 동시에 나타남.
- 근거: `hasInteracted` 하나를 순서·방향 검증 모두에 사용.
- 학습자 영향: 아직 시도하지 않은 과제까지 실패로 읽혀 작업 기억과 자신감을 낮춤.
- 판정 기준: 순서 버튼을 처음 건드린 뒤에만 순서 오류가, 특정 방향 필드를 건드린 뒤에만 그 필드 오류가 보임.

### UX-004 · P1 · 예측 화면 단계 진행 신호 부족

- 관찰: 기준면·윗면 전개도와 5개 면×4방향 버튼이 한 화면에 모두 노출됨.
- 근거: `src/screens/PredictionScreen.tsx`의 네 `prediction-step` 전체 렌더.
- 학습자 영향: 현재 할 일을 잃고 반복 전개도와 최대 20개 버튼을 동시에 기억해야 함.
- 판정 기준: 현재 단계와 다음 행동이 한 문장으로 보이고, 오류가 현재 입력과 가까이 연결되어야 함. 기존 도메인 판정과 모든 키보드 경로는 유지.

### UX-005 · P1 · tracking 진단 결과의 상태·증거 불일치 방지

- 관찰: 결과가 없는 조건에서 `장식 방향 결과를 확인할 수 없습니다.`가 보이며 완료 화면의 분석 상태와 연결이 약함.
- 근거: `src/screens/DiagnosisScreen.tsx`의 `evaluationUnavailableForTracking` 분기와 `src/App.tsx`의 decoration 계산.
- 학습자 영향: 무엇을 비교해야 하는지 모른 채 분석을 완료했다고 느낄 수 있음.
- 판정 기준: 실제 방향과 목표 방향이 모두 있을 때만 비교 문장을 제공하고, 없을 때는 진단 기록·완료를 막으면서 다시 확인할 행동을 명시.

### UX-006 · P2 · 어린이 언어와 도메인 ID 분리

- 관찰: 질문·완료 비교표·근거 상태에 `F1`, `F3`, `F1·F3`, 좌표가 노출됨.
- 근거: `src/content/missions/*.json`, `src/screens/CompletionScreen.tsx`, `src/screens/EvidenceScreen.tsx`.
- 학습자 영향: 프로그래밍 ID와 음수 좌표가 면 관계 개념보다 어렵게 느껴짐.
- 판정 기준: canonical JSON과 판정 타입은 유지하고, 화면에는 `1번 면과 3번 면`, 방향·자리 언어를 사용하며 사용자에게 좌표를 기본 표시하지 않음.

### UX-007 · P2 · 수리 후보의 좌표 중심 시각화

- 관찰: 수리 후보 버튼에 `빈 칸 (x, y)`가 시각·접근성 이름으로 노출됨.
- 근거: `src/components/net2d/RepairTargetGrid.tsx`.
- 학습자 영향: 어디로 옮길지 판단할 때 방향·연결 관계보다 격자 좌표를 읽어야 함.
- 판정 기준: `선택한 면 기준 위쪽 오른쪽 빈 칸`처럼 방향을 주 이름으로 사용하고 좌표는 DOM data attribute에만 남김.

### UX-008 · P2 · 접기 보조 보기의 역할 설명

- 관찰: `접기실 · 2D 관계 보기` eyebrow가 3D 보조 뷰와 관계 표의 역할을 구분하지 않음.
- 근거: `src/screens/FoldingScreen.tsx`의 화면 카피와 보조 보기 영역.
- 학습자 영향: 어느 보기가 학습 근거인지 알기 어려움.
- 판정 기준: 3D는 모양 확인, 관계 표는 면 이름·방향 확인이라는 짧은 안내를 제공하고 표의 권위를 유지.

## 제외·보류 범위

- VoiceOver/TTS/내레이션/녹음은 구현·검증하지 않음.
- 외부 이미지·네트워크·AI·개인정보 저장 구조는 변경하지 않음.
- `ui-ux-pro-max`는 현재 runtime에 없어 specialist 결과를 꾸며내지 않음.
- 브라우저 바이너리 설치, 커밋, 푸시, 배포, HVC 등록은 실행하지 않음.

## 구현 후 동일 시나리오 재검증

점검에서 확인한 동일한 시작 상태와 행동을 다시 실행해 아래 상태를 확인했습니다.

| 이슈 | 수정 상태 | 재검증 근거 |
| --- | --- | --- |
| UX-001 | fixed | in-app Playwright에서 320×800 footer 233px, 375×812 footer 214px, 가로 넘침 없음; 업데이트 내역 버튼 노출 |
| UX-002 | fixed | 기준면 1번 면 선택 후 같은 1번 면을 윗면으로 클릭하면 `기준면과 다른 면을 윗면으로 골라 주세요.` alert가 나타남 |
| UX-003 | fixed | PredictionScreen 회귀 테스트에서 순서·방향을 건드리기 전 오류가 없고, 건드린 입력에만 오류가 표시됨 |
| UX-004 | fixed | 기준면 선택 전 윗면·순서·방향 영역이 게이트 문장으로 축약되고, 기준면·윗면을 선택하면 다음 단계가 순차적으로 열림 |
| UX-005 | fixed | tracking 진단 영역에 실제 방향·목표 방향·일치 여부가 즉시 보이며, decoration 누락 시 callback이 호출되지 않음 |
| UX-006 | fixed | 질문·근거·완료 화면에서 `1번 면` 형식을 사용하고 canonical JSON의 `F1` 값은 유지 |
| UX-007 | fixed | 수리 후보의 보이는 이름과 accessible name이 방향 중심이며 `data-grid-x/y`만 내부 좌표로 유지 |
| UX-008 | fixed | 접기실에 3D는 모양, 관계 표는 면 이름·방향을 확인한다는 안내가 표시됨 |

### 최종 검증 증거

- `npm test -- --run`: 32개 파일, 265개 테스트 통과. 테스트 fixture의 오프라인 경계 오류 출력은 의도된 실패 입력을 검증하는 로그이며 테스트 자체는 통과했습니다.
- `npm run lint`, `npm run typecheck`, `npm run build`: 모두 통과. Vite는 500kB 초과 JS 청크 경고만 출력했습니다.
- `node scripts/check-file-size.mjs`, `node scripts/check-offline-boundary.mjs`, `git diff --check`: 모두 통과.
- 최종 Impeccable detector: `[]`(0건).
- in-app Playwright: 320×800·375×812·1280×720에서 title, footer, 업데이트 내역, 가로 넘침을 확인했고 콘솔 error 0건이었습니다. 정식 CLI Playwright는 `chrome-headless-shell` 누락으로 실행하지 않았습니다.

이번 사이클에서 P0/P1은 남지 않았습니다. P2로 분류했던 힌트 JSON의 raw `F` 토큰은 화면에서 직접 노출되는 질문·결과 경로가 아니므로 이번 MVP 범위에서 렌더링 구조를 확장하지 않았으며, 필요할 때 별도 콘텐츠 표시 작업으로 다룹니다.
