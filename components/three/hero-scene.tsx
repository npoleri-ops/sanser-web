"use client"

import { Suspense, useState, useCallback } from "react"
import { Canvas } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import { ErrorBoundary } from "../error-boundary"
import { Loader2 } from "lucide-react"
import { ShedModel } from "./shed-model"
import { DEFAULT_CONFIG, ShedType } from "@/lib/shed-config"

export function HeroScene() {
  const [type, setType] = useState<ShedType>("gable")

  const handleCycle = useCallback(() => {
    setType((prev) => (prev === "gable" ? "gable_portico" : prev === "gable_portico" ? "shed" : "gable"))
  }, [])

  const config = { ...DEFAULT_CONFIG, type }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-background/50"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
        <Canvas
          shadows
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [24, 13, 26], fov: 42 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0d0e11"]} />
      <fog attach="fog" args={["#0d0e11", 45, 95]} />

      <ambientLight intensity={0.7} />
      <directionalLight
        position={[18, 26, 10]}
        intensity={2.8}
        color="#ffb257"
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <directionalLight position={[-20, 14, -12]} intensity={0.7} color="#9fb4ff" />
      
      {/* Rim Light for industrial lattice highlights */}
      <directionalLight position={[-15, 20, -25]} intensity={2.5} color="#ff9944" />
      
      <pointLight position={[0, 8, 0]} intensity={20} color="#ff8a2a" distance={40} />

      <Suspense fallback={<Html center><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></Html>}>
        <group position={[0, -3, 0]}>
          <ShedModel config={config} animated showSlab onCycle={handleCycle} />
        </group>
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.15}
      />
      </Canvas>
    </Suspense>
  </ErrorBoundary>
  )
}
