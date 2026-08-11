"use client"

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { COLOR_HEX, PITCH_DEG, type ShedConfig, computeMateriales } from "@/lib/shed-config"

// Shared unit geometry -> every beam reuses it (scaled), keeping draw setup cheap.
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const UP = new THREE.Vector3(0, 1, 0)

type Seg = [THREE.Vector3, THREE.Vector3, number] // start, end, thickness

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

function v(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z)
}

// Planar lattice (Warren-style) between two chord endpoints, offset along `perp`.
function lattice(
  a: THREE.Vector3,
  b: THREE.Vector3,
  perp: THREE.Vector3,
  depth: number,
  panels: number,
  chordT: number,
  webT: number,
): Seg[] {
  const segs: Seg[] = []
  const half = perp.clone().multiplyScalar(depth / 2)
  const aF = a.clone().add(half)
  const aB = a.clone().sub(half)
  const bF = b.clone().add(half)
  const bB = b.clone().sub(half)
  segs.push([aF, bF, chordT])
  segs.push([aB, bB, chordT])
  for (let i = 0; i < panels; i++) {
    const t0 = i / panels
    const t1 = (i + 1) / panels
    const f0 = aF.clone().lerp(bF, t0)
    const f1 = aF.clone().lerp(bF, t1)
    const k0 = aB.clone().lerp(bB, t0)
    const k1 = aB.clone().lerp(bB, t1)
    segs.push([f0, k0, webT]) // rung
    segs.push(i % 2 === 0 ? [k0, f1, webT] : [f0, k1, webT]) // diagonal
  }
  segs.push([bF, bB, chordT])
  return segs
}

// Simple planar truss between a bottom chord and a top chord line (web + diagonals).
function trussWeb(
  bottomFn: (x: number) => number,
  topFn: (x: number) => number,
  xL: number,
  xR: number,
  z: number,
  panels: number,
  webT: number,
): Seg[] {
  const segs: Seg[] = []
  for (let i = 0; i <= panels; i++) {
    const x = THREE.MathUtils.lerp(xL, xR, i / panels)
    segs.push([v(x, bottomFn(x), z), v(x, topFn(x), z), webT]) // vertical
    if (i < panels) {
      const x2 = THREE.MathUtils.lerp(xL, xR, (i + 1) / panels)
      segs.push([v(x, bottomFn(x), z), v(x2, topFn(x2), z), webT]) // diagonal
    }
  }
  return segs
}

interface Built {
  slab: { w: number; l: number }
  bases: Seg[]
  columns: Seg[]
  trusses: Seg[]
  roof: Seg[] // purlins + bracing that reveal with roof
  panels: { pos: [number, number, number]; rot: [number, number, number]; w: number; l: number }[]
  walls: { pos: [number, number, number]; rot: [number, number, number]; shape: THREE.Shape }[]
  flanges: { pos: [number, number, number]; w: number; h: number; d: number }[]
  flashings: { pos: [number, number, number]; rotZ: number; h: number }[]
}

