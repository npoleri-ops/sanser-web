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
  slantFn?: (x: number) => number
): Seg[] {
  const segs: Seg[] = []
  const half = perp.clone().multiplyScalar(depth / 2)
  const aF = a.clone().add(half)
  const aB = a.clone().sub(half)
  const bF = b.clone().add(half)
  const bB = b.clone().sub(half)

  if (slantFn) {
    bF.y = slantFn(bF.x)
    bB.y = slantFn(bB.x)
  }

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

// Warren truss web (zigzag only – no verticals)
function warrenWeb(
  bottomFn: (x: number) => number,
  topFn: (x: number) => number,
  xL: number,
  xR: number,
  z: number,
  panels: number,
  webT: number,
): Seg[] {
  const segs: Seg[] = []
  for (let i = 0; i < panels; i++) {
    const x0 = THREE.MathUtils.lerp(xL, xR, i / panels)
    const x1 = THREE.MathUtils.lerp(xL, xR, (i + 1) / panels)
    // zigzag: alternating bottom→top and top→bottom
    if (i % 2 === 0) {
      segs.push([v(x0, bottomFn(x0), z), v(x1, topFn(x1), z), webT])
    } else {
      segs.push([v(x0, topFn(x0), z), v(x1, bottomFn(x1), z), webT])
    }
  }
  return segs
}

// Slender 4-varilla column (25–30 cm section) with SIMPLE zigzag on each face.
// One diagonal per panel per face, alternating direction – NOT the massive
// crossed-diagonals pattern used in high-tension towers.
function varillaColumn(
  baseX: number, baseZ: number,
  bottomY: number, topY: number,
  size: number,          // side length of the square section (0.25 – 0.30)
  panels: number,
  chordT: number,        // Ø12 visual thickness
  webT: number           // Ø8 visual thickness
): Seg[] {
  const segs: Seg[] = []
  const h = size / 2

  // 4 corner chords (longitudinal varillas)
  const corners: [number, number][] = [
    [baseX - h, baseZ - h],
    [baseX + h, baseZ - h],
    [baseX + h, baseZ + h],
    [baseX - h, baseZ + h],
  ]
  for (const [cx, cz] of corners) {
    segs.push([v(cx, bottomY, cz), v(cx, topY, cz), chordT])
  }

  // Top and bottom rings
  for (const y of [bottomY, topY]) {
    for (let f = 0; f < 4; f++) {
      const [ax, az] = corners[f]
      const [bx, bz] = corners[(f + 1) % 4]
      segs.push([v(ax, y, az), v(bx, y, bz), webT])
    }
  }

  // Simple zigzag on each of the 4 faces
  for (let f = 0; f < 4; f++) {
    const [ax, az] = corners[f]
    const [bx, bz] = corners[(f + 1) % 4]
    for (let i = 0; i < panels; i++) {
      const y0 = THREE.MathUtils.lerp(bottomY, topY, i / panels)
      const y1 = THREE.MathUtils.lerp(bottomY, topY, (i + 1) / panels)
      if (i % 2 === 0) {
        segs.push([v(ax, y0, az), v(bx, y1, bz), webT])
      } else {
        segs.push([v(bx, y0, bz), v(ax, y1, az), webT])
      }
    }
  }
  return segs
}

// Parallel-chord inclined truss beam for varillas.
// Both chords follow the roof slope at a constant vertical offset (`depth`).
// Internal web is a simple zigzag (Warren pattern).
function varillasParallelChordTruss(
  xL: number, xR: number,
  slopeFn: (x: number) => number,   // top chord height at x
  depth: number,                     // constant vertical distance between chords (~0.38m)
  z: number,
  panels: number,
  chordT: number,
  webT: number
): Seg[] {
  const segs: Seg[] = []
  const topAt = (x: number) => slopeFn(x)
  const botAt = (x: number) => slopeFn(x) - depth

  // Top chord
  segs.push([v(xL, topAt(xL), z), v(xR, topAt(xR), z), chordT])
  // Bottom chord
  segs.push([v(xL, botAt(xL), z), v(xR, botAt(xR), z), chordT])

  // End verticals
  segs.push([v(xL, botAt(xL), z), v(xL, topAt(xL), z), webT])
  segs.push([v(xR, botAt(xR), z), v(xR, topAt(xR), z), webT])

  // Warren zigzag web
  for (let i = 0; i < panels; i++) {
    const xa = THREE.MathUtils.lerp(xL, xR, i / panels)
    const xb = THREE.MathUtils.lerp(xL, xR, (i + 1) / panels)
    if (i % 2 === 0) {
      segs.push([v(xa, botAt(xa), z), v(xb, topAt(xb), z), webT])
    } else {
      segs.push([v(xa, topAt(xa), z), v(xb, botAt(xb), z), webT])
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

    // Frame positions along length
    const framesZ: number[] = []
    for (let i = 0; i < frames; i++) framesZ.push(THREE.MathUtils.lerp(-halfL, halfL, i / (frames - 1)))

    const isVarillas = type === "gable_varillas" || type === "shed_varillas"

    // ── Varillas: thinner bars that look like real Ø12 / Ø8 rebar ──
    const varChordT = 0.035   // Ø12 visual
    const varWebT   = 0.022   // Ø8 visual
    const colSection = 0.25   // 25 cm square column section
    const varTrussH  = 0.38   // constant canto of parallel-chord truss

    const colDepth = isVarillas ? colSection : 0.5
    const chordT = isVarillas ? varChordT : 0.13
    const webT = isVarillas ? varWebT : 0.07
    const colPanels = clamp(Math.round(H / 0.8), 4, 12)
    const trussPanels = clamp(Math.round(W / 1.6), 5, 40)

    const outX = halfW + colDepth / 2
    const trussDepth = 0.8
    const slope = Math.tan(pitch)
    const shedSlope = Math.tan((8 * Math.PI) / 180)

    const topFn = (x: number) => {
      if (type === "gable" || type === "gable_portico" || type === "gable_varillas") return H + slope * (outX - Math.abs(x))
      return H + shedSlope * (x + outX)
    }
    const verticalDepth = isVarillas ? varTrussH : trussDepth / Math.cos(pitch)
    const bottomFn = (x: number) => {
      if (type === "gable_portico") return topFn(x) - (trussDepth / Math.cos(pitch))
      if (type === "gable_varillas" || type === "shed_varillas") return topFn(x) - varTrussH
      return H
    }

    const eaveL = bottomFn(-halfW)
    const eaveR = bottomFn(halfW)
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
      if (type === "shed" && config.centralColumns) {
        sides.push([0, bottomFn(0)])
      }
      for (const [x, top] of sides) {
        let slantFn: ((x: number) => number) | undefined
        if (type === "gable_portico" || type === "gable_varillas" || type === "shed_varillas") {
          slantFn = bottomFn
        }
        
        if (isVarillas) {
          // Slender 25 cm column with simple zigzag
          columns.push(...varillaColumn(x, z, 0.3, top, colSection, colPanels, varChordT, varWebT))
        } else {
          // perp = X axis -> lattice face (celosía) sits in the X-Y plane so the wide,
          // diagonal-braced face points toward a front-facing camera (columns rotated 90° on their vertical axis).
          columns.push(...lattice(v(x, 0.3, z), v(x, top, z), v(1, 0, 0), colDepth, colPanels, chordT, webT, slantFn))
        }
        // base plate as 4 short stubs forming a box footprint
        const bpSize = isVarillas ? 0.22 : 0.35
        const bpT = isVarillas ? 0.18 : 0.28
        bases.push([v(x - bpSize, 0.14, z - bpSize), v(x + bpSize, 0.14, z - bpSize), bpT])
        bases.push([v(x - bpSize, 0.14, z + bpSize), v(x + bpSize, 0.14, z + bpSize), bpT])
      }
    }

    // Trusses (cabreadas)
    for (const z of framesZ) {
      if (type === "gable_varillas") {
        // ── Parallel-chord inclined trusses (varilla reticulado liviano) ──
        const halfPanels = Math.max(4, Math.floor(trussPanels / 2))

        // Left half: eave → ridge
        trusses.push(...varillasParallelChordTruss(-outX, 0, topFn, varTrussH, z, halfPanels, varChordT, varWebT))
        // Right half: ridge → eave
        trusses.push(...varillasParallelChordTruss(0, outX, topFn, varTrussH, z, halfPanels, varChordT, varWebT))

        // Ridge vertical montante (closing member at the apex)
        trusses.push([v(0, bottomFn(0), z), v(0, topFn(0), z), varChordT])

        // ── Horizontal collar tie / tensor at ~1.3 m below the ridge ──
        const ridgeY = topFn(0)
        const tieDropY = ridgeY - 1.3
        // Find the X where the bottom chord reaches tieDropY
        // bottomFn(x) = topFn(x) - varTrussH, and topFn(x) = H + slope*(outX-|x|)
        // We want tieDropY on the bottom chord: tieDropY = H + slope*(outX-tieX) - varTrussH
        // → tieX = outX - (tieDropY - H + varTrussH) / slope
        const tieX = Math.max(0.5, outX - (tieDropY - H + varTrussH) / slope)
        if (tieX > 0.3 && tieDropY > H) {
          trusses.push([v(-tieX, tieDropY, z), v(tieX, tieDropY, z), varChordT])
          // Short verticals connecting tie to bottom chord at the tie points
          trusses.push([v(-tieX, bottomFn(-tieX), z), v(-tieX, tieDropY, z), varWebT])
          trusses.push([v( tieX, bottomFn( tieX), z), v( tieX, tieDropY, z), varWebT])
        }

        // ── Jabalcón / ménsula (45° knee brace from column to truss) ──
        const braceLen = 1.0  // ~1m of diagonal
        for (const side of [-1, 1]) {
          const colX = side * halfW
          const eaveY = bottomFn(colX)
          // Brace goes from (colX, eaveY - braceLen) on the column
          //            to   (colX + side*braceLen*0.7, eaveY + 0.1) on the bottom chord
          // roughly 45° inward
          const braceBottomY = eaveY - braceLen
          const braceTopX = colX + side * (-1) * braceLen * 0.7   // toward centre
          const braceTopY = bottomFn(braceTopX)
          trusses.push([v(colX, braceBottomY, z), v(braceTopX, braceTopY, z), varChordT])
        }

      } else if (type === "gable_portico") {
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
        // shed, shed_varillas or gable
        if (type === "shed_varillas") {
          // Parallel-chord inclined truss for 1 Agua varillas
          trusses.push(...varillasParallelChordTruss(-outX, outX, topFn, varTrussH, z, trussPanels, varChordT, varWebT))
          // Jabalcones on both columns
          const braceLen = 1.0
          for (const colX of [-halfW, halfW]) {
            const eaveY = bottomFn(colX)
            const braceBottomY = eaveY - braceLen
            const dir = colX < 0 ? 1 : -1
            const braceTopX = colX + dir * braceLen * 0.7
            const braceTopY = bottomFn(braceTopX)
            trusses.push([v(colX, braceBottomY, z), v(braceTopX, braceTopY, z), varChordT])
          }
        } else {
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
    }

    // Purlins (correas) running lengthwise along the roof slope
    const purlinT = 0.09
    const makePurlinRun = (xStart: number, xEnd: number) => {
      const slope = Math.hypot(xEnd - xStart, topFn(xEnd) - topFn(xStart))
      const n = clamp(Math.round(slope / 1.6), 3, 40)
      for (let i = 0; i <= n; i++) {
        const x = THREE.MathUtils.lerp(xStart, xEnd, i / n)
        const y = topFn(x) + 0.12
        roof.push([v(x, y, -outL), v(x, y, outL), purlinT])
        
        // Soquetes / soportes para correas sobre la cabreada
        if (type === "gable_portico" || type === "gable_varillas" || type === "shed_varillas") {
          for (const z of framesZ) {
            trusses.push([v(x, topFn(x), z), v(x, topFn(x) + 0.08, z), webT])
          }
        }
      }
    }
    if (type === "gable" || type === "gable_portico" || type === "gable_varillas") {
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
    if (type === "gable" || type === "gable_portico" || type === "gable_varillas") {
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
        color: "#111111",
        metalness: 0.4,
        roughness: 0.3,
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
          // Trapezoidal T-110 gradient (Sharp flat crests and valleys)
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
