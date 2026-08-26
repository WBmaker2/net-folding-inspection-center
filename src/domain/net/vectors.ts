import type { GridPoint, Vec3 } from './types';

export const addVec3 = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
] as Vec3;

export const negateVec3 = (value: Vec3): Vec3 => [
  value[0] === 0 ? 0 : -value[0],
  value[1] === 0 ? 0 : -value[1],
  value[2] === 0 ? 0 : -value[2],
] as Vec3;

export const vec3Key = (value: Vec3): string => value.join(',');

export const gridKey = (point: GridPoint): string => `${point.x},${point.y}`;
