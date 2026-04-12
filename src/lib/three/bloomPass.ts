/**
 * @file src/lib/three/bloomPass.ts
 * @description UnrealBloomPass 생성 팩토리.
 *
 * 초보자 가이드:
 * - ForceGraph3D 인스턴스의 postProcessingComposer에 추가하여 발광 효과 적용
 * - strength/radius/threshold로 발광 강도 조정
 * - 노드 100개 초과 시 비활성화하여 성능 보호
 */
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createBloomPass(width: number, height: number): UnrealBloomPass {
  const pass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    1.2,  // strength: 발광 강도
    0.6,  // radius: 번짐 반경
    0.1,  // threshold: 최소 밝기 (낮을수록 많은 요소 빛남)
  );
  return pass;
}