function useBuilt(config: ShedConfig): Built {
  return useMemo(() => {
    const { width: W, length: L, height: H, type } = config
    const pitch = (PITCH_DEG * Math.PI) / 180
    const { frames } = computeMateriales(config)

    const halfW = W / 2
    const halfL = L / 2
    const gableRise = halfW * Math.tan(pitch)
    const shedRise = W * Math.tan((8 * Math.PI) / 180)

    // Frame positions along length
    const framesZ: number[] = []
    for (let i = 0; i < frames; i++) framesZ.push(THREE.MathUtils.lerp(-halfL, halfL, i / (frames - 1)))

    const colDepth = 0.5
    const chordT = 0.13
    const webT = 0.07
    const colPanels = clamp(Math.round(H / 1.0), 3, 9)
    const trussPanels = clamp(Math.round(W / 1.6), 5, 22)

    const outX = halfW + colDepth / 2
    const trussDepth = 0.8
    const slope = Math.tan(pitch)
    const shedSlope = Math.tan((8 * Math.PI) / 180)

    const topFn = (x: number) => {
      if (type === "gable" || type === "gable_portico") return H + slope * (outX - Math.abs(x))
      return H + shedSlope * (x + outX)
    }
    const verticalDepth = trussDepth / Math.cos(pitch)
    const bottomFn = (x: number) => {
      if (type === "gable_portico") return topFn(x) - verticalDepth
      return H
    }

    const eaveL = type === "gable_portico" ? bottomFn(-halfW) : H
    const eaveR = type === "gable_portico" ? bottomFn(halfW) : (type === "gable" ? H : topFn(halfW))
    const outL = halfL + chordT / 2

    const bases: Seg[] = []
    const columns: Seg[] = []
    const trusses: Seg[] = []
    const roof: Seg[] = []
    const flanges: Built["flanges"] = []
    const flashings: Built["flashings"] = []

    // Columns + bases
    for (const z of framesZ) {
      const sides: [number, number][] = [
        [-halfW, eaveL],
        [halfW, eaveR],
      ]
      for (const [x, top] of sides) {
        // perp = X axis -> lattice face (celosía) sits in the X-Y plane so the wide,
        // diagonal-braced face points toward a front-facing camera (columns rotated 90° on their vertical axis).
        columns.push(...lattice(v(x, 0.3, z), v(x, top, z), v(1, 0, 0), colDepth, colPanels, chordT, webT))
        // base plate as 4 short stubs forming a box footprint
        bases.push([v(x - 0.35, 0.14, z - 0.35), v(x + 0.35, 0.14, z - 0.35), 0.28])
        bases.push([v(x - 0.35, 0.14, z + 0.35), v(x + 0.35, 0.14, z + 0.35), 0.28])
      }
    }

    // Trusses (cabreadas)
    for (const z of framesZ) {
      if (type === "gable_portico") {
        // bottom chord
        trusses.push([v(-outX, bottomFn(-outX), z), v(0, bottomFn(0), z), chordT])
        trusses.push([v(0, bottomFn(0), z), v(outX, bottomFn(outX), z), chordT])
        // top chord
        trusses.push([v(-outX, topFn(-outX), z), v(0, topFn(0), z), chordT])
        trusses.push([v(0, topFn(0), z), v(outX, topFn(outX), z), chordT])
        
        // Vertical closing member (montante vertical en cumbrera)
        trusses.push([v(0, bottomFn(0), z), v(0, topFn(0), z), chordT])
        
        // Flange plate (chapa de unión/brida en el centro)
        const fH = (topFn(0) - bottomFn(0)) + 0.05
        const fY = (topFn(0) + bottomFn(0)) / 2
        flanges.push({ pos: [0, fY, z], w: 0.04, h: fH, d: chordT + 0.08 })

        // truss web in symmetric halves
        const halfPanels = Math.max(3, Math.floor(trussPanels / 2))
        trusses.push(...trussWeb(bottomFn, topFn, 0, -outX, z, halfPanels, webT))
        trusses.push(...trussWeb(bottomFn, topFn, 0, outX, z, halfPanels, webT))
      } else {
        // bottom chord
        trusses.push([v(-outX, H, z), v(outX, H, z), chordT])
        if (type === "gable") {
          trusses.push([v(-outX, H, z), v(0, topFn(0), z), chordT])
          trusses.push([v(0, topFn(0), z), v(outX, H, z), chordT])
        } else {
          trusses.push([v(-outX, topFn(-outX), z), v(outX, topFn(outX), z), chordT])
        }
        // truss web
        trusses.push(...trussWeb(bottomFn, topFn, -outX, outX, z, trussPanels, webT))
      }
    }

    // Purlins (correas) running lengthwise along the roof slope
    const purlinT = 0.09
    const makePurlinRun = (xStart: number, xEnd: number) => {
      const slope = Math.hypot(xEnd - xStart, topFn(xEnd) - topFn(xStart))
      const n = clamp(Math.round(slope / 1.6), 3, 14)
      for (let i = 0; i <= n; i++) {
        const x = THREE.MathUtils.lerp(xStart, xEnd, i / n)
        const y = topFn(x) + 0.12
        roof.push([v(x, y, -outL), v(x, y, outL), purlinT])
        
        // Soquetes / soportes para correas sobre la cabreada
        if (type === "gable_portico") {
          for (const z of framesZ) {
            trusses.push([v(x, topFn(x), z), v(x, topFn(x) + 0.08, z), webT])
          }
        }
      }
    }
    if (type === "gable" || type === "gable_portico") {
      makePurlinRun(-outX, 0)
      makePurlinRun(0, outX)
    } else {
      makePurlinRun(-outX, outX)
    }

    // Longitudinal eave beams + side cross bracing (reveal with roof stage)
    roof.push([v(-outX, topFn(-outX) - 0.15, -outL), v(-outX, topFn(-outX) - 0.15, outL), chordT])
    roof.push([v(outX, topFn(outX) - 0.15, -outL), v(outX, topFn(outX) - 0.15, outL), chordT])
    // cross bracing on side walls (first bay each side)
    if (framesZ.length >= 2) {
      const z0 = framesZ[0]
      const z1 = framesZ[1]
      // Move to inner flange if walls are present so they don't clip through the exterior cladding
      const bracingLeftX = config.walls ? -halfW + colDepth/2 : -halfW
      const bracingRightX = config.walls ? halfW - colDepth/2 : halfW

      roof.push([v(bracingLeftX, 0.5, z0), v(bracingLeftX, eaveL, z1), webT])
      roof.push([v(bracingLeftX, eaveL, z0), v(bracingLeftX, 0.5, z1), webT])
      roof.push([v(bracingRightX, 0.5, z0), v(bracingRightX, eaveR, z1), webT])
      roof.push([v(bracingRightX, eaveR, z0), v(bracingRightX, 0.5, z1), webT])
    }

    // Roof sheeting panels
    const roofOffset = 0.18
    const panels: Built["panels"] = []
    if (type === "gable" || type === "gable_portico") {
      const slopeLen = outX / Math.cos(pitch)
      const centerHeight = topFn(outX / 2)
      panels.push({
        pos: [-outX / 2, centerHeight + roofOffset, 0],
        rot: [0, 0, pitch],
        w: slopeLen,
        l: 2 * outL,
      })
      panels.push({
        pos: [outX / 2, centerHeight + roofOffset, 0],
        rot: [0, 0, -pitch],
        w: slopeLen,
        l: 2 * outL,
      })
    } else {
      const slopeLen = (2 * outX) / Math.cos(shedSlope)
      const centerHeight = topFn(0)
      panels.push({
        pos: [0, centerHeight + roofOffset, 0],
        rot: [0, 0, shedSlope],
        w: slopeLen,
        l: 2 * outL,
      })
    }

    // Wall cladding shapes with geometric offset to prevent Z-fighting
    const wallOffset = 0.08 // Increased to 0.08m
    const cornerOverlap = 0.05 // Extra width to seal corners perfectly
    const wallVerticalOverlap = 0.22 // Increased extra height to reach the roof panels perfectly
    const wallX = outX + wallOffset
    const wallZ = outL + wallOffset
    const walls: Built["walls"] = []

    const makeRect = (w: number, h: number) => {
      const shape = new THREE.Shape()
      shape.moveTo(-w / 2, 0)
      shape.lineTo(w / 2, 0)
      shape.lineTo(w / 2, h + wallVerticalOverlap)
      shape.lineTo(-w / 2, h + wallVerticalOverlap)
      shape.closePath()
      return shape
    }

    const makeWallShape = (xStart: number, xEnd: number) => {
      const shape = new THREE.Shape()
      // Extend X slightly to seal corners
      shape.moveTo(xStart - cornerOverlap, 0)
      shape.lineTo(xEnd + cornerOverlap, 0)
      const segments = 20
      for (let i = 0; i <= segments; i++) {
        const u = 1 - (i / segments)
        const x = THREE.MathUtils.lerp(xStart - cornerOverlap, xEnd + cornerOverlap, u)
        shape.lineTo(x, topFn(x) + wallVerticalOverlap)
      }
      shape.closePath()
      return shape
    }

    if (config.walls) {
      walls.push({ pos: [-wallX, 0, 0], rot: [0, -Math.PI / 2, 0], shape: makeRect(2 * wallZ + cornerOverlap * 2, topFn(-wallX)) })
      walls.push({ pos: [wallX, 0, 0], rot: [0, Math.PI / 2, 0], shape: makeRect(2 * wallZ + cornerOverlap * 2, topFn(wallX)) })
      
      if (!config.gateBack) {
        walls.push({ pos: [0, 0, -wallZ], rot: [0, 0, 0], shape: makeWallShape(-wallX, wallX) })
      }
    }
    
    if (config.gate || config.gateBack) {
      const gateW = Math.min(6, W * 0.4)
      const gateH = clamp(H * 0.8, 3, 5)
      
      // Top header panel over the gate (shared for both front and back)
      const headerShape = new THREE.Shape()
      headerShape.moveTo(-gateW / 2, gateH)
      headerShape.lineTo(gateW / 2, gateH)
      const segments = 10
      for (let i = 0; i <= segments; i++) {
        const u = 1 - (i / segments)
        const x = THREE.MathUtils.lerp(-gateW / 2, gateW / 2, u)
        headerShape.lineTo(x, topFn(x) + wallVerticalOverlap)
      }
      headerShape.closePath()
      
      if (config.gate) {
        // Front Gate Side panels + Header
        walls.push({ pos: [0, 0, wallZ], rot: [0, 0, 0], shape: makeWallShape(-wallX, -gateW / 2) })
        walls.push({ pos: [0, 0, wallZ], rot: [0, 0, 0], shape: makeWallShape(gateW / 2, wallX) })
        walls.push({ pos: [0, 0, wallZ], rot: [0, 0, 0], shape: headerShape })
      }
      
      if (config.gateBack) {
        // Back Gate Side panels + Header
        walls.push({ pos: [0, 0, -wallZ], rot: [0, 0, 0], shape: makeWallShape(-wallX, -gateW / 2) })
        walls.push({ pos: [0, 0, -wallZ], rot: [0, 0, 0], shape: makeWallShape(gateW / 2, wallX) })
        walls.push({ pos: [0, 0, -wallZ], rot: [0, 0, 0], shape: headerShape })
      }
    }

    if (config.walls || config.gate || config.gateBack) {
      flashings.push({ pos: [-wallX, 0, wallZ], rotZ: 0, h: topFn(-wallX) + wallVerticalOverlap })
      flashings.push({ pos: [-wallX, 0, -wallZ], rotZ: -Math.PI / 2, h: topFn(-wallX) + wallVerticalOverlap })
      flashings.push({ pos: [wallX, 0, -wallZ], rotZ: Math.PI, h: topFn(wallX) + wallVerticalOverlap })
      flashings.push({ pos: [wallX, 0, wallZ], rotZ: Math.PI / 2, h: topFn(wallX) + wallVerticalOverlap })
    }

    return { slab: { w: W, l: L }, bases, columns, trusses, roof, panels, walls, flanges, flashings }
  }, [config])
}

