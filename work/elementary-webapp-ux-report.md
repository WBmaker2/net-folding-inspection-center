# Elementary Web App UX Improvement Report

- 모드: `full`
- 대상: `/Volumes/ External Drive 256G/Dev2/codex/net-folding-inspection-center`
- 점검일: 2026-08-30
- 대상 학년: 초등 3–6학년
- 주 페르소나: 초3–4 준호(8–10세); 가드레일: 초5–6 서윤(10–12세)
- VoiceOver/TTS/내레이션/녹음: 프로젝트 규칙에 따라 구현·검증에서 제외

## 실행 요약

초기 학생 패널과 브라우저 기준선에서 발견한 8개 UX 이슈를 계획 순서대로 수정했습니다. 예측 화면은 한 번에 해야 할 일을 단계별로 보여 주고, 잘못된 윗면 선택과 입력별 오류를 즉시 이해할 수 있게 했습니다. 내부 `F1` 토큰과 좌표는 판정 데이터에 남겨 두되 학습자 화면에서는 `1번 면`, 방향, 자리 표현으로 바꿨습니다. tracking 진단에는 실제 방향과 목표 방향을 함께 표시하며 결과가 없으면 기록을 막습니다.

## Stage 0와 규칙

- `work/elementary-webapp-ux-bootstrap.md`: `full` preflight `ready`.
- 적용 규칙: `design-system/MASTER.md`; 별도 `AGENTS.md`, `EDUCATION_DESIGN.md`는 없음.
- 사용한 런타임: elementary-webapp-ux-orchestrator, playwright(in-app MCP), impeccable(detector), redesign-existing-projects, frontend-skill, imagegen, education-webapp-redesign.
- `ui-ux-pro-max`는 현재 runtime에 없어 결과를 꾸며내지 않았습니다.
- 새 패키지·브라우저 바이너리·외부 서비스는 설치하지 않았습니다.

## Simulated learner panel 결과

| 상태 | 관찰 가능한 행동 | 수정 후 결과 |
| --- | --- | --- |
| cold start, 1280px | 준호는 제목과 첫 미션 버튼을 먼저 훑고 미션을 선택함 | 학습 목적, 미션 그룹, 첫 CTA가 계속 보임 |
| 예측 시작, 375px | 기준면을 고른 뒤 다음 일을 찾으려 함 | 윗면·순서·방향이 게이트 문장으로 순차 공개됨 |
| 자연스러운 오답 | 기준면과 같은 면을 윗면으로 다시 누름 | `기준면과 다른 면을 윗면으로 골라 주세요.`가 선택 영역에 표시됨 |
| 빈 입력 회복 | 순서 일부만 넣거나 한 면의 방향만 고름 | 시도한 순서·방향에만 오류가 나타나고 해당 조작을 계속할 수 있음 |
| 결과 읽기 | 서윤은 3D와 표 중 무엇을 믿어야 하는지 확인함 | 3D는 모양, 관계 표는 면 이름·방향이라는 안내가 표시됨 |
| 완료 후 전이 | 다음 미션과 기록 위치를 찾음 | 번호형 결과 표와 `다음 미션`, 업데이트 내역을 확인할 수 있음 |

이는 실제 학생 연구나 접근성 인증이 아닌 일관된 시뮬레이션 패널 결과입니다.

## 수용 점수

