import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '../../config/theme'
import { useGameStore, type ActiveShot, type SwordTheme } from '../../store/useGameStore'
import {
  AUTO_SHOT_DURATION,
  AUTO_SHOT_ORDER,
  computeDirectorCamera,
  createDirectorCurve,
  findNearestT,
} from './directorPath'

const BASE_SPEED = 22
const BOOST_SPEED = 60
const YAW_RATE = 1.35
const PITCH_RATE = 1.0
const MIN_Y = -28
const MAX_Y = 160
const SPAWN_POS = new THREE.Vector3(0, 14, 38)

/** 随风与剑速实时摆动的动态剑穗（多节柔性链式丝绦 + 流苏尾穗） */
function DynamicTassel({ theme }: { theme: SwordTheme }) {
  const segRefs = useRef<(THREE.Group | null)[]>([])
  const cordColor = theme === 'jade' ? '#d93829' : '#f0b84d'
  const tipColor = theme === 'jade' ? PALETTE.jade : PALETTE.gold

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const boosting = useGameStore.getState().isBoosting
    const freq = boosting ? 14 : 7.5
    const amp = boosting ? 0.14 : 0.22
    for (let i = 0; i < 5; i++) {
      const seg = segRefs.current[i]
      if (!seg) continue
      const phase = t * freq - i * 0.85
      seg.rotation.y = Math.sin(phase) * amp * (1 + i * 0.16)
      seg.rotation.x = Math.cos(phase * 0.7) * amp * 0.55 - (boosting ? 0.02 : 0.08)
    }
  })

  return (
    <group position={[0, 0, 0.94]}>
      {/* 玉结 */}
      <mesh>
        <torusGeometry args={[0.048, 0.014, 8, 16]} />
        <meshStandardMaterial color={cordColor} roughness={0.5} />
      </mesh>
      {/* 5 节级联动态丝绦 */}
      <group
        ref={(el) => {
          segRefs.current[0] = el
        }}
        position={[0, 0, 0.04]}
      >
        <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.018, 0.2, 6]} />
          <meshStandardMaterial color={cordColor} roughness={0.6} />
        </mesh>
        <group
          ref={(el) => {
            segRefs.current[1] = el
          }}
          position={[0, 0, 0.2]}
        >
          <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.022, 0.22, 6]} />
            <meshStandardMaterial color={cordColor} roughness={0.6} />
          </mesh>
          <group
            ref={(el) => {
              segRefs.current[2] = el
            }}
            position={[0, 0, 0.22]}
          >
            <mesh position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.022, 0.032, 0.22, 7]} />
              <meshStandardMaterial color={cordColor} emissive={cordColor} emissiveIntensity={0.25} roughness={0.55} />
            </mesh>
            <group
              ref={(el) => {
                segRefs.current[3] = el
              }}
              position={[0, 0, 0.22]}
            >
              <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.032, 0.044, 0.24, 7]} />
                <meshStandardMaterial color={cordColor} emissive={tipColor} emissiveIntensity={0.45} roughness={0.5} />
              </mesh>
              <group
                ref={(el) => {
                  segRefs.current[4] = el
                }}
                position={[0, 0, 0.24]}
              >
                <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                  <coneGeometry args={[0.046, 0.26, 8]} />
                  <meshStandardMaterial color={tipColor} emissive={tipColor} emissiveIntensity={1.65} toneMapped={false} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/**
 * 精雕国风长剑（深玄铁/青钢金属质感 + 精细发光符文剑脊 + 祥云剑格 + 灵珠 + 动态剑穗）
 * 深色高反差金属剑身确保在明亮云海背景上轮廓分明、不再过曝融成白光，剑尖指向 -Z
 */
