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
