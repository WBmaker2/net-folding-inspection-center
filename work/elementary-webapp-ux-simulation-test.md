# Simulation Test Record — Stage 2

## Test date and scope

- Date: 2026-08-30
- Local URL: `http://127.0.0.1:4177/`
- Scope: `FoldingScreen` 접기 시뮬레이션의 조작·관찰·되돌리기와 `EvidenceScreen` 문장 미리보기
- 제외: VoiceOver/TTS/음성, 다른 단계의 UX 재설계, 커밋·푸시·배포

## Automated component evidence

명령:

```bash
npm test -- --run tests/components/FoldingScreen.test.tsx tests/components/CubeFoldViewer.test.tsx tests/components/EvidenceScreen.test.tsx tests/components/RepairScreen.test.tsx tests/learning/storageErrors.test.ts tests/app/AppFlow.test.tsx
```

결과: 6개 테스트 파일, 67개 테스트 통과.

검증한 계약:

- 시작 단계에서 `처음부터 다시 보기` disabled, `다음 면 접기` enabled
- 1단계에서 `1 / 5면 접힘`과 `2번 면이 기준면의 위쪽 모서리를 따라 접혔습니다.` status 표시
- 초기화 후 `0 / 5면 접힘`과 `접기 전 상태로 돌아왔습니다.` status 표시
- 초기화 버튼은 `gi-pulse`가 아니며 `다음 면 접기` 하나의 pulse만 유지
- native range, 이전/초기화/다음 버튼이 같은 `stepIndex`와 `onStepChange` 값을 사용
- 네 시점 버튼 accessible name과 `aria-pressed` 동기화
- 근거 도움말·빈 미리보기 표현 변경 및 기존 `EvidenceSubmission` 문장 payload 보존
- 색·무늬 보존 제약 문구와 브라우저 저장 설정 오류 문구 검증

## In-app browser evidence

in-app Playwright 브라우저로 실제 DOM과 상태를 확인했습니다.

| 뷰포트/상태 | 결과 |
| --- | --- |
| 320×800, 미션 접수 | `scrollWidth=320`, overflow 없음, 내부 면 ID 미노출 |
| 320×800, 접기 화면 | `막대를 움직이거나 버튼을 눌러...` 안내, `정면에서 보기` 등 4개 시점 이름, overflow 없음 |
| 접기 1단계 | 상태 `1 / 5면 접힘`, 이동 면 status, 초기화 enabled, 관계 표 6행 유지 |
| 시점 변경 | `위에서 보기`의 `aria-pressed=true`, 다른 시점 false |
| 초기화 | 상태 `0 / 5면 접힘`, status `접기 전 상태로 돌아왔습니다.`, 초기화 disabled, 다음 enabled |
| 375×812 | `scrollWidth=360`, overflow 없음; 긴 초기화 문구가 버튼 안에서 줄바꿈됨 |
| 1280×720 | `scrollWidth=1265`, overflow 없음; 세 버튼과 시점 버튼이 겹치지 않음 |
| reduced-motion | `folding-screen[data-motion-mode="instant"]`, `cube-fold-viewer[data-motion-mode="snap"]` |
| 근거 화면 320px | 도움말·생성 문장이 보이고 `scrollWidth=320`, overflow 없음 |
| 근거 문장 생성 | `1번 면과 3번 면은 접는 방향을 따라가면 서로 맞은편이 됩니다.` 표시, `gi-pulse`는 `근거 확인`에만 적용 |
| 콘솔 | error 0, Three.js deprecation warning 1건(기존 라이브러리 경고) |

키보드 순서는 접기 1단계에서 이전 접기 → 접기 단계 range → 처음부터 다시 보기 → 다음 면 접기 → 한 면씩 보기 → 정면/오른쪽/위 시점 버튼으로 확인했습니다. Canvas는 시각 보조이며 2D 표가 DOM 학습 정보로 남습니다.

## Formal E2E limitation

`npm run test:e2e`는 21개 테스트 모두 실행 시도했으나, 호스트에 Playwright Chromium 실행 파일이 없어 `browserType.launch` 단계에서 중단되었습니다. 오류 경로는 `/Users/kimhongnyeon/Library/Caches/ms-playwright/chromium_headless_shell-1234/.../chrome-headless-shell`이며, 브라우저 설치는 수행하지 않았습니다. 따라서 formal CLI E2E는 **차단됨**, 위 in-app 브라우저와 Vitest 결과는 **통과**로 분리합니다.

