import type { FaceDefinition, FaceId, GridPoint, NetDefinition } from '../../src/domain/net/types';

type Cell = readonly [number, number];

const FACE_IDS: readonly FaceId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
const COLORS: readonly FaceDefinition['colorToken'][] = [
  'blue',
  'yellow',
  'green',
  'coral',
  'purple',
  'teal',
];
const SYMBOLS: readonly FaceDefinition['symbol'][] = [
  'circle',
  'triangle',
  'square',
  'star',
  'diamond',
  'cross',
];

const cellKey = ([x, y]: Cell): string => `${x},${y}`;

const compareCells = (a: Cell, b: Cell): number => a[1] - b[1] || a[0] - b[0];

const transformCell = (cell: Cell, rotation: 0 | 1 | 2 | 3, reflected: boolean): Cell => {
  const [x, y] = reflected ? [-cell[0], cell[1]] : cell;
  switch (rotation) {
    case 0:
      return [x, y];
    case 1:
      return [-y, x];
    case 2:
      return [-x, -y];
    case 3:
      return [y, -x];
  }
};

const normalizeCells = (cells: readonly Cell[]): string => {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells
    .map(([x, y]) => [x - minX, y - minY] as Cell)
    .sort(compareCells)
    .map(cellKey)
    .join(';');
};

const canonicalKey = (cells: readonly Cell[]): string => {
  const keys: string[] = [];
  for (const reflected of [false, true]) {
    for (const rotation of [0, 1, 2, 3] as const) {
      keys.push(normalizeCells(cells.map((cell) => transformCell(cell, rotation, reflected))));
    }
  }
  return keys.sort()[0] ?? '';
};

const parseKey = (key: string): Cell[] => key.split(';').map((value) => {
  const [x, y] = value.split(',').map(Number);
  return [x, y];
});

const neighbors = (cells: readonly Cell[]): Cell[] => {
  const occupied = new Set(cells.map(cellKey));
  const result = new Map<string, Cell>();
  for (const [x, y] of cells) {
    for (const candidate of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Cell[]) {
      if (!occupied.has(cellKey(candidate))) {
        result.set(cellKey(candidate), candidate);
      }
    }
  }
  return [...result.values()];
};

const toNet = (key: string): NetDefinition => {
  const cells = parseKey(key).sort(compareCells);
  return {
    faces: cells.map(([x, y], index) => ({
      id: FACE_IDS[index] as FaceId,
      grid: { x, y },
      colorToken: COLORS[index] as FaceDefinition['colorToken'],
      symbol: SYMBOLS[index] as FaceDefinition['symbol'],
      decorationQuarterTurn: 0,
    })),
  };
};

/** Exhaustively enumerates the 35 free hexominoes by canonicalizing D4 + translation. */
export const generateFreeHexominoes = (): readonly NetDefinition[] => {
  let shapes = new Map<string, Cell[]>([[canonicalKey([[0, 0]]), [[0, 0]]]]);
  for (let size = 1; size < 6; size += 1) {
    const next = new Map<string, Cell[]>();
    for (const shape of shapes.values()) {
      for (const cell of neighbors(shape)) {
        const expanded = [...shape, cell];
        const key = canonicalKey(expanded);
        if (!next.has(key)) {
          next.set(key, expanded);
        }
      }
    }
    shapes = next;
  }
  return [...shapes.keys()].sort().map(toNet);
};

export const transformNet = (
  net: NetDefinition,
  rotation: 0 | 1 | 2 | 3,
  reflected: boolean,
  offset: GridPoint = { x: 0, y: 0 },
): NetDefinition => ({
  faces: net.faces.map((face) => {
    const [x, y] = transformCell([face.grid.x, face.grid.y], rotation, reflected);
    return { ...face, grid: { x: x + offset.x, y: y + offset.y } };
  }),
});
