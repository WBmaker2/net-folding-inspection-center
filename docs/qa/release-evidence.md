# Task 16 릴리스 증거

실행일: 2026-08-27 (KST)  
환경: macOS 26.5.2 (25F84), Darwin 25.5.0, Apple arm64, Node v25.6.1,
npm 11.9.0, Chromium via Playwright 1.62.1.  
Playwright는 macOS sandbox에서 재현 가능한 `workers=1`로 실행했습니다.

자동화된 standalone E2E와 각 후속 focused 회귀는 통과했지만, 02:05:44의
`npm run verify` 통합 실행은 Chromium MachPort 권한 오류로 browser 단계에서
중단되었습니다. 이는 앱 assertion 실패가 아닌 실행 환경 blocker이며, 아래 표에
그대로 기록합니다.

## 명령별 결과

| 시각 (KST) | 명령 | 결과 |
|---|---|---|
| 01:59:03 | `npm run test:e2e -- e2e/learner-flow.spec.ts --workers=1` | PASS — 4 tests passed (네 지정 mission ID 실학생 순서) |
| 02:03:02 | focused Task 16 specs, `--workers=1` | PASS — 12 tests passed (learner/2D/accessibility/responsive) |
| 02:01:02 | `node --version`, `npm --version`, `npx playwright --version`, `sw_vers` | PASS — v25.6.1, 11.9.0, 1.62.1, macOS 26.5.2 (25F84) |
| 02:04:45 | `npm run test:e2e` (single-worker, escalated retry) | PASS — 19 tests, one Chromium worker (before final responsive CSS correction) |
| 02:05:44–02:06:07 | `npm run verify` (single-worker, escalated) | **BLOCKED** — lint/type/unit passed, but all 8 browser launches hit macOS `MachPortRendezvous` permission denial; chained checks after E2E did not run in this invocation |
| 02:08:52 | responsive regression | FAIL — genuine 200% completion overflow, 1346px > 1280px; intrinsic-width grid item identified |
| 02:10:11 | `npm run test:e2e -- e2e/responsive.spec.ts --workers=1` (escalated) | PASS — 2/2 after `.main-content > * { min-width: 0 }` |
| 02:10:22 | `npm run lint` | PASS |
| 02:10:27 | `npm run typecheck` | PASS |
| 02:10:33 | `npm test -- --run` | PASS — 29 files, 235 tests |
| 02:10:41 | `npm run check:file-size` | PASS — authored source/test/style files under 500 lines |
| 02:10:44 | `npm run check:offline-boundary` | PASS — external network boundary remains closed |
| 02:10:48 | `npm run build` | PASS — production `dist/` generated; Three.js chunk advisory only |

## 고정 환경 결과

- 375px × 812px: PASS. `scrollWidth <= clientWidth`, 필수 action과 좁은 업데이트 dialog가 viewport와 교차했습니다.
- 루트 글자 크기 200% 데스크톱: PASS. 긴 관계/완료 표의 가로 overflow 없이 필수 action을 확인했습니다.
- `prefers-reduced-motion: reduce`: PASS. pulse pseudo-element는 존재하며 computed `animation-name: none`, persistent `3px` outline입니다.
- forced-colors: PASS (자동 Chromium). 번호·색상·무늬 accessible name과 axe serious/critical 0개를 확인했습니다.
- WebGL 비활성: PASS. 앱 부팅 전 context를 차단했고 authoritative Canvas 0개, 정확한 2D fallback 문장과 관계 표로 `cube-track-01`, `cube-opposite-01`, `cube-collision-01`, `cube-repair-01`을 완료했습니다.
- macOS VoiceOver + Safari: **NOT RUN — 사용자 수동 확인 필요**. headless Chromium, accessibility tree, axe는 VoiceOver/Safari 세션 대체가 아닙니다. 수동 미실행은 release-evidence blocker입니다.

## 증거 파일

- [375px screenshot](evidence/responsive-375.png)
- [200% root-font screenshot](evidence/responsive-200-root-font.png)

## 교육적 모형 한계

이 앱은 면 인접·접힘 순서·법선·맞은편·겹침·빈 방향을 보여 주는 결정적 기하 모형입니다. 종이 두께·휘어짐·접착 탭·재료 강도·제조 품질·실제 포장 안전성을 측정하거나 보장하지 않습니다. 실제 종이 활동과 함께 사용해야 합니다.

## 범위 경계

Task 16에서는 원격 저장소 생성, push, GitHub Pages 공개, 서비스 등록 또는 배포를 수행하지 않았습니다.
