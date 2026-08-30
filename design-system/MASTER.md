# Net Folding Inspection Center Design System

## Purpose

이 시스템은 초등 5~6학년 학생이 전개도의 면 관계를 예측하고 한 면씩 접어 근거를 설명하는 흐름을 방해하지 않도록 화면 위계와 조작 규칙을 통일합니다. 학습 판정은 `src/domain/net/**`와 `src/domain/learning/**`의 순수 함수가 담당하며, 이 문서는 표현 규칙만 정의합니다.

## Visual tokens

```css
--ink: #16324a;
--muted-ink: #587084;
--paper: #fffaf1;
--surface: #ffffff;
--surface-soft: #f4fbfb;
--line: #d8e6eb;
--accent: #147da1;
--accent-strong: #0f6685;
--accent-soft: #def3f4;
--warm: #fff1bf;
--success: #1d6b43;
--error: #a3342a;
--shadow: 0 18px 44px rgb(22 50 74 / 10%);
--shadow-soft: 0 8px 22px rgb(22 50 74 / 8%);
```

`color-scheme: light`를 유지합니다. 어두운 테마를 자동 선택하지 않습니다.

## Typography

- Font stack: `'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`
- 화면 제목: `clamp(2rem, 7vw, 3.8rem)`, line-height `1.15`, `text-wrap: balance`
- 화면 설명: `1.05rem` 이상, 보조 설명은 `0.9rem` 이상
- eyebrow: `0.78rem–0.85rem`, 800 weight, letter spacing `0.08em`
- 학습 상태 문장은 색상과 함께 명시적인 텍스트를 사용합니다.

## Layout

- 최소 viewport: 320px
- 기본 shell: `width: min(100% - 2rem, 72rem)`
- 화면 padding: `clamp(1.25rem, 4vw, 4rem)`
- 카드 간격: `0.75rem–1.25rem`
- 520px 이하: 단일 열, 버튼과 footer 묶음을 세로 배치
- 768px 이상: 미션 카드·학습판을 2열로 배치하되 각 열 `min-width: 0`
- 표·전개도는 내용이 잘리지 않도록 자체 overflow를 사용하며 페이지 가로 스크롤은 금지합니다.

## Surfaces and status

- 학습 카드: `background: var(--surface)`, `border: 1px solid var(--line)`, `border-radius: 1rem`, `box-shadow: var(--shadow-soft)`
- 현재 선택: `border: 2px solid var(--accent)`, `background: var(--accent-soft)`, 텍스트 `aria-pressed=true`
- 성공: `var(--success)` 텍스트와 border/icon
- 오류: `var(--error)` 텍스트와 border/icon
- 연습 중/해당 없음: 보조 잉크와 명시적 label (`연습 중`, `이번 미션에는 없음`)
- 색만으로 상태를 전달하지 않고 텍스트·border·아이콘을 함께 제공합니다.

## Buttons and inputs

- 모든 button/input/select 최소 높이 `44px`, 키보드·터치 모두 조작 가능
- `PrimaryAction`에 `primary-action` 클래스를 항상 붙여 채움 CTA 스타일을 공유합니다.
- 현재 단계의 유일한 핵심 행동만 `gi-pulse`를 사용합니다. disabled, hidden, 비핵심 선택에는 pulse를 사용하지 않습니다.
- 보조 행동은 흰 표면과 선으로, 위험 행동은 오류색 선으로 표시합니다.
- `:focus-visible`은 `3px solid var(--accent)` + `3px` offset입니다.
- Enter/Space, 방향키, native range/select 동작을 막지 않습니다.

## Motion and media

- 기본 애니메이션은 짧고 학습 상태 변화만 설명합니다. 자동 3D 회전은 사용하지 않습니다.
- `@media (prefers-reduced-motion: reduce)`에서는 pulse·전환·접기 애니메이션을 제거하고 정적 강조선으로 낮춥니다.
- `@media (forced-colors: active)`에서는 `Highlight`, `Canvas`, `ButtonText`를 사용합니다.
- 현재 자산은 favicon과 inline SVG 도형입니다. 사실·브랜드·기하 정보를 담으므로 자동 이미지 생성/교체를 하지 않습니다.

## Screen patterns

### Intake

`mission-hero` → `mission-groups` → `mission-card` 순서. 한 문장의 학습 목표와 세 가지 결과를 먼저 제시하고, 카드에는 질문·난이도·완료 상태·한 개의 CTA만 둡니다.

### Prediction

`prediction-overview`로 네 입력 단계를 요약하고, 각 `prediction-step` 안에는 제목·전개도·현재 선택 상태 순서를 지킵니다. 비활성 CTA는 pulse하지 않습니다.

### Folding

`fold-control-card`에 상태, 이전/다음, range, 보기 옵션을 묶고, 2D 관계 표와 WebGL viewer를 별도 보조 영역으로 둡니다. 표의 텍스트가 3D보다 권위입니다.

### Feedback and completion

진단·수리·근거·완료는 같은 카드 surface를 사용합니다. 오류/성공 메시지는 관련 조작 바로 아래에 배치하고, 완료 화면에는 `배운 점`과 `다음에는`을 항상 제공합니다.

## Content and safety

- 설계 문서의 질문·정답·허용 어휘를 그대로 사용하며 UI에서 답을 미리 공개하지 않습니다.
- 점수·순위·속도·타이머·개인정보·외부 AI·학생 대상 음성 기능을 추가하지 않습니다.
- 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않는다는 model boundary를 유지합니다.
- 작은 `업데이트 내역` 버튼에서 날짜별 설계·개발·접근성 변경을 확인할 수 있어야 합니다.
