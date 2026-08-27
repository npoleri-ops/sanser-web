"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Grid, Html, OrbitControls } from "@react-three/drei"
import { ErrorBoundary } from "../error-boundary"
import { Loader2 } from "lucide-react"
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
      <div className="whitespace-nowrap rounded-md border border-white/20 bg-[#12141a]/95 px-2.5 py-1 font-mono text-[13px] font-bold tracking-wider text-white backdrop-blur-md shadow-lg">
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
    <ErrorBoundary>
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-background/50"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
        <Canvas
          shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [camDist * 0.7, camDist * 0.5, camDist], fov: 40 }}
      style={{ touchAction: "pan-y" }}
      gl={{ preserveDrawingBuffer: true, powerPreference: "high-performance", antialias: false }}
    >
      <color attach="background" args={["#1c2027"]} />
      <fog attach="fog" args={["#1c2027", camDist * 1.6, camDist * 3.4]} />

      <ambientLight intensity={1.5} color="#ffffff" />
      
      {/* Front/Top fill light */}
      <directionalLight position={[0, 40, 40]} intensity={3.0} color="#ffffff" />
      
      {/* Main key light (with shadows) */}
      <directionalLight
        position={[15, 30, 15]}
        intensity={2.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.04}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
      />
      
      {/* Fill light from the left */}
      <directionalLight position={[-22, 16, 20]} intensity={2.0} color="#ffffff" />

      {/* Rim Lights for specular highlights on black steel from the back/sides */}
      <directionalLight position={[-20, 30, -25]} intensity={4.0} color="#ffffff" />
      <directionalLight position={[20, 30, -25]} intensity={4.0} color="#ffffff" />

      <Suspense fallback={<Html center><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></Html>}>
        <ShedModel config={config} showSlab />
        <Dimensions config={config} />
      </Suspense>

      <Grid
        position={[0, 0, 0]}
        args={[120, 120]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#3a3d45"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#5a5040"
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
    </Suspense>
  </ErrorBoundary>
  )
}
