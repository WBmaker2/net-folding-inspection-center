# 수동 접근성 체크리스트

실행일: 2026-08-27 (KST)

환경: macOS 26.5.2 (25F84), Apple arm64, Node v25.6.1, npm 11.9.0,
Google Chrome for Testing 151.0.7922.34, Playwright 1.62.1

자동화된 Chromium·axe 결과는 수동 보조기술 사용을 대신하지 않습니다.

| 고정 항목 | 결과 | 증거·남은 행동 |
|---|---|---|
| macOS VoiceOver + Safari: 예측판 면 이름, 접힘 live region, 관계 표, dialog 초점 복귀 | **NOT RUN — 사용자 수동 확인 필요** | 이 실행에서는 VoiceOver와 Safari를 직접 조작하지 않았습니다. Safari에서 접수→예측→접기, 면 이름·live region·관계 표 읽기, 업데이트 dialog Escape 후 trigger 초점 복귀를 확인해야 합니다. 미확인은 release-evidence blocker입니다. |
| Chrome 키보드 전용: 접수부터 검수 완료까지 마우스 없이 진행 | PASS (자동 Playwright) | [keyboard-complete.png](evidence/keyboard-complete.png). 실제 사용자 수동 확인은 남아 있습니다. |
| Chrome 확대 200%: 375px 및 데스크톱에서 필수 action과 문장 잘림 없음 | PASS (자동 Playwright) | [responsive-375-200-root-font.png](evidence/responsive-375-200-root-font.png), [responsive-200-root-font.png](evidence/responsive-200-root-font.png). |
| macOS 모션 감소: 접기 단계 스냅 전환, pulse 대신 윤곽선 | PASS (자동 Chromium reduced-motion) | [reduced-motion.png](evidence/reduced-motion.png). pseudo-element 존재, computed `animation-name: none`, outline `3px` 확인. |
| 고대비/색각 비의존: 번호·무늬·테두리만으로 면과 충돌 구분 | PASS (자동 forced-colors + axe) | [forced-colors.png](evidence/forced-colors.png). 실제 색각 사용자 수동 확인은 남아 있습니다. |
| WebGL 비활성: 2D 관계 표만으로 네 유형 미션 완료 | PASS (자동 capability boundary) | [webgl-disabled.png](evidence/webgl-disabled.png). 앱 부팅 전 context 차단, Canvas 0개, 정확한 fallback·관계 표, 4종 완료를 확인했습니다. |

## VoiceOver 수동 실행 절차

1. Safari에서 로컬 preview를 열고 VoiceOver를 켭니다.
2. 예측판의 각 면에서 번호·색상·무늬 이름이 읽히는지 확인합니다.
3. 다섯 번 접기에서 접힘 live region 문장을 듣습니다.
4. 관계 표의 행·열 제목을 듣고 업데이트 내역을 연 뒤 Escape로 trigger에 돌아오는지 확인합니다.
5. 실제 실행 날짜와 Safari 버전으로 이 문서를 갱신합니다. 그 전까지 VoiceOver 항목은 PASS로 바꾸지 않습니다.