function SwordModel({ theme }: { theme: SwordTheme }) {
  const { blade, fuller, hilt } = useMemo(() => {
    // 剑身主轮廓（带斜角倒边，有立体棱线）
    const s = new THREE.Shape()
    s.moveTo(0, 2.35)
    s.lineTo(0.11, 1.85)
    s.lineTo(0.145, 0.08)
    s.lineTo(-0.145, 0.08)
    s.lineTo(-0.11, 1.85)
    s.closePath()
    const blade = new THREE.ExtrudeGeometry(s, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.015,
      bevelSegments: 2,
    })
    blade.translate(0, 0, -0.0225)
    blade.rotateX(-Math.PI / 2)

    // 剑脊中心发光灵槽
    const f = new THREE.Shape()
    f.moveTo(0, 2.1)
    f.lineTo(0.028, 1.72)
    f.lineTo(0.032, 0.14)
    f.lineTo(-0.032, 0.14)
    f.lineTo(-0.028, 1.72)
    f.closePath()
    const fuller = new THREE.ExtrudeGeometry(f, { depth: 0.095, bevelEnabled: false })
    fuller.translate(0, 0, -0.0475)
    fuller.rotateX(-Math.PI / 2)

    const hilt = new THREE.CylinderGeometry(0.038, 0.044, 0.68, 12)
    hilt.rotateX(Math.PI / 2)
    return { blade, fuller, hilt }
  }, [])

  const isJade = theme === 'jade'
  const metalColor = isJade ? '#1a2c38' : '#2e2318' // 深玄青钢 / 黑金青铜，与云海形成强烈明暗对比
  const glowColor = isJade ? PALETTE.jade : PALETTE.gold
  const guardMetal = isJade ? '#c8a258' : '#4a6b73'

  return (
    <group scale={1.25}>
      {/* 玄铁/青铜剑身 */}
      <mesh geometry={blade}>
        <meshStandardMaterial
          color={metalColor}
          emissive={glowColor}
          emissiveIntensity={0.22}
          metalness={0.9}
          roughness={0.22}
        />
      </mesh>
      {/* 剑脊发光符文线 */}
      <mesh geometry={fuller}>
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={2.1}
          toneMapped={false}
        />
      </mesh>

      {/* 祥云剑格（护手） */}
      <group position={[0, 0, 0.08]}>
        <mesh>
          <boxGeometry args={[0.62, 0.09, 0.14]} />
          <meshStandardMaterial color={guardMetal} metalness={0.85} roughness={0.28} />
        </mesh>
        {/* 护手两侧上翘云翼 */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.32, 0, -0.05]} rotation={[0, side * 0.45, 0]}>
            <boxGeometry args={[0.16, 0.07, 0.2]} />
            <meshStandardMaterial color={guardMetal} metalness={0.85} roughness={0.28} />
          </mesh>
        ))}
        {/* 护手中央灵珠 */}
        <mesh position={[0, 0.045, 0]}>
          <octahedronGeometry args={[0.068, 1]} />
          <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2.6} toneMapped={false} />
        </mesh>
      </group>

      {/* 缠绳剑柄 + 金环 */}
      <mesh geometry={hilt} position={[0, 0, 0.48]}>
        <meshStandardMaterial color="#2a1d14" roughness={0.85} />
      </mesh>
      {[0.28, 0.48, 0.68].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.046, 0.01, 8, 16]} />
          <meshStandardMaterial color={guardMetal} metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* 剑首 + 动态飘动剑穗 */}
      <mesh position={[0, 0, 0.86]}>
        <dodecahedronGeometry args={[0.082, 0]} />
        <meshStandardMaterial color={guardMetal} metalness={0.88} roughness={0.25} />
      </mesh>
      <DynamicTassel theme={theme} />
    </group>
  )
}

