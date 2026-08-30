export type UpdateCategory = '설계' | '개발' | '접근성' | '콘텐츠' | '기하 엔진';
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
/** Four numeric segments keep the year width check tractable in TypeScript. */
export type Year = `${number}${number}${number}${number}`;
export type Month = `0${Exclude<Digit, '0'>}` | `1${'0' | '1' | '2'}`;
export type Day = `0${Exclude<Digit, '0'>}` | `${'1' | '2'}${Digit}` | `3${'0' | '1'}`;
type JoinDateSegments<Y extends string, M extends string, D extends string> = `${Y}-${M}-${D}`;
export type IsoDate = JoinDateSegments<Year, Month, Day>;

export interface UpdateEntry {
  readonly date: IsoDate;
  readonly category: UpdateCategory;
  readonly summary: string;
}

export const CHANGELOG: readonly UpdateEntry[] = Object.freeze([
  Object.freeze({ date: '2026-08-26', category: '설계', summary: '최초 설계 문서 작성' }),
  Object.freeze({ date: '2026-08-26', category: '개발', summary: '정육면체 미션 8개와 판정·2D 대체 흐름 구현' }),
  Object.freeze({ date: '2026-08-27', category: '접근성', summary: '핵심 단계 강조·모션 감소·업데이트 내역 접근성 개선' }),
  Object.freeze({ date: '2026-08-27', category: '콘텐츠', summary: '선택형 진행 저장·교육 모형 한계·오프라인 경계 추가' }),
  Object.freeze({ date: '2026-08-27', category: '접근성', summary: '모바일·키보드·스크린 리더·2D 완료 흐름 검증' }),
  Object.freeze({ date: '2026-08-27', category: '개발', summary: '불가능한 접기 순서 복구·중첩 링크 오프라인 경계 강화' }),
  Object.freeze({ date: '2026-08-28', category: '개발', summary: '미션별 성취 상태와 근거 낱말 역할 정합성 개선' }),
  Object.freeze({ date: '2026-08-28', category: '접근성', summary: '접기 제목 포커스·어린이용 방향 표현·학습 진행 표시 추가' }),
  Object.freeze({ date: '2026-08-28', category: '기하 엔진', summary: '3D 보조 보기의 장면 중심과 읽을 수 있는 확대 계산 개선' }),
  Object.freeze({ date: '2026-08-28', category: '콘텐츠', summary: '완료 화면의 배운 점·다음에는 요약과 모바일 비교표 개선' }),
  Object.freeze({ date: '2026-08-28', category: '접근성', summary: 'VoiceOver 구현·검증 제외 범위와 자동화 접근성 기준 명시' }),
  Object.freeze({ date: '2026-08-29', category: '개발', summary: '학습 목적·단계 진행·미션 카드 위계를 정리하고 접기 조작 표면 개선' }),
  Object.freeze({ date: '2026-08-30', category: '개발', summary: '미션별 진행 단계와 수리 화면 표현을 학습자 중심으로 정리' }),
]);
