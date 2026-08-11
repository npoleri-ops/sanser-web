import React from "react"

export function ColumnDetailScene() {
  const width = 1920
  const height = 600
  const yTop = 200
  const yBot = 400
  const chordT = 15 // Half-thickness for chord (simulating C-profile flanges)
  const webT = 10   // Half-thickness for web elements
  const step = 240
  
  // Generate nodes that bleed off the edges of the 1920 canvas
  const nodes: number[] = []
  for (let x = -120; x <= width + 120; x += step) {
    nodes.push(x)
  }

  return (
    <svg 
      className="w-full h-full text-slate-300/80"
      viewBox={`0 0 ${width} ${height}`} 
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Subtle technical background grid */}
        <pattern id="blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
        <pattern id="blueprint-grid-large" width="120" height="120" patternUnits="userSpaceOnUse">
          <rect width="120" height="120" fill="url(#blueprint-grid)" />
          <path d="M 120 0 L 0 0 0 120" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#blueprint-grid-large)" />

      {/* ── Main Structure (Double lines to represent C-profiles) ── */}
      <g strokeWidth="2.5" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
        {/* Top Chord */}
        <line x1={0} y1={yTop - chordT} x2={width} y2={yTop - chordT} />
        <line x1={0} y1={yTop + chordT} x2={width} y2={yTop + chordT} />
        
        {/* Bottom Chord */}
        <line x1={0} y1={yBot - chordT} x2={width} y2={yBot - chordT} />
        <line x1={0} y1={yBot + chordT} x2={width} y2={yBot + chordT} />

        {/* Webs: Verticals and Diagonals */}
        {nodes.map((x, i) => {
          const elements = []
          
          // Vertical Montante
          elements.push(
            <line key={`v1-${i}`} x1={x - webT} y1={yTop + chordT} x2={x - webT} y2={yBot - chordT} />,
            <line key={`v2-${i}`} x1={x + webT} y1={yTop + chordT} x2={x + webT} y2={yBot - chordT} />
          )
          
          // Diagonal
          if (i < nodes.length - 1) {
            const isDown = i % 2 === 0
            const nx = nodes[i + 1]
            const y1 = isDown ? yTop + chordT : yBot - chordT
            const y2 = isDown ? yBot - chordT : yTop + chordT
            
            // Calculate perpendicular offset to draw two parallel lines for the diagonal
            const dx = nx - x
            const dy = y2 - y1
            const len = Math.sqrt(dx*dx + dy*dy)
            const ux = dx / len
            const uy = dy / len
            const px = -uy * webT
            const py = ux * webT

            elements.push(
              <line key={`d1-${i}`} x1={x + px} y1={y1 + py} x2={nx + px} y2={y2 + py} />,
              <line key={`d2-${i}`} x1={x - px} y1={y1 - py} x2={nx - px} y2={y2 - py} />
            )
          }
          return elements
        })}
      </g>

      {/* ── Engineering Center Lines (Orange Dashed) ── */}
      <g stroke="#f97316" strokeWidth="1" strokeDasharray="15 8" strokeOpacity="0.8">
        {/* Horizontal center lines */}
        <line x1={0} y1={yTop} x2={width} y2={yTop} />
        <line x1={0} y1={yBot} x2={width} y2={yBot} />
        
        {/* Vertical node axes */}
        {nodes.map((x, i) => (
          <line key={`center-${i}`} x1={x} y1={yTop - 60} x2={x} y2={yBot + 60} />
        ))}
      </g>

      {/* ── Annotations & Dimensions ── */}
      <g fill="#f97316" fillOpacity="0.9" fontSize="14" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
        {nodes.map((x, i) => i < nodes.length - 1 && (
          <text key={`dim-${i}`} x={x + step / 2} y={yTop - 25}>
            1500 mm
          </text>
        ))}
        {nodes.map((x, i) => (
          <text key={`node-${i}`} x={x} y={yBot + 40}>
            N{i+1}
          </text>
        ))}
        
        {/* Profile specification rotated vertically */}
        <text x={nodes[1] + 30} y={yTop + (yBot - yTop) / 2 + 7} transform={`rotate(-90, ${nodes[1] + 30}, ${yTop + (yBot - yTop) / 2})`}>
          PERFIL C 120x50x15x2.0
        </text>
        
        <text x={nodes[3] + 30} y={yTop + (yBot - yTop) / 2 + 7} transform={`rotate(-90, ${nodes[3] + 30}, ${yTop + (yBot - yTop) / 2})`}>
          MON 80x40x15x1.6
        </text>
      </g>

      {/* ── Node Target Markers (Crosshairs) ── */}
      <g stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.9">
        {nodes.map((x, i) => (
          <g key={`cross-${i}`}>
            <circle cx={x} cy={yTop} r="4" fill="none" />
            <line x1={x - 8} y1={yTop} x2={x + 8} y2={yTop} />
            <line x1={x} y1={yTop - 8} x2={x} y2={yTop + 8} />
            
            <circle cx={x} cy={yBot} r="4" fill="none" />
            <line x1={x - 8} y1={yBot} x2={x + 8} y2={yBot} />
            <line x1={x} y1={yBot - 8} x2={x} y2={yBot + 8} />
          </g>
        ))}
      </g>
    </svg>
  )
}