function Beams({ segs, material }: { segs: Seg[]; material: THREE.Material }) {
  return (
    <>
      {segs.map(([a, b, t], i) => {
        const dir = b.clone().sub(a)
        const len = dir.length()
        const mid = a.clone().add(b).multiplyScalar(0.5)
        const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
        return (
          <mesh
            key={i}
            geometry={UNIT_BOX}
            material={material}
            position={mid}
            quaternion={quat}
            scale={[t, len, t]}
            castShadow
          />
        )
      })}
    </>
  )
}

interface ShedModelProps {
  config: ShedConfig
  animated?: boolean
  showSlab?: boolean
  onCycle?: () => void
}

export function ShedModel({ config, animated = false, showSlab = true, onCycle }: ShedModelProps) {
  const built = useBuilt(config)

  // One steel material per reveal group (so opacity animates independently).
  const mats = useMemo(() => {
    const make = () =>
      new THREE.MeshStandardMaterial({
        color: "#17181c",
        metalness: 0.7,
        roughness: 0.35,
        transparent: animated,
        opacity: animated ? 0 : 1,
      })
    return { bases: make(), columns: make(), trusses: make(), purlins: make() }
  }, [animated])

  const { roofMat, wallMat } = useMemo(() => {
    // Canvas texture for ROOF (Horizontal channels, varying along V)
    const canvasR = document.createElement("canvas")
    canvasR.width = 256
    canvasR.height = 256
    const ctxR = canvasR.getContext("2d")

    // Canvas texture for WALLS (Vertical channels, varying along U)
    const canvasW = document.createElement("canvas")
    canvasW.width = 256
    canvasW.height = 256
    const ctxW = canvasW.getContext("2d")

    if (ctxR && ctxW) {
      const isSinusoidalR = config.sheet === "sinusoidal"
      
      const effectiveWallSheet = config.wallSheet === "same" ? config.sheet : config.wallSheet
      const isSinusoidalW = effectiveWallSheet === "sinusoidal"

      const drawTexture = (ctx: CanvasRenderingContext2D, isWall: boolean, isSinusoidal: boolean) => {
        const grad = isWall 
          ? ctx.createLinearGradient(0, 0, 256, 0) // Vary on X (U) for walls -> vertical channels
          : ctx.createLinearGradient(0, 0, 0, 256) // Vary on Y (V) for roof -> horizontal channels

        if (isSinusoidal) {
          // Smooth sine wave gradient
          grad.addColorStop(0, "#ffffff")
          grad.addColorStop(0.25, "#666666")
          grad.addColorStop(0.5, "#222222")
          grad.addColorStop(0.75, "#666666")
          grad.addColorStop(1, "#ffffff")
        } else {
          // Trapezoidal T-101 gradient (Sharp flat crests and valleys)
          grad.addColorStop(0, "#ffffff") // Crest flat
          grad.addColorStop(0.2, "#ffffff") // Crest edge
          grad.addColorStop(0.3, "#111111") // Drop to valley
          grad.addColorStop(0.7, "#111111") // Valley flat
          grad.addColorStop(0.8, "#ffffff") // Rise to crest
          grad.addColorStop(1, "#ffffff") // Crest flat
        }
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 256, 256)
      }

      drawTexture(ctxR, false, isSinusoidalR)
      drawTexture(ctxW, true, isSinusoidalW)
    }

    const bumpMapR = new THREE.CanvasTexture(canvasR)
    bumpMapR.wrapS = THREE.RepeatWrapping
    bumpMapR.wrapT = THREE.RepeatWrapping
    // Roof uses BoxGeometry (maps 0..1 across face). 1 repetition per 1 meter of length.
    bumpMapR.repeat.set(1, config.length)
    bumpMapR.needsUpdate = true

    const bumpMapW = new THREE.CanvasTexture(canvasW)
    bumpMapW.wrapS = THREE.RepeatWrapping
    bumpMapW.wrapT = THREE.RepeatWrapping
    // Walls use ShapeGeometry (maps 1 unit = 1 meter naturally via world coords).
    // repeat=1 means 1 repetition every 1 meter!
    bumpMapW.repeat.set(1, 1)
    bumpMapW.needsUpdate = true

    const isCincalum = config.color === "cincalum"
    const finalColor = isCincalum ? "#a1a8b3" : COLOR_HEX[config.color]
    const metalness = isCincalum ? 0.9 : 0.6
    const roughness = isCincalum ? 0.2 : 0.5

    // EXTREME bumpScale so ridges catch heavy shadow and light
    const bumpScale = 3.0

    const rMat = new THREE.MeshStandardMaterial({
      color: finalColor,
      metalness,
      roughness,
      bumpMap: bumpMapR,
      bumpScale,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
      depthTest: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
    rMat.needsUpdate = true

    const wMat = new THREE.MeshStandardMaterial({
      color: finalColor,
      metalness,
      roughness,
      bumpMap: bumpMapW,
      bumpScale,
      side: THREE.DoubleSide,
      shadowSide: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    })
    wMat.needsUpdate = true

    return { roofMat: rMat, wallMat: wMat }
  }, [config.color, config.length, config.sheet, config.wallSheet])

  const flashShape = useMemo(() => {
    const s = new THREE.Shape()
    const leg = 0.20 // 20cm flashings
    const t = 0.015 // visual thickness
    s.moveTo(0, 0)
    s.lineTo(leg, 0)
    s.lineTo(leg, t)
    s.lineTo(t, t)
    s.lineTo(t, leg)
    s.lineTo(0, leg)
    s.closePath()
    return s
  }, [])

  const gBases = useRef<THREE.Group>(null)
  const gColumns = useRef<THREE.Group>(null)
  const gTrusses = useRef<THREE.Group>(null)
  const gPurlins = useRef<THREE.Group>(null)
  const gCovering = useRef<THREE.Group>(null)
  const tRef = useRef(0)

  useFrame((_, delta) => {
    if (!animated) return

    const prevT = tRef.current
    tRef.current += delta
    const cycle = 12 // 12 seconds per full loop

    // Check if we crossed a cycle boundary
    if (Math.floor(prevT / cycle) !== Math.floor(tRef.current / cycle)) {
      if (onCycle) onCycle()
    }

    const p = (tRef.current % cycle) / cycle
    
    let phase = 0
    if (p < 0.25) {
      phase = p / 0.25 // Assemble
    } else if (p < 0.75) {
      phase = 1 // Hold
    } else {
      phase = (1.0 - p) / 0.25 // Disassemble
    }

    const assembly = clamp(phase * 4, 0, 4)

    const apply = (
      group: THREE.Group | null,
      mat: THREE.Material,
      index: number,
      drop: number,
    ) => {
      const r = easeOut(clamp(assembly - index, 0, 1))
      if (group) group.position.y = (1 - r) * drop
      ;(mat as THREE.MeshStandardMaterial).opacity = Math.max(r, 0.001)
    }

    // Phase 1: Bases & Columns
    apply(gBases.current, mats.bases, 0, -1.5)
    apply(gColumns.current, mats.columns, 0.2, -3)
    // Phase 2: Trusses (Cabreadas)
    apply(gTrusses.current, mats.trusses, 1, 6)
    // Phase 3: Purlins (Correas)
    apply(gPurlins.current, mats.purlins, 2, 6)
    // Phase 4: Roof covering (Chapas)
    apply(gCovering.current, roofMat, 3, 6)
    apply(gCovering.current, wallMat, 3, 6)
  })

  const halfW = config.width / 2

  return (
    <group>
      {showSlab && (
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[config.width + 1.2, 0.12, config.length + 1.2]} />
          <meshStandardMaterial color="#3a3d42" roughness={0.95} metalness={0.05} />
        </mesh>
      )}

      <group ref={gBases}>
        <Beams segs={built.bases} material={mats.bases} />
      </group>

      <group ref={gColumns}>
        <Beams segs={built.columns} material={mats.columns} />
      </group>

      <group ref={gTrusses}>
        <Beams segs={built.trusses} material={mats.trusses} />
        {built.flanges.map((f, i) => (
          <mesh key={`f${i}`} position={f.pos} material={mats.trusses} castShadow>
            <boxGeometry args={[f.w, f.h, f.d]} />
          </mesh>
        ))}
      </group>

      <group ref={gPurlins}>
        <Beams segs={built.roof} material={mats.purlins} />
      </group>

      <group ref={gCovering}>
        {built.panels.map((p, i) => (
          <mesh key={`p${i}`} position={p.pos} rotation={p.rot} material={roofMat} castShadow receiveShadow>
            <boxGeometry args={[p.w, 0.06, p.l]} />
          </mesh>
        ))}
        {built.walls.map((w, i) => (
          <mesh key={`w${i}`} position={w.pos} rotation={w.rot} material={wallMat} castShadow receiveShadow>
            <extrudeGeometry args={[w.shape, { depth: 0.05, bevelEnabled: false }]} />
          </mesh>
        ))}
        {built.flashings.map((f, i) => (
          <mesh key={`fl_${i}`} position={f.pos} rotation={[-Math.PI / 2, 0, f.rotZ]} material={roofMat} castShadow>
            <extrudeGeometry args={[flashShape, { depth: f.h, bevelEnabled: false }]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
