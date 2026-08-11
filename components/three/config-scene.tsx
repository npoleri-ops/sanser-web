"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment, Grid, Html, OrbitControls } from "@react-three/drei"
import { ShedModel } from "./shed-model"
import type { ShedConfig } from "@/lib/shed-config"

function CotaLabel({
  position,
  children,
}: {
  position: [number, number, number]
  children: React.ReactNode
}) {
  return (
    <Html position={position} center distanceFactor={30} zIndexRange={[10, 0]}>
      <div className="whitespace-nowrap rounded-sm border border-primary/60 bg-background/85 px-2 py-1 font-mono text-[11px] font-600 tracking-wider text-primary backdrop-blur-sm">
        {children}
      </div>
    </Html>
  )
}

function Dimensions({ config }: { config: ShedConfig }) {
  const { width: W, length: L, height: H } = config
  return (
    <group>
      <CotaLabel position={[0, 0.3, L / 2 + 1.4]}>{W} m</CotaLabel>
      <CotaLabel position={[W / 2 + 1.4, 0.3, 0]}>{L} m</CotaLabel>
      <CotaLabel position={[-W / 2 - 1.2, H / 2, L / 2]}>{H} m</CotaLabel>
    </group>
  )
}

export function ConfigScene({ config }: { config: ShedConfig }) {
  const camDist = (Math.max(config.width, config.length) * 1.15 + 12) * 0.82

  return (
    <Canvas
      shadows
      dpr={[1, 1.8]}
      camera={{ position: [camDist * 0.7, camDist * 0.5, camDist], fov: 40 }}
    >
      <color attach="background" args={["#12141a"]} />
      <fog attach="fog" args={["#12141a", camDist * 1.6, camDist * 3.4]} />

      <ambientLight intensity={0.45} color="#ffffff" />
      <directionalLight
        position={[15, 30, 15]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.04}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      <directionalLight position={[-22, 16, -18]} intensity={0.6} color="#9fb4ff" />

      <Suspense fallback={null}>
        <ShedModel config={config} showSlab />
        <Dimensions config={config} />
        <Environment preset="warehouse" environmentIntensity={0.5} />
      </Suspense>

      <Grid
        position={[0, 0, 0]}
        args={[120, 120]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#2a2d33"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#4a4030"
        fadeDistance={100}
        fadeStrength={1.5}
        infiniteGrid
      />

      <OrbitControls
        makeDefault
        enablePan
        minDistance={10}
        maxDistance={140}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, config.height / 2, 0]}
      />
    </Canvas>
  )
}