| 영역 | 점수 | 근거 |
| --- | ---: | --- |
| 학습 목표·과제 명료성 | 14/15 | 예측 4단계와 현재 행동 문장이 화면에 표시됨 |
| 아동 언어·인지부하 | 13/15 | 면 ID·좌표를 번호·방향 표현으로 바꾸고 오류를 입력별로 지연함 |
| 화면 구조·행동 위계 | 14/15 | upcoming 단계는 게이트만, current 단계는 조작만 노출 |
| 피드백·오류 회복 | 14/15 | 중복 윗면·순서·방향·tracking 컨텍스트 회복 문구와 테스트 |
| 시각적 가독성 | 9/10 | 모바일 footer와 단계 배경을 정리하고 기존 대비·44px 컨트롤 유지 |
| 키보드·의미·기본 접근성 | 9/10 | 화살표·Enter 경로, h1 focus, legend, live region 회귀 테스트 |
| 반응형 학습 흐름 | 9/10 | in-app 브라우저 320×800·375×812·1280×720 가로 넘침 없음 |
| 런타임 안정성 | 5/5 | 단위 테스트 265개 통과, 브라우저 console error 0건 |
| 맥락적 시각자료·자산 안전 | 4/5 | 기존 SVG 전개도·3D 보조 보기를 유지하고 새 사실 이미지·외부 자산은 추가하지 않음 |
| **합계** | **91/100** | 보조 지표; 필수 게이트와 함께 판정 |

## 필수 게이트 판정

**판정: pass (in-app 브라우저 증거 기준).**

- P0: 0개.
- 해결되지 않은 P1: 0개.
- 주 페르소나의 시작→예측→접기→진단/근거→완료 경로를 `tests/app/AppFlow.test.tsx`와 in-app 브라우저에서 확인했습니다.
- 320px에서 footer·업데이트 내역·핵심 CTA가 가려지지 않았고 가로 넘침이 없었습니다.
- 핵심 NetGrid 경로는 마우스 없이 화살표·Enter로 조작하는 Testing Library 시나리오가 통과했습니다. VoiceOver는 판정 근거가 아닙니다.
- 정답·오답·방향·면 관계는 생성 이미지에 의존하지 않습니다.
- 수정 전 발견 상태와 같은 예측·모바일·tracking 시나리오를 수정 후 재실행했습니다.
- 완료 화면에 배운 점과 `다음 미션` 행동이 있습니다.

정식 Playwright CLI는 로컬 `chrome-headless-shell` 누락으로 실행하지 않았습니다. 대신 현재 제공된 in-app Playwright로 3개 viewport, 중복 윗면 회복, 전체 tracking 완료 경로를 확인했습니다. Vite/Three.js의 기존 `THREE.Clock` deprecation warning 1건은 콘솔 error가 아니며 기능 실패를 일으키지 않았습니다.

## P0–P3 이슈 원장

| ID | 심각도 | 상태 | 변경 내용 |
| --- | --- | --- | --- |
| UX-001 | P1 | fixed | 모바일 footer flex basis를 콘텐츠 높이로 제한 |
| UX-002 | P1 | fixed | 기준면과 같은 윗면 선택에 inline alert 추가 |
| UX-003 | P1 | fixed | 순서·면별 방향 touched 상태 분리 |
| UX-004 | P1 | fixed | 예측 단계별 upcoming 게이트와 현재 작업 위계 추가 |
| UX-005 | P1 | fixed | tracking 실제·목표 방향 비교와 context fail-closed 유지 |
| UX-006 | P2 | fixed | 질문·근거·완료 표를 `n번 면` 언어로 통일 |
| UX-007 | P2 | fixed | 수리 후보를 좌표 대신 상대 방향으로 표시하고 data 좌표는 보존 |
| UX-008 | P2 | fixed | 3D 보조 보기와 관계 표의 역할 문장 추가 |
| HINT-001 | P2 | deferred | JSON 힌트는 현재 화면에 렌더링되지 않아 primary path를 막지 않음; 표시 기능은 별도 콘텐츠 결정 후 진행 |

## 변경 파일과 책임