/** 飞剑 + 自由御剑操控（3种视角切换/WASD/空格/鼠标拖拽） + 导演自动巡航与电影级运镜 */
export function FlyingSword() {
  const group = useRef<THREE.Group>(null)
  const keys = useRef(new Set<string>())
  const swordTheme = useGameStore((s) => s.swordTheme)
  const resetToken = useGameStore((s) => s.resetToken)

  const directorCurve = useMemo(() => createDirectorCurve(), [])
  const curveLen = useMemo(() => directorCurve.getLength(), [directorCurve])

  const st = useRef({
    pos: SPAWN_POS.clone(),
    yaw: 0,
    pitch: -0.06,
    roll: 0,
    yawVel: 0,
    pitchVel: 0,
    speed: BASE_SPEED,
    fov: 55,
    look: new THREE.Vector3(0, 12, 10),
    camInit: false,
    lastHud: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    orbitYaw: 0,
    orbitPitch: 0,
    camDist: 5.4,
    wasDirector: false,
    curveT: 0,
    directorTime: 0,
    lastShot: 'orbit' as ActiveShot,
  })

  // 监听 R 键归位：回到主仙山亭台正前方
  useEffect(() => {
    if (resetToken === 0) return
    const s = st.current
    s.pos.copy(SPAWN_POS)
    s.yaw = 0
    s.pitch = -0.06
    s.roll = 0
    s.yawVel = 0
    s.pitchVel = 0
    s.orbitYaw = 0
    s.orbitPitch = 0
    s.camInit = false
  }, [resetToken])

  // 精致流光配色（降低倍乘系数，防止过曝淹没剑身）
  const primaryTrail = useMemo(
    () => new THREE.Color(swordTheme === 'jade' ? PALETTE.jade : PALETTE.gold).multiplyScalar(1.65),
    [swordTheme],
  )
  const coreTrail = useMemo(
    () => new THREE.Color(swordTheme === 'jade' ? PALETTE.gold : PALETTE.jade).multiplyScalar(1.45),
    [swordTheme],
  )

  const tmp = useMemo(
    () => ({
      q: new THREE.Quaternion(),
      e: new THREE.Euler(0, 0, 0, 'YXZ'),
      fwd: new THREE.Vector3(),
      off: new THREE.Vector3(),
      want: new THREE.Vector3(),
      dirLook: new THREE.Vector3(),
      curvePt: new THREE.Vector3(),
      curveTan: new THREE.Vector3(),
      curveTanNext: new THREE.Vector3(),
    }),
    [],
  )

  // 全局键盘 + 鼠标拖拽视角监听
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
        keys.current.add(e.code)
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const clear = () => {
      keys.current.clear()
      st.current.dragging = false
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement)?.closest('button')) return
      st.current.dragging = true
      st.current.lastX = e.clientX
      st.current.lastY = e.clientY
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!st.current.dragging) return
      const dx = e.clientX - st.current.lastX
      const dy = e.clientY - st.current.lastY
      st.current.lastX = e.clientX
      st.current.lastY = e.clientY
      st.current.orbitYaw -= dx * 0.0055
      st.current.orbitPitch = THREE.MathUtils.clamp(st.current.orbitPitch + dy * 0.004, -0.65, 0.75)
    }
    const onPointerUp = () => {
      st.current.dragging = false
    }
    const onWheel = (e: WheelEvent) => {
      const store = useGameStore.getState()
      if (store.mode !== 'free' || store.viewMode !== 'third') return
      st.current.camDist = THREE.MathUtils.clamp(st.current.camDist + e.deltaY * 0.004, 3.6, 14)
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = st.current
    const k = keys.current
    const g = group.current
    if (!g) return

    const store = useGameStore.getState()
    const isDirector = store.mode === 'director'
    const cam = state.camera as THREE.PerspectiveCamera

    if (isDirector) {
      if (!s.wasDirector) {
        s.curveT = findNearestT(directorCurve, s.pos)
        s.directorTime = 0
        s.wasDirector = true
      }
      s.directorTime += dt

      directorCurve.getPointAt(s.curveT, tmp.curvePt)
      directorCurve.getTangentAt(s.curveT, tmp.curveTan)
      directorCurve.getTangentAt((s.curveT + 0.015) % 1, tmp.curveTanNext)

      const diving = tmp.curveTan.y < -0.18 || tmp.curvePt.y < 2
      const targetSpeed = diving ? 42 : 28
      if (store.isBoosting !== diving) store.setBoosting(diving)

      s.speed += (targetSpeed - s.speed) * (1 - Math.exp(-2.2 * dt))
      s.curveT = (s.curveT + (s.speed * dt) / curveLen) % 1
      directorCurve.getPointAt(s.curveT, tmp.curvePt)
      directorCurve.getTangentAt(s.curveT, tmp.curveTan)

      s.pos.lerp(tmp.curvePt, 1 - Math.exp(-5.5 * dt))

      const targetYaw = Math.atan2(-tmp.curveTan.x, -tmp.curveTan.z)
      const targetPitch = Math.asin(THREE.MathUtils.clamp(tmp.curveTan.y, -0.95, 0.95))
      const yawNow = Math.atan2(-tmp.curveTan.x, -tmp.curveTan.z)
      const yawNext = Math.atan2(-tmp.curveTanNext.x, -tmp.curveTanNext.z)
      let dYaw = yawNext - yawNow
      while (dYaw > Math.PI) dYaw -= Math.PI * 2
      while (dYaw < -Math.PI) dYaw += Math.PI * 2
      const targetRoll = THREE.MathUtils.clamp(dYaw * 2.6, -0.75, 0.75)

      let yawDiff = targetYaw - s.yaw
      while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
      while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
      s.yaw += yawDiff * (1 - Math.exp(-6 * dt))
      s.pitch += (targetPitch - s.pitch) * (1 - Math.exp(-6 * dt))
      s.roll += (targetRoll - s.roll) * (1 - Math.exp(-4.5 * dt))

      tmp.e.set(s.pitch, s.yaw, s.roll)
      tmp.q.setFromEuler(tmp.e)
      tmp.fwd.set(0, 0, -1).applyQuaternion(tmp.q)

      g.position.copy(s.pos)
      g.quaternion.copy(tmp.q)
      g.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.04

      const activeShot: ActiveShot =
        store.shot === 'auto'
          ? AUTO_SHOT_ORDER[Math.floor(s.directorTime / AUTO_SHOT_DURATION) % AUTO_SHOT_ORDER.length]
          : store.shot

      if (s.lastShot !== activeShot) {
        s.lastShot = activeShot
        store.setActiveShot(activeShot)
      }

      const targetFov = computeDirectorCamera(activeShot, s.pos, tmp.fwd, s.directorTime, tmp.want, tmp.dirLook)
      if (!s.camInit) {
        cam.position.copy(tmp.want)
        s.look.copy(tmp.dirLook)
        s.camInit = true
      }
      cam.position.lerp(tmp.want, 1 - Math.exp(-3.2 * dt))
      s.look.lerp(tmp.dirLook, 1 - Math.exp(-5.5 * dt))
      cam.lookAt(s.look)
      s.fov += (targetFov - s.fov) * (1 - Math.exp(-3 * dt))
      cam.fov = s.fov
      cam.updateProjectionMatrix()
    } else {
      // 自由御剑模式
      s.wasDirector = false

      const yawIn = (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0)
      const pitchIn = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0)
      const boosting = k.has('Space')

      if (store.isBoosting !== boosting) store.setBoosting(boosting)

      s.yawVel += (yawIn * YAW_RATE - s.yawVel) * (1 - Math.exp(-5 * dt))
      s.pitchVel += (pitchIn * PITCH_RATE - s.pitchVel) * (1 - Math.exp(-5 * dt))
      s.yaw += s.yawVel * dt
      s.pitch = THREE.MathUtils.clamp(s.pitch + s.pitchVel * dt, -1.15, 1.15)
      if (!pitchIn) s.pitch *= Math.exp(-0.25 * dt)
      s.roll += (THREE.MathUtils.clamp(s.yawVel * 0.55, -0.7, 0.7) - s.roll) * (1 - Math.exp(-4 * dt))

      s.speed += ((boosting ? BOOST_SPEED : BASE_SPEED) - s.speed) * (1 - Math.exp(-2.5 * dt))
      tmp.e.set(s.pitch, s.yaw, s.roll)
      tmp.q.setFromEuler(tmp.e)
      tmp.fwd.set(0, 0, -1).applyQuaternion(tmp.q)
      s.pos.addScaledVector(tmp.fwd, s.speed * dt)
      s.pos.y = THREE.MathUtils.clamp(s.pos.y, MIN_Y, MAX_Y)

      g.position.copy(s.pos)
      g.quaternion.copy(tmp.q)
      g.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.035

      if (!s.dragging) {
        const rec = Math.exp(-1.5 * dt)
        s.orbitYaw *= rec
        s.orbitPitch *= rec
      }

      const boostK = THREE.MathUtils.clamp((s.speed - BASE_SPEED) / (BOOST_SPEED - BASE_SPEED), 0, 1)
      const viewMode = store.viewMode

      if (viewMode === 'first') {
        // 踏剑第一人称：脚踏飞剑，低头即可见剑身与剑尖破云
        tmp.e.set(s.pitch * 0.8 + s.orbitPitch, s.yaw + s.orbitYaw, s.roll * 0.25)
        tmp.q.setFromEuler(tmp.e)
        tmp.off.set(0, 1.25, 0.65).applyQuaternion(tmp.q)
        tmp.want.copy(s.pos).add(tmp.off)
        cam.position.lerp(tmp.want, 1 - Math.exp(-14 * dt))
        tmp.off.set(0, -0.25, -12).applyQuaternion(tmp.q)
        tmp.dirLook.copy(cam.position).add(tmp.off)
        s.look.lerp(tmp.dirLook, 1 - Math.exp(-14 * dt))
        cam.lookAt(s.look)
        s.fov += (66 + boostK * 18 - s.fov) * (1 - Math.exp(-4 * dt))
      } else if (viewMode === 'nose') {
        // 剑尖疾驰视角：极简纯风光沉浸飞行
        tmp.e.set(s.pitch + s.orbitPitch, s.yaw + s.orbitYaw, s.roll * 0.35)
        tmp.q.setFromEuler(tmp.e)
        tmp.off.set(0, 0.45, -2.2).applyQuaternion(tmp.q)
        tmp.want.copy(s.pos).add(tmp.off)
        cam.position.lerp(tmp.want, 1 - Math.exp(-16 * dt))
        tmp.off.set(0, 0, -24).applyQuaternion(tmp.q)
        tmp.dirLook.copy(cam.position).add(tmp.off)
        s.look.lerp(tmp.dirLook, 1 - Math.exp(-16 * dt))
        cam.lookAt(s.look)
        s.fov += (70 + boostK * 18 - s.fov) * (1 - Math.exp(-4 * dt))
      } else {
        // 第三人称近景跟拍：略偏右上方构图，清晰展现玄铁飞剑细节，不遮挡前方仙山
        tmp.e.set(s.pitch * 0.55 + s.orbitPitch, s.yaw + s.orbitYaw, 0)
        tmp.q.setFromEuler(tmp.e)
        tmp.off.set(0.65, 1.35 + boostK * 0.25, s.camDist + boostK * 2.2).applyQuaternion(tmp.q)
        tmp.want.copy(s.pos).add(tmp.off)
        if (!s.camInit) {
          cam.position.copy(tmp.want)
          s.look.copy(s.pos)
          s.camInit = true
        }
        cam.position.lerp(tmp.want, 1 - Math.exp(-6.5 * dt))
        tmp.want.copy(s.pos).addScaledVector(tmp.fwd, s.dragging ? 1.5 : 8)
        s.look.lerp(tmp.want, 1 - Math.exp(-9 * dt))
        cam.lookAt(s.look)
        s.fov += (54 + boostK * 18 - s.fov) * (1 - Math.exp(-4 * dt))
      }

      cam.fov = s.fov
      cam.updateProjectionMatrix()
    }

    const now = state.clock.elapsedTime
    if (now - s.lastHud > 0.15) {
      s.lastHud = now
      store.setSpeed(Math.round(s.speed))
    }
  })

  return (
    <group ref={group} position={[SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z]}>
      <SwordModel theme={swordTheme} />
      <pointLight
        color={swordTheme === 'jade' ? PALETTE.jade : PALETTE.gold}
        intensity={12}
        distance={22}
        position={[0, 0.3, -0.5]}
      />
      {/* 精致流光拖尾：宽度克制，不淹没剑身 */}
      <Trail key={`outer-${swordTheme}`} width={1.35} length={14} color={primaryTrail} attenuation={(t) => t * t}>
        <object3D position={[0, 0, 1.25]} />
      </Trail>
      <Trail key={`inner-${swordTheme}`} width={0.42} length={9} color={coreTrail} attenuation={(t) => t}>
        <object3D position={[0, 0, 1.25]} />
      </Trail>
    </group>
  )
}
