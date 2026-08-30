# Simulation Decision Ledger — Stage 2

## Scope and learning contract

대상은 `FoldingScreen`의 한 면씩 접기 시뮬레이션과 이를 관찰한 뒤 진단·근거 단계로 이어지는 경로입니다. 새 엔진이나 자동 판정은 만들지 않고, 기존 `FoldSequence`와 `FaceRelationTable`을 학습자에게 더 분명하게 조작·관찰·되돌리기 할 수 있게 합니다.

## Policy decisions

| 질문 | 결정 | 근거와 합격 조건 |
| --- | --- | --- |
| 학습자가 무엇을 바꾸는가 | `implement` | range/이전/다음으로 `stepIndex` 하나만 바꿉니다. 각 조작은 정수 1단계이며 `FoldSnapshot`만 다시 계산합니다. |
| 여러 변수를 한 번에 바꾸는가 | `not-needed` | `singleFaceMode`와 네 시점 버튼은 접기 결과를 바꾸지 않는 보기 옵션입니다. 접기 변수와 분리되어 있음을 테스트합니다. |
| 관찰 결과가 보이는가 | `implement` | 상태 숫자, `LiveRegion` 문장, 2D 관계 표를 한 화면에 유지하고 WebGL은 보조로만 표시합니다. |
| 자동 재생/시간 변화가 있는가 | `not-needed` | 시간 기반 애니메이션을 사용하지 않고 `frameloop="demand"`를 유지합니다. 따라서 별도 일시정지 버튼을 추가하지 않습니다. |
| 되돌리기/초기화가 있는가 | `implement` | 새 `처음부터 다시 보기` 버튼이 `stepIndex=0`과 `접기 전 상태로 돌아왔습니다.` status를 만들고 0단계에서 disabled 됩니다. |
| 설명 단계와 연결되는가 | `not-needed` | 5단계 완료 시 기존 `onComplete`/`onContinue` 경로가 진단 또는 근거 화면으로 이어집니다. 이번 범위에서 설명 판정은 수정하지 않습니다. |
| 3D가 없어도 학습 가능한가 | `implement` | Canvas가 없어도 2D 관계 표와 live 문장으로 모든 관찰 정보가 남고, fallback 문구가 표시됩니다. |
| 모션 감소를 존중하는가 | `implement` | `prefers-reduced-motion`에서 `data-motion-mode="instant"`/`snap`을 유지하고 즉시 단계 변경을 확인합니다. |
| 모바일에서 조작 가능한가 | `implement` | 320px·375px에서 버튼과 range가 화면 너비를 넘지 않고, 세로 순서로 조작할 수 있어야 합니다. |
| 키보드로 조작 가능한가 | `implement` | Tab으로 이전→range→초기화→다음→한 면씩 보기→시점 버튼 순서에 도달하고 Enter/Space/화살표로 상태를 변경합니다. |
| 안전 경계가 보이는가 | `not-needed` | 실제 종이의 두께·휘어짐·포장 강도·안전성을 보장하지 않는 기존 model note를 유지합니다. |

## Implementation boundary

- `FoldingScreen`의 내부 `setFoldStep`를 재사용하며 public props에 새 필드를 추가하지 않습니다.
- 초기화 버튼은 주요 학습 진행 버튼이 아니므로 `gi-pulse`를 붙이지 않습니다. 현재 `다음 면 접기`의 단일 pulse 계약을 유지합니다.
- `CubeFoldViewer`의 `aria-hidden` Canvas와 2D 표 대체 관계를 유지합니다.
- 마지막 단계의 `onComplete` 호출 수, 저장된 `foldStepIndex`, 판정 결과는 변경하지 않습니다.

## Verification matrix

| 상태 | 관찰 가능한 결과 | 합격 조건 |
| --- | --- | --- |
| 시작 | `0 / 5면 접힘`, 이전/초기화 disabled, 다음 enabled | 표에 미접힘 상태가 표시됨 |
| 1단계 | `1 / 5면 접힘`, status에 이동한 면과 모서리 | 관계 표의 해당 면만 settled 상태로 갱신 |
| 중간 단계 | range와 버튼이 같은 단계 값을 가리킴 | range change와 버튼 click의 `onStepChange`가 동일 값 |
| 초기화 | `0 / 5면 접힘`, `접기 전 상태로 돌아왔습니다.` | 이후 다시 다음 단계를 진행 가능 |
| 완료 | `5 / 5면 접힘`, 다음 disabled, 표의 최종 관계 | 기존 완료 callback 계약 유지 |
| reduced motion | `data-motion-mode="instant"` 및 snap viewer | 단계 변경이 지연 없이 보임 |
| WebGL 미지원 | 2D fallback 문구와 관계 표 | Canvas 의존 없이 학습 정보 유지 |

