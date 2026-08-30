# 수동 접근성 체크리스트

실행일: 2026-08-27 (KST)

환경: macOS 26.5.2 (25F84), Apple arm64, Node v25.6.1, npm 11.9.0,
Google Chrome for Testing 151.0.7922.34, Playwright 1.62.1

VoiceOver 구현·검증은 사용자 지침에 따라 이 프로젝트의 범위에서 제외합니다. 자동화된 Chromium·axe 결과만 이 문서의 접근성 게이트로 사용합니다.

| 고정 항목 | 결과 | 증거·남은 행동 |
|---|---|---|
| VoiceOver + Safari 보조기술 검증 | **범위 제외** | VoiceOver 구현·검증은 수행하지 않습니다. 키보드·axe·접근성 트리 자동화 결과로 범위 내 접근성 동작을 확인합니다. |
| Chrome 키보드 전용: 접수부터 검수 완료까지 마우스 없이 진행 | PASS (자동 Playwright) | [keyboard-complete.png](evidence/keyboard-complete.png). 실제 사용자 수동 확인은 남아 있습니다. |
| Chrome 확대 200%: 375px 및 데스크톱에서 필수 action과 문장 잘림 없음 | PASS (자동 Playwright) | [responsive-375-200-root-font.png](evidence/responsive-375-200-root-font.png), [responsive-200-root-font.png](evidence/responsive-200-root-font.png). |
| macOS 모션 감소: 접기 단계 스냅 전환, pulse 대신 윤곽선 | PASS (자동 Chromium reduced-motion) | [reduced-motion.png](evidence/reduced-motion.png). pseudo-element 존재, computed `animation-name: none`, outline `3px` 확인. |
| 고대비/색각 비의존: 번호·무늬·테두리만으로 면과 충돌 구분 | PASS (자동 forced-colors + axe) | [forced-colors.png](evidence/forced-colors.png). 실제 색각 사용자 수동 확인은 남아 있습니다. |
| WebGL 비활성: 2D 관계 표만으로 네 유형 미션 완료 | PASS (자동 capability boundary) | [webgl-disabled.png](evidence/webgl-disabled.png). 앱 부팅 전 context 차단, Canvas 0개, 정확한 fallback·관계 표, 4종 완료를 확인했습니다. |

## 범위에서 제외한 항목

- 학생용 VoiceOver·음성 안내 기능 구현
- VoiceOver + Safari 수동 보조기술 검증
- 위 항목은 사용자 지침에 따라 계획·구현·검증에 포함하지 않습니다.

## 2026-08-28 개선 wave 자동화 확인

이 wave에서는 접기 제목 포커스, 어린이용 방향 표현, 역할별 근거 낱말,
완료 화면의 배운 점·다음에는 요약, 단계 진행 표시, 미션 재선택, 200% 확대에서
업데이트 내역 버튼과 핵심 action의 비겹침을 확인했습니다.

| 항목 | 결과 | 증거·남은 행동 |
|---|---|---|
| Chromium 키보드 전용 전체 미션 흐름 | PASS (Playwright 21/21) | `npm run test:e2e`가 Tab·화살표·Space·Enter·Escape 흐름을 통과했습니다. 실제 사용자 수동 확인은 남아 있습니다. |
| 375px 및 200% 확대 완료 비교표 | PASS (Playwright) | 비교표가 고정 폭 없이 줄바꿈되고 `scrollWidth <= clientWidth`를 확인했습니다. 실제 Safari 확대 확인은 남아 있습니다. |
| 접기 단계 제목 시작 위치 | PASS (Vitest) | `FoldingScreen` 제목 포커스 회귀 테스트 16개 중 전체 통과. VoiceOver 읽기 검증은 범위에서 제외합니다. |
| 방향 표현·근거 문장 | PASS (Vitest) | 어린이용 방향 label과 조사 보정 테스트를 통과했습니다. |
| VoiceOver + Safari | **범위 제외** | 사용자 지침에 따라 VoiceOver 구현·검증을 수행하지 않습니다. |

## 2026-08-29 교육 웹앱 리디자인 wave

이번 wave는 초등 5~6학년 학생이 학습 목적과 다음 행동을 먼저 이해하도록 화면
위계를 정리했습니다. 실제 학생·교사·보조공학 사용자의 human sign-off는 수행하지
않았으며, 아래는 자동화와 승인된 로컬 브라우저 점검 결과입니다.

