'use client';
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  fillColor?: string;
}

export function Logo({ className, fillColor = "#FFFFFF" }: LogoProps) {
  // Estado para reiniciar la animación al pasar el cursor (Hover)
  const [animKey, setAnimKey] = useState(0);

  const handleMouseEnter = () => {
    setAnimKey((prev) => prev + 1);
  };

  return (
    <div
      className={cn("flex items-center gap-3.5 cursor-pointer group", className)}
      onMouseEnter={handleMouseEnter}
    >
      {/* KEYFRAMES CSS NATIVOS PARA TRAZADO EN SECUENCIA */}
      <style jsx>{`
        @keyframes drawLine {
          from {
            stroke-dashoffset: 120;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-draw {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: drawLine 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          will-change: stroke-dashoffset;
          transform: translateZ(0);
        }
      `}</style>

      {/* ÍCONO SVG CON LA GEOMETRÍA ORIGINAL SANSER (PERSPECTIVA) */}
      <svg
        key={animKey}
        viewBox="0 0 100 50"
        className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
        fill="none"
        stroke={fillColor}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 1. Techo a 2 aguas en perspectiva (Se traza primero) */}
        <path
          d="M 10 16 L 35 6 L 90 22"
          className="animate-draw"
          style={{ animationDelay: "0.2s" }}
        />

        {/* 2. Columna 1 (Izquierda exterior) */}
        <line
          x1="10"
          y1="16"
          x2="10"
          y2="45"
          className="animate-draw"
          style={{ animationDelay: "0.35s" }}
        />

        {/* 3. Columna 2 (Cumbrera/Pico en perspectiva) */}
        <line
          x1="35"
          y1="6"
          x2="35"
          y2="45"
          className="animate-draw"
          style={{ animationDelay: "0.47s" }}
        />

        {/* 4. Columna 3 (Interior en perspectiva 1) */}
        <line
          x1="53"
          y1="11.5"
          x2="53"
          y2="45"
          className="animate-draw"
          style={{ animationDelay: "0.59s" }}
        />

        {/* 5. Columna 4 (Interior en perspectiva 2) */}
        <line
          x1="71"
          y1="16.8"
          x2="71"
          y2="45"
          className="animate-draw"
          style={{ animationDelay: "0.71s" }}
        />

        {/* 6. Columna 5 (Derecha exterior) */}
        <line
          x1="90"
          y1="22"
          x2="90"
          y2="45"
          className="animate-draw"
          style={{ animationDelay: "0.83s" }}
        />
      </svg>

      {/* BLOQUE TIPOGRÁFICO ESCUADRADO */}
      <div className="flex flex-col items-center">
        <span className="text-xl font-bold tracking-[0.2em] text-white uppercase leading-none mb-1">
          SANSER
        </span>
        <span className="text-[9px] tracking-[0.22em] text-gray-300 uppercase flex items-center justify-between w-full leading-none">
          <span>—</span>
          <span>METALÚRGICA</span>
          <span>—</span>
        </span>
      </div>
    </div>
  );
}
