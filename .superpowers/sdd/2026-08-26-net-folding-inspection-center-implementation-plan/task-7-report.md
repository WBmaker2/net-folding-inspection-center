# Task 7 구현 보고서

## 실패 테스트 증거

요구된 테스트를 먼저 작성하고 `npm test -- --run tests/components/PredictionScreen.test.tsx`를 실행했습니다. 구현 전에는 `../../src/screens/PredictionScreen` 모듈이 없어 `Failed to resolve import`와 `0 test`로 실패했습니다.

## 변경 사항

- `FaceTile`: 모든 면을 semantic `button`으로 렌더링하고 큰 면 번호, 색, SVG 도형 무늬와 번호·색·도형·격자 위치를 포함한 접근 가능한 이름을 제공합니다. R8/R9 매핑에 따라 F2는 노란색·사각형, F3는 초록색·삼각형입니다.
- `NetGrid`: 실제 `grid` 좌표 기반 열·행 배치, roving `tabIndex`, ArrowUp/Down/Left/Right 최단 후보 이동, Enter/Space 선택을 제공합니다. 드래그 이벤트는 등록하지 않습니다.
- `PredictionScreen`: 기준면, 예상 윗면, 기준면 제외 정확히 5면의 순서, 각 면의 `north/east/south/west` 방향이 모두 채워진 경우에만 제출을 허용하고 `PredictionRecord`를 `onSubmit`으로 전달합니다. 누락 상태는 인접 텍스트로 표시합니다.
- `useFocusHeading`: 진입 시 h1에 programmatic focus를 적용합니다.
- `net2d.css`: 375px 폭에서도 사용할 수 있는 전개도·버튼·오류·스크린리더용 기본 스타일을 추가했습니다.
- `PredictionScreen.test.tsx`: RED 증거, 키보드 기준면 선택, 접근 가능한 면 이름, 불완전 제출 차단, 완성 record 제출을 검증합니다.

## 검증

- `npm test -- --run tests/components/PredictionScreen.test.tsx` — PASS (3 tests)
- `npm test -- --run` — PASS (9 files, 85 tests)
- `npm run typecheck` — PASS
- `npm run lint` — PASS (기존 react-refresh 경고 4개, 오류 없음)
- `npm run check:file-size` — PASS
- `npm run build` — PASS

## 커밋

구현 커밋: `9600f9d788d178fbc62d4d70fbd8a1d0acab0523` (`feat: build keyboard-first prediction board`)
