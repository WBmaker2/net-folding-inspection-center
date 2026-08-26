# Task 16 릴리스 증거

실행일: 2026-08-27 (KST)

환경: macOS 26.5.2 (25F84), Darwin 25.5.0, Apple arm64, Node v25.6.1,
npm 11.9.0

브라우저: Google Chrome for Testing 151.0.7922.34

Playwright: 1.62.1

확인 명령: `.../chrome-headless-shell --version` → Google Chrome for Testing
151.0.7922.34, `npx playwright --version` → Version 1.62.1, `node --version` →
v25.6.1, `npm --version` → 11.9.0, `sw_vers` → macOS 26.5.2 (25F84).

모든 browser 실행은 `--workers=1`로 수행했습니다. 관리형 macOS sandbox에서는
병렬 여부와 관계없이, `workers=1`인 실행도 page 생성 전에 Chromium MachPort
권한 오류로 차단되었습니다. 이는 병렬 실행에만 해당하는 실패가 아닙니다. 관리형
sandbox 밖의 승인된 escalated standalone 실행에서는 focused/full E2E와 최종 verify가
통과했으며, 실행 환경 차단과 앱 assertion 실패를 구분합니다.

## 명령별 최신 결과

| 시각 (KST) | 명령 | 결과 |
|---|---|---|
| 02:46:55–02:47:01 | `npx playwright test e2e/responsive.spec.ts --workers=1` | PASS — 3/3 |
| 02:51:23–02:51:50 | `npm run test:e2e` (verify 내부) | PASS — 20/20, 단일 worker |
| 02:51:16–02:51:21 | `npm test -- --run` (verify 내부) | PASS — 29 files, 235 tests |
| 02:51:10 | `npm run lint` 및 `npm run typecheck` (verify 내부) | PASS |
| 02:51:50 | `npm run check:file-size` 및 `npm run check:offline-boundary` (verify 내부) | PASS |
| 02:51:50–02:51:51 | `npm run build` (verify 내부) | PASS — Three.js chunk advisory만 출력 |
| 02:51:10–02:51:51 | `npm run verify` (관리형 sandbox 밖, escalated) | PASS — lint/type/unit 235 tests/E2E 20/20/file-size/offline/build 모두 통과 |
| 약 02:56 | reviewer `npm run verify` (관리형 sandbox, `workers=1`) | BLOCKED — lint/type/unit은 통과했으나 모든 browser case가 page 생성 전 MachPort 권한 오류로 차단됨. `workers=1`에서도 발생했으며 병렬 전용 실패가 아님 |
| 03:07:02–03:07:18 | reviewer 후 재검증 `npm run verify` (관리형 sandbox, `workers=1`) | BLOCKED — lint/type/unit은 통과했으나 20개 browser launch가 page 생성 전 MachPort 권한 오류로 차단됨 |
| 03:09:33–03:09:47 | `npx playwright test e2e/responsive.spec.ts e2e/accessibility.spec.ts --workers=1` (관리형 sandbox 밖, escalated) | PASS — 9/9 |
| 03:09:50–03:10:17 | `npm run test:e2e` (관리형 sandbox 밖, escalated) | PASS — 20/20 |
| 03:10:25–03:10:31 | `npm test -- --run` | PASS — 29 files, 238 tests |
| 03:11:07–03:11:50 | 최종 `npm run verify` (관리형 sandbox 밖, escalated) | PASS — lint/type/unit 238 tests/E2E 20/20/file-size/offline/build 모두 통과 |

## 고정 환경 결과

- 375×812: PASS. 가로 overflow가 없고 현재 action box가 viewport와 교차합니다. ([responsive-375.png](evidence/responsive-375.png))
- 375×812 + 루트 글자 크기 200%: PASS. 긴 완료 표를 실제로 가로 스크롤해 마지막 열에 도달했고, action·update trigger와 footer 콘텐츠의 비겹침 및 dialog viewport 내부 배치를 확인했습니다. ([responsive-375-200-root-font.png](evidence/responsive-375-200-root-font.png))
- 데스크톱 + 루트 글자 크기 200%: PASS. 긴 표, storage label/helper, footer 문장과 trigger의 비겹침을 확인했습니다. ([responsive-200-root-font.png](evidence/responsive-200-root-font.png))
- `prefers-reduced-motion: reduce`: PASS. pulse pseudo-element가 존재하고 computed `animation-name: none`, persistent `3px` outline입니다. ([reduced-motion.png](evidence/reduced-motion.png))
- forced-colors: PASS (자동 Chromium + axe). 번호·무늬·accessible label을 확인했습니다. ([forced-colors.png](evidence/forced-colors.png))
- WebGL 비활성: PASS. 앱 부팅 전 context를 차단하고 Canvas 0개, 정확한 fallback·관계 표로 네 mission을 완료했습니다. ([webgl-disabled.png](evidence/webgl-disabled.png))
- 키보드 전용: PASS (자동 Playwright). Tab/Shift+Tab, NetGrid 화살표, Space/Enter, Escape와 live-region을 확인했습니다. ([keyboard-complete.png](evidence/keyboard-complete.png))

## 증거 파일

- [responsive-375.png](evidence/responsive-375.png)
- [responsive-375-200-root-font.png](evidence/responsive-375-200-root-font.png)
- [responsive-200-root-font.png](evidence/responsive-200-root-font.png)
- [keyboard-complete.png](evidence/keyboard-complete.png)
- [reduced-motion.png](evidence/reduced-motion.png)
- [forced-colors.png](evidence/forced-colors.png)
- [webgl-disabled.png](evidence/webgl-disabled.png)

## VoiceOver 및 수동 blocker

macOS VoiceOver + Safari: **NOT RUN — 사용자 수동 확인 필요**. headless
Chromium, axe, accessibility tree는 실제 보조기술 세션의 대체가 아닙니다. Safari에서
면 이름·접힘 live region·관계 표·dialog Escape 초점 복귀를 직접 확인하기 전까지
release-evidence blocker입니다.

## 교육적 모형 한계

이 앱은 면 인접·접힘 순서·법선·맞은편·겹침·빈 방향을 보여 주는 결정적 기하
모형입니다. 종이 두께·휘어짐·접착 탭·재료 강도·제조 품질·실제 포장 안전성을
측정하거나 보장하지 않습니다. 실제 종이 활동과 함께 사용해야 합니다.

## 범위 경계

원격 저장소 생성, push, GitHub Pages 공개, 서비스 등록 또는 배포를 수행하지
않았습니다.
