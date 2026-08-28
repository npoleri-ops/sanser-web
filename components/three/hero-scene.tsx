"use client"

import { Suspense, useState, useCallback } from "react"
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
        className="pointer-events-auto relative h-full w-full"
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
          className={`pointer-events-none absolute bottom-4 right-4 z-30 flex items-center gap-1.5 sm:gap-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 sm:px-4 sm:py-2.5 backdrop-blur-md transition-opacity duration-500 ${interacted ? "opacity-0" : "opacity-100"}`}
        >
          <style>{`
            @keyframes sway {
              0%, 100% { transform: translateX(-15%) rotate(-10deg); }
              50% { transform: translateX(15%) rotate(10deg); }
            }
          `}</style>
          <div className="flex size-5 sm:size-7 items-center justify-center rounded-full bg-[#F97316]/20">
            <Hand className="size-[14px] sm:size-4 text-[#F97316]" style={{ animation: "sway 2s ease-in-out infinite" }} />
          </div>
          <span className="font-medium text-white/90 text-xs sm:text-sm">
            <span className="sm:hidden">Deslizá para rotar 3D</span>
            <span className="hidden sm:inline">Arrastrá para rotar en 3D</span>
          </span>
        </div>

        <Suspense fallback={<div className="flex h-full w-full items-center justify-center bg-background/50"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
          <Canvas
            shadows
            frameloop="always"
            dpr={[1, 1.5]}
            camera={{ position: [24, 13, 26], fov: 42 }}
            gl={{ antialias: false, powerPreference: "high-performance" }}
          >
            <color attach="background" args={["#1c2027"]} />
            <fog attach="fog" args={["#1c2027", 45, 95]} />

            <ambientLight intensity={1.5} />
            <directionalLight position={[0, 40, 40]} intensity={3.0} color="#ffffff" />
            <directionalLight
              position={[18, 26, 10]}
              intensity={2.8}
              color="#ffffff"
              castShadow
              shadow-mapSize={[512, 512]}
            />
            {/* Fill light from the left */}
            <directionalLight position={[-20, 14, 20]} intensity={2.0} color="#ffffff" />
            
            {/* Rim Lights for specular highlights on black steel */}
            <directionalLight position={[-15, 30, -25]} intensity={4.0} color="#ffffff" />
            <directionalLight position={[25, 30, -25]} intensity={4.0} color="#ffffff" />
            
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
