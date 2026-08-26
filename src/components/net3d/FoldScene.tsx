import { Edges } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import { Shape } from 'three';
import type { FaceId } from '../../domain/net/types';
import { applyCameraPose, buildCameraPose } from './cameraModel';
import type { SceneFace } from './sceneModel';
import {
  getCollisionPatternDescriptor,
  getDecorationShapeDescriptor,
  getSceneFaceEmphasis,
} from './sceneModel';
import type { CubeFoldView } from './CubeFoldViewer';

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
  readonly view: CubeFoldView;
  readonly baseFaceId?: FaceId;
  readonly movingFaceId?: FaceId;
  readonly hingeFaceId?: FaceId;
  readonly reducedMotion: boolean;
  readonly singleFaceMode: boolean;
}

const makeShape = (points: readonly (readonly [number, number])[]): Shape => {
  const shape = new Shape();
  const first = points[0];
  if (first === undefined) return shape;
  shape.moveTo(first[0], first[1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  return shape;
};

function CameraController({
  faces,
  view,
  baseFaceId,
}: Pick<FoldSceneProps, 'faces' | 'view' | 'baseFaceId'>): null {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    const baseFace = faces.find((face) => face.id === baseFaceId) ?? faces[0];
    const pose = buildCameraPose(view, baseFace);
    applyCameraPose(camera, pose, invalidate);
  }, [baseFaceId, camera, faces, invalidate, view]);
  return null;
}

/** Visual-only scene. It receives prepared transforms and never judges faces. */
export function FoldScene({
  faces,
  view,
  baseFaceId,
  movingFaceId,
  hingeFaceId,
  reducedMotion,
  singleFaceMode,
}: FoldSceneProps): React.JSX.Element {
  const collisionPattern = getCollisionPatternDescriptor();
  return (
    <group name="fold-scene" userData={{ motion: reducedMotion ? 'snap' : 'limited' }}>
      <CameraController faces={faces} view={view} baseFaceId={baseFaceId} />
      {faces.map((face) => {
        const { position, rotation } = face.transform;
        const emphasis = getSceneFaceEmphasis(face.id, face.collision, {
          singleFaceMode,
          baseFaceId,
          movingFaceId,
          hingeFaceId,
        });
        const opacity = emphasis === 'dim' ? 0.28 : 0.88;
        const decoration = getDecorationShapeDescriptor(face);
        return (
          <group
            key={face.id}
            name={`face-${face.id}`}
            position={position}
            rotation={rotation}
            userData={{
              faceId: face.id,
              status: face.status,
              emphasis,
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
            <mesh position={[0, 0, 0.04]} rotation={[0, 0, decoration.rotationRadians]}>
              <shapeGeometry args={[makeShape(decoration.points)]} />
              <meshBasicMaterial
                color="#27404d"
                opacity={opacity}
                transparent
                side={2}
              />
            </mesh>
            {face.collision && collisionPattern.stripeAngles.map((angle) => (
              <mesh
                key={`collision-stripe-${angle}`}
                position={[0, 0, 0.055]}
                rotation={[0, 0, angle]}
              >
                <planeGeometry args={[collisionPattern.stripeWidth, 0.82]} />
                <meshBasicMaterial color="#7f1d1d" opacity={0.85} transparent side={2} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
