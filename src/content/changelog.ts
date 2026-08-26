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
]);
