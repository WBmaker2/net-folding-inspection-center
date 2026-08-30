import type { SceneFace } from './sceneModel';

/**
 * Three.js materials cannot read CSS custom properties, so the visual scene
 * keeps its palette in one named module. The values mirror the face tokens in
 * `src/styles/net2d.css` and are intentionally separate from learning logic.
 */
export const SCENE_COLORS: Readonly<{
  readonly face: Readonly<Record<SceneFace['colorToken'], string>>;
  readonly ink: string;
  readonly collision: string;
}> = Object.freeze({
  face: Object.freeze({
    blue: '#7bc5ef',
    yellow: '#f5d45d',
    green: '#83d39a',
    coral: '#f28e78',
    purple: '#b59ae8',
    teal: '#6fcfc8',
  }),
  ink: '#27404d',
  collision: '#7f1d1d',
});
