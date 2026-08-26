export type UpdateCategory = '설계' | '개발' | '접근성' | '콘텐츠' | '기하 엔진';

export interface UpdateEntry {
  readonly date: `${number}-${number}-${number}`;
  readonly category: UpdateCategory;
  readonly summary: string;
}

export const CHANGELOG: readonly UpdateEntry[] = Object.freeze([
  Object.freeze({ date: '2026-08-26', category: '설계', summary: '최초 설계 문서 작성' }),
  Object.freeze({ date: '2026-08-26', category: '개발', summary: '정육면체 미션 8개와 판정·2D 대체 흐름 구현' }),
  Object.freeze({ date: '2026-08-27', category: '접근성', summary: '핵심 단계 강조·모션 감소·업데이트 내역 접근성 개선' }),
]);
