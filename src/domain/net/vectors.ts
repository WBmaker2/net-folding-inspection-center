import type { GridPoint, Vec3 } from './types';

const addAxis = (a: Vec3[number], b: Vec3[number]): Vec3[number] => {
  const sum = a + b;
  if (sum < -1 || sum > 1) {
    throw new RangeError(`Vec3 component sum must be between -1 and 1; received ${sum}`);
  }
  return sum as Vec3[number];
};

export const addVec3 = (a: Vec3, b: Vec3): Vec3 => [
  addAxis(a[0], b[0]),
  addAxis(a[1], b[1]),
  addAxis(a[2], b[2]),
];

export const negateVec3 = (value: Vec3): Vec3 => [
  value[0] === 0 ? 0 : -value[0],
  value[1] === 0 ? 0 : -value[1],
  value[2] === 0 ? 0 : -value[2],
] as Vec3;

export const vec3Key = (value: Vec3): string => value.join(',');

export const gridKey = (point: GridPoint): string => `${point.x},${point.y}`;