| 항목 | 결과 | 증거·남은 행동 |
|---|---|---|
| 학습 목적·현재 단계·다음 행동 | PASS | 미션 hero의 세 결과, 헤더 `학습 진행`, 예측 4단계 개요, 접기 `접기 조작` 그룹을 Vitest·Chromium으로 확인했습니다. |
| 1440px·768px·375px·320px 흐름 | PASS | 1440/375/320 초기·첫 선택 캡처와 1280 단계 캡처에서 가로 overflow 0, 콘솔 오류 0. 768px은 `npm run test:e2e` responsive 프로젝트의 중간 폭 규칙으로 확인했습니다. |
| 375px에서 루트 글자 크기 200% | PASS | 접기 조작 primary 버튼과 range가 카드 안에서 줄바꿈되고 document `scrollWidth`가 viewport와 같습니다. |
| 키보드 전용 | PASS (자동 Playwright) | skip link, Tab 탐색, NetGrid 화살표, Enter/Space, Escape, live region, 단계 heading focus를 확인했습니다. 실제 물리 키보드 수동 확인은 남아 있습니다. |
| reduced-motion | PASS (자동 Chromium) | pulse pseudo-element의 `animation-name: none`과 3px outline을 확인했습니다. |
| forced-colors·색 비의존 | PASS (자동 Chromium + axe) | 면 번호·무늬·accessible name·Highlight outline을 확인했습니다. 실제 색각 사용자 수동 확인은 남아 있습니다. |
| 외부 네트워크·개인정보 | PASS | privacy-safety 3개에서 외부 origin 0, 이름·학번·이메일·파일·자유 입력 0, sessionStorage opt-in 경계를 확인했습니다. |
| VoiceOver + Safari | **범위 제외** | 사용자 지침에 따라 학생용 음성 기능과 VoiceOver 검증을 구현·수행하지 않습니다. |

### 실행 조건

공유 작업 공간의 다른 Vite 서버와 테스트 대상이 섞이지 않도록 다음 환경 변수를
사용했습니다. 명령은 이 문서의 검증 기록이며, 재현 시 현재 저장소 루트에서 실행합니다.

```bash
PLAYWRIGHT_PORT=4176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4176 CI=1 npm run verify
```

예상 결과는 lint·typecheck·unit 260개·E2E 21개·file-size·offline-boundary·build
각각 exit 0이며, build에는 기존 Three.js chunk advisory만 출력됩니다.

### 최신 보정 재검증 상태

수리 상태 카드의 전경색은 `--accent-strong`(`#0f6685`)로 보정했고 `--accent-soft`
(`#def3f4`) 배경 대비는 정적 계산 `5.59:1`입니다. 보정 후 lint·typecheck·Vitest
260개·file-size·offline-boundary·build는 통과했습니다. 관리형 macOS Chromium에서
Playwright를 재실행한 결과는 page 생성 전 `MachPortRendezvous ... Permission denied`로
차단되어, 최신 E2E·axe 항목을 PASS로 갱신하지 않았습니다. 브라우저 권한이 가능한
환경에서 위 `npm run verify`를 재실행해야 합니다.

## 2026-08-30 진행 경로·수리 표현 보정

현재 작업 트리의 정적·컴포넌트 검증 결과입니다. 커밋·배포 전 상태이며, 관리형
macOS Chromium의 반복된 `MachPortRendezvous ... Permission denied` 때문에 최신
브라우저 검증은 재실행하지 않았습니다.

| 항목 | 결과 | 증거·남은 행동 |
|---|---|---|
| 미션별 진행 단계 5·6·7 표시 | PASS (Vitest) | `tests/app/AppShell.test.tsx`에서 opposite `2 / 5`, tracking `2 / 6`, collision `2 / 7` 확인 |
| 수리 미리보기의 학습자 표현 | PASS (Vitest) | `tests/components/RepairScreen.test.tsx`에서 `옮길 면`·방향·면 번호와 내부 좌표/ID 부재 확인 |
| 첫 미션 진입성·단일 강조 | PASS (Vitest) | `tests/components/IntakeScreen.test.tsx`에서 `첫 미션부터 시작하기`, `.is-featured`, 단일 `gi-pulse` 확인 |
| 토큰·상태 표면·SVG 장식·solid 표면 | PASS (lint/typecheck/build) | `src/styles/tokens.css`, `src/components/net3d/sceneColors.ts`; 별도 브라우저 대비 재확인은 권한 가능한 환경에서 실행 |
| 최신 Playwright·axe | **차단됨** | 페이지 생성 전 Chromium 권한 오류. 보정 전 격리 실행 21/21은 역사적 결과로만 유지 |
