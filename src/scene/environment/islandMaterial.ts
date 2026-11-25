import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

const T = '/textures/'
const URLS = [
  T + 'cliff_side_diff.jpg', T + 'cliff_side_nor_gl.jpg', T + 'cliff_side_rough.jpg',
  T + 'aerial_grass_rock_diff.jpg', T + 'aerial_grass_rock_nor_gl.jpg', T + 'aerial_grass_rock_rough.jpg',
]

/**
 * 仙山 PBR 材质（Poly Haven CC0：cliff_side 岩壁 + aerial_grass_rock 草甸）：
 * 无 UV 的程序化网格使用三平面（triplanar）映射采样 漫反射/法线/粗糙度，
 * 顶点属性 aGrass 决定山巅草甸与岩壁的混合，顶点色仅作为明暗/色相微调。
 */
export function useIslandMaterial() {
  const tex = useTexture(URLS)
  return useMemo(() => {
    tex.forEach((t, i) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 8
      t.colorSpace = i % 3 === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
      t.needsUpdate = true
    })
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 })
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.tRockD = { value: tex[0] }
      sh.uniforms.tRockN = { value: tex[1] }
      sh.uniforms.tRockR = { value: tex[2] }
      sh.uniforms.tGrassD = { value: tex[3] }
      sh.uniforms.tGrassN = { value: tex[4] }
      sh.uniforms.tGrassR = { value: tex[5] }
      sh.uniforms.uRockScale = { value: 0.09 }
      sh.uniforms.uGrassScale = { value: 0.15 }

      sh.vertexShader = sh.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute float aGrass;
          varying float vGrass; varying vec3 vObjP; varying vec3 vObjN;
          varying vec3 vNX; varying vec3 vNY; varying vec3 vNZ;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vGrass = aGrass; vObjP = position; vObjN = normal;
          vNX = normalMatrix * vec3(1.0, 0.0, 0.0);
          vNY = normalMatrix * vec3(0.0, 1.0, 0.0);
          vNZ = normalMatrix * vec3(0.0, 0.0, 1.0);`,
        )

      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D tRockD, tRockN, tRockR, tGrassD, tGrassN, tGrassR;
          uniform float uRockScale, uGrassScale;
          varying float vGrass; varying vec3 vObjP; varying vec3 vObjN;
          varying vec3 vNX; varying vec3 vNY; varying vec3 vNZ;
          vec3 safeNorm(vec3 v) {
            float l = length(v);
            return l > 1e-5 ? v / l : vec3(0.0, 1.0, 0.0);
          }
          vec4 triSample(sampler2D t, vec3 p, vec3 w, float s) {
            return texture2D(t, p.zy * s) * w.x + texture2D(t, p.xz * s) * w.y + texture2D(t, p.xy * s) * w.z;
          }
          vec3 triNormal(sampler2D t, vec3 p, vec3 n, vec3 w, float s) {
            vec3 tx = texture2D(t, p.zy * s).xyz * 2.0 - 1.0;
            vec3 ty = texture2D(t, p.xz * s).xyz * 2.0 - 1.0;
            vec3 tz = texture2D(t, p.xy * s).xyz * 2.0 - 1.0;
            tx = vec3(tx.xy + n.zy, abs(tx.z) * n.x);
            ty = vec3(ty.xy + n.xz, abs(ty.z) * n.y);
            tz = vec3(tz.xy + n.xy, abs(tz.z) * n.z);
            return safeNorm(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z);
          }`,
        )
        .replace(
          '#include <map_fragment>',
          `vec3 tpN = safeNorm(vObjN);
          vec3 tpA = abs(tpN);
          vec3 tpW = tpA * tpA; tpW *= tpW;
          tpW /= max(tpW.x + tpW.y + tpW.z, 1e-5);
          float gm = smoothstep(0.35, 0.65, vGrass);
          // 双尺度混合打散平铺重复感
          vec3 rockC = triSample(tRockD, vObjP, tpW, uRockScale).rgb * 0.6 + triSample(tRockD, vObjP, tpW, uRockScale * 0.31).rgb * 0.4;
          vec3 grassC = triSample(tGrassD, vObjP, tpW, uGrassScale).rgb * 0.6 + triSample(tGrassD, vObjP, tpW, uGrassScale * 0.37).rgb * 0.4;
          diffuseColor.rgb *= mix(rockC, grassC, gm) * 1.25;
          float tpRough = clamp(mix(triSample(tRockR, vObjP, tpW, uRockScale).r, triSample(tGrassR, vObjP, tpW, uGrassScale).r, gm), 0.08, 1.0);
          vec3 tpNormalObj = safeNorm(mix(
            triNormal(tRockN, vObjP, tpN, tpW, uRockScale),
            triNormal(tGrassN, vObjP, tpN, tpW, uGrassScale), gm));`,
        )
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * tpRough;')
        .replace(
          '#include <normal_fragment_maps>',
          'normal = safeNorm(vNX * tpNormalObj.x + vNY * tpNormalObj.y + vNZ * tpNormalObj.z);',
        )
    }
    mat.customProgramCacheKey = () => 'island-triplanar'
    return mat
  }, [tex])
}