- `src/app/AppShell.tsx`: 저장 안내에서 `sessionStorage` 내부 용어를 제거.
- `src/content/learnerCopy.ts`: 질문 문자열의 `F1`–`F6` 표시 변환.
- `src/content/changelog.ts`: 2026-08-30 접근성·모바일 개선 기록 추가.
- `src/components/net2d/faceLabels.ts`: 공유 `faceIdLabel` 제공.
- `src/components/net2d/RepairTargetGrid.tsx`: 방향 중심 visible/accessible label.
- `src/screens/IntakeScreen.tsx`, `src/screens/PredictionScreen.tsx`: 어린이용 질문과 순차 입력 피드백.
- `src/screens/DiagnosisScreen.tsx`: tracking 방향 비교 패널과 누락 컨텍스트 안내.
- `src/screens/EvidenceScreen.tsx`, `src/screens/CompletionScreen.tsx`: 번호형 관계·진단·수리 결과.
- `src/screens/FoldingScreen.tsx`: 3D·관계 표 역할 안내.
- `src/styles/layout.css`, `src/styles/net2d.css`: 모바일 footer와 upcoming 단계 스타일.
- `tests/content/learnerCopy.test.ts` 및 관련 App/컴포넌트 테스트: 위 계약의 회귀 방지.

## 검증 명령과 결과

```text
npm test -- --run
→ 32개 파일, 265개 테스트 통과

npm run lint
→ 통과

npm run typecheck
→ 통과

npm run build
→ Vite production build 통과; 1,234.08 kB JS chunk 경고만 출력

node scripts/check-file-size.mjs
→ 모든 authored file 500줄 미만

node scripts/check-offline-boundary.mjs
→ src 외부 클라이언트·URL 없음

node /Users/kimhongnyeon/.codex/skills/impeccable/scripts/detect.mjs --json src/screens src/components src/app src/styles
→ [] (0건)

git diff --check
→ 통과
```

in-app Playwright 확인:

- `http://127.0.0.1:4176/` title `전개도 포장 검수소`.
- 320×800: `scrollWidth=320`, footer 233px, overflow false.
- 375×812: `scrollWidth=360`, footer 약 214px, overflow false.
- 1280×720: `scrollWidth=1265`, footer 약 111px, overflow false.
- 업데이트 내역 버튼과 2026-08-30 기록 visible.
- 기준면 1번 면 → 같은 1번 면 윗면 시도 → 오류 문장 확인.
- tracking 미션 전체 경로 → 완료 heading `검수 완료` 확인.
- console errors 0건, warnings 1건(`THREE.Clock` deprecation).

## 이미지 결정

이번 변경에서 새 이미지는 만들지 않았습니다. 전개도·면 무늬·3D 보조 보기는 현재 SVG/기하 렌더링이 학습 근거를 직접 표현하며, 정답·방향·수치가 생성 이미지에 의존하면 안 된다는 안전 규칙을 따릅니다.

## 학습자 takeaway와 다음 행동

학습자는 “기준면을 고르고, 윗면을 예상하고, 다섯 면의 순서와 방향을 고른 뒤, 3D 모양과 면 관계 표를 비교해 근거를 설명한다”는 흐름을 한 화면씩 따라갈 수 있습니다. 완료 후에는 `다음 미션`으로 다른 전개도를 다시 시도할 수 있습니다.

다음 선택 작업은 두 가지입니다: (1) 힌트 JSON을 실제 힌트 패널로 공개할 때도 `F` 토큰을 번호형 문장으로 변환하는 콘텐츠 작업, (2) `chrome-headless-shell` 실행 파일이 준비된 환경에서 정식 CLI Playwright를 추가 실행하는 작업입니다. 두 작업 모두 현재 P0/P1을 남기는 차단 사항은 아닙니다.

## 릴리스 경계

이번 개선은 커밋 `de53d0f`로 `main`에 커밋·푸시했고 GitHub Actions `33311820565`의 `build`·`deploy` job이 성공했습니다. 공개 Pages는 [https://wbmaker2.github.io/net-folding-inspection-center/](https://wbmaker2.github.io/net-folding-inspection-center/)에서 확인했습니다. HVC 등록과 외부 서비스 연결은 실행하지 않았습니다.
