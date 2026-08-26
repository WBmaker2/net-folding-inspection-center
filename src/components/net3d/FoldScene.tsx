import { Edges } from '@react-three/drei';
import type { SceneFace } from './sceneModel';

const FACE_COLORS: Readonly<Record<SceneFace['colorToken'], string>> = {
  blue: '#7bc5ef',
  yellow: '#f5d45d',
  green: '#83d39a',
  coral: '#f28e78',
  purple: '#b59ae8',
  teal: '#6fcfc8',
};

interface FoldSceneProps {
  readonly faces: readonly SceneFace[];
  readonly reducedMotion: boolean;
  readonly singleFaceMode: boolean;
}

/** Visual-only scene. It receives prepared transforms and never judges faces. */
export function FoldScene({
  faces,
  reducedMotion,
  singleFaceMode,
}: FoldSceneProps): React.JSX.Element {
  return (
    <group name="fold-scene" userData={{ motion: reducedMotion ? 'snap' : 'limited' }}>
      {faces.map((face) => {
        const { position, rotation } = face.transform;
        const opacity = singleFaceMode && !face.active && !face.collision ? 0.28 : 0.88;
        return (
          <group
            key={face.id}
            name={`face-${face.id}`}
            position={position}
            rotation={rotation}
            userData={{
              faceId: face.id,
              status: face.status,
              symbol: face.symbol,
              // A static data marker makes the non-colour collision cue explicit.
              collisionCue: face.collision ? 'bold-patterned-edge' : undefined,
            }}
          >
            <mesh>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                color={FACE_COLORS[face.colorToken]}
                transparent
                opacity={opacity}
                side={2}
              />
              <Edges color={face.collision ? '#7f1d1d' : '#27404d'} linewidth={face.collision ? 3 : 1} />
            </mesh>
            <mesh scale={face.collision ? [0.72, 0.72, 1] : [0.52, 0.52, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                color={face.collision ? '#7f1d1d' : '#27404d'}
                transparent
                opacity={face.collision ? 0.5 : 0.22}
                wireframe
                side={2}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
