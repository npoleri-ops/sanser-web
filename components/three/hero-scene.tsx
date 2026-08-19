"use client"

import { Suspense, useState, useCallback, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import { ErrorBoundary } from "../error-boundary"
import { Loader2, Hand } from "lucide-react"
import { ShedModel } from "./shed-model"
import { DEFAULT_CONFIG, ShedType } from "@/lib/shed-config"

export function HeroScene() {
  const [type, setType] = useState<ShedType>("gable")
  const [interacted, setInteracted] = useState(false)

  const handleCycle = useCallback(() => {
    setType((prev) => (prev === "gable" ? "gable_portico" : prev === "gable_portico" ? "shed" : "gable"))
  }, [])

  const config = { ...DEFAULT_CONFIG, type }

  return (
    <ErrorBoundary>
      <div 
        className="relative h-full w-full"
        onPointerDown={() => {
          if (!interacted) setInteracted(true)
        }}
        onTouchStart={() => {
          if (!interacted) setInteracted(true)
        }}
        onMouseDown={() => {
          if (!interacted) setInteracted(true)
        }}
      >
        {/* Interaction Hint Badge */}
        <div 
          className={`pointer-events-none absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 sm:left-auto sm:right-8 sm:translate-x-0 items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2.5 backdrop-blur-md transition-opacity duration-1000 ${interacted ? "opacity-0" : "opacity-100"}`}
        >
          <style>{`
            @keyframes sway {
              0%, 100% { transform: translateX(-15%) rotate(-10deg); }
              50% { transform: translateX(15%) rotate(10deg); }
            }
          `}</style>
          <div className="flex size-7 items-center justify-center rounded-full bg-[#F97316]/20">
            <Hand className="size-4 text-[#F97316]" style={{ animation: "sway 2s ease-in-out infinite" }} />
          </div>
          <span className="text-sm font-medium text-white/90">
            <span className="sm:hidden">Deslizá para rotar en 3D</span>
            <span className="hidden sm:inline">Arrastrá para rotar en 3D</span>
          </span>
        </div>

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
              enableDamping={true}
              autoRotate
              autoRotateSpeed={0.5}
              minPolarAngle={Math.PI / 3.4}
              maxPolarAngle={Math.PI / 2.15}
            />
          </Canvas>
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}
