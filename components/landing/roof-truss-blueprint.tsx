import React from "react"

export function RoofTrussBlueprint() {
  const width = 1920
  const height = 600
  const yBot = 500
  
  const span = 1680
  const xStart = (width - span) / 2 // 120
  const xEnd = xStart + span // 1800
  const xMid = width / 2 // 960
  
  // Pendiente 25%
  const slope = 0.25
  const yPeak = yBot - (span / 2) * slope // 500 - 840*0.25 = 290
  
  const chordT = 12 // Half-thickness for chords
  const webT = 8    // Half-thickness for webs
  
  const segmentsHalf = 6
  const step = (span / 2) / segmentsHalf // 840 / 6 = 140
  
  // Math for left slope parallel lines
  const L_dx = 1
  const L_dy = -slope
  const L_len = Math.sqrt(L_dx*L_dx + L_dy*L_dy)
  const L_nx = -L_dy / L_len
  const L_ny = L_dx / L_len
  const L_px = L_nx * chordT
  const L_py = L_ny * chordT

  // Math for right slope parallel lines
  const R_dx = 1
  const R_dy = slope
  const R_len = Math.sqrt(R_dx*R_dx + R_dy*R_dy)
  const R_nx = -R_dy / R_len
  const R_ny = R_dx / R_len
  const R_px = R_nx * chordT
  const R_py = R_ny * chordT

  const nodes: { x: number, yTop: number, yBot: number }[] = []
  for (let i = 0; i <= segmentsHalf * 2; i++) {
    const x = xStart + i * step
    let yTop = 0
    if (Math.round(x) <= Math.round(xMid)) {
      yTop = yBot - (x - xStart) * slope
    } else {
      yTop = yPeak + (x - xMid) * slope
    }
    nodes.push({ x, yTop, yBot })
  }

  return (
    <svg 
      className="w-full h-full text-slate-300/80"
      viewBox={`0 0 ${width} ${height}`} 
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="blueprint-grid-roof" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
        <pattern id="blueprint-grid-large-roof" width="120" height="120" patternUnits="userSpaceOnUse">
          <rect width="120" height="120" fill="url(#blueprint-grid-roof)" />
          <path d="M 120 0 L 0 0 0 120" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#blueprint-grid-large-roof)" />

      {/* ── Main Structure (Double lines to represent C-profiles) ── */}
      <g strokeWidth="2.5" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
        
        {/* Bottom Chord (Horizontal) */}
        <line x1={xStart} y1={yBot - chordT} x2={xEnd} y2={yBot - chordT} />
        <line x1={xStart} y1={yBot + chordT} x2={xEnd} y2={yBot + chordT} />

        {/* Top Chord - Left Slope */}
        <line x1={xStart - L_px} y1={yBot - L_py} x2={xMid - L_px} y2={yPeak - L_py} />
        <line x1={xStart + L_px} y1={yBot + L_py} x2={xMid + L_px} y2={yPeak + L_py} />
        
        {/* Top Chord - Right Slope */}
        <line x1={xMid - R_px} y1={yPeak - R_py} x2={xEnd - R_px} y2={yBot - R_py} />
        <line x1={xMid + R_px} y1={yPeak + R_py} x2={xEnd + R_px} y2={yBot + R_py} />

        {/* Closing Heel Verticals */}
        <line x1={xStart - chordT} y1={yBot - chordT} x2={xStart - L_px} y2={yBot - L_py} />
        <line x1={xEnd + chordT} y1={yBot - chordT} x2={xEnd - R_px} y2={yBot - R_py} />

        {/* Webs: Verticals and Diagonals */}
        {nodes.map((n, i) => {
          const elements = []
          
          // Vertical Montante
          elements.push(
            <line key={`v1-${i}`} x1={n.x - webT} y1={n.yTop + chordT} x2={n.x - webT} y2={n.yBot - chordT} />,
            <line key={`v2-${i}`} x1={n.x + webT} y1={n.yTop + chordT} x2={n.x + webT} y2={n.yBot - chordT} />
          )
          
          // Diagonal
          if (i < nodes.length - 1) {
            const isDown = i % 2 === 0
            const nx = nodes[i + 1]
            const y1 = isDown ? n.yTop + chordT : n.yBot - chordT
            const y2 = isDown ? nx.yBot - chordT : nx.yTop + chordT
            
            // Calculate perpendicular offset for parallel diagonal lines
            const dx = nx.x - n.x
            const dy = y2 - y1
            const len = Math.sqrt(dx*dx + dy*dy)
            const ux = dx / len
            const uy = dy / len
            const px = -uy * webT
            const py = ux * webT

            elements.push(
              <line key={`d1-${i}`} x1={n.x + px} y1={y1 + py} x2={nx.x + px} y2={y2 + py} />,
              <line key={`d2-${i}`} x1={n.x - px} y1={y1 - py} x2={nx.x - px} y2={y2 - py} />
            )
          }
          return elements
        })}
      </g>

      {/* ── Engineering Center Lines (Orange Dashed) ── */}
      <g stroke="#f97316" strokeWidth="1" strokeDasharray="15 8" strokeOpacity="0.8">
        {/* Horizontal bottom center line */}
        <line x1={10} y1={yBot} x2={width-10} y2={yBot} />
        
        {/* Top Sloped Center Lines */}
        <line x1={xStart - 40} y1={yBot + 40*slope} x2={xMid} y2={yPeak} />
        <line x1={xMid} y1={yPeak} x2={xEnd + 40} y2={yBot + 40*slope} />
        
        {/* Vertical Center Axis */}
        <line x1={xMid} y1={yPeak - 60} x2={xMid} y2={yBot + 60} />
      </g>

      {/* ── Annotations & Dimensions ── */}
      <g fill="#f97316" fillOpacity="0.9" fontSize="14" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
        {/* Center line text */}
        <text x={xMid + 8} y={yPeak - 40} textAnchor="start">EJE CENTRAL - CUMBRERA</text>

        {/* Span Dimension */}
        <line x1={xStart} y1={yBot + 50} x2={xStart} y2={yBot + 70} stroke="#f97316" strokeWidth="1.5" />
        <line x1={xEnd} y1={yBot + 50} x2={xEnd} y2={yBot + 70} stroke="#f97316" strokeWidth="1.5" />
        <line x1={xStart} y1={yBot + 60} x2={xEnd} y2={yBot + 60} stroke="#f97316" strokeWidth="1" strokeDasharray="5 5" />
        <text x={xMid} y={yBot + 80}>LUZ TOTAL: 15.000 mm</text>

        {/* Slope annotation */}
        <g transform={`translate(${xStart + 350}, ${yBot - 350 * slope - 30})`}>
          <path d="M -40 0 L 40 -20 L 40 0 Z" fill="none" stroke="#f97316" strokeWidth="1.5" />
          <text x={0} y={-30}>PENDIENTE 25%</text>
          <text x={0} y={-10} fontSize="12" fillOpacity="0.7">PERFIL C 120x50x15x2.0</text>
        </g>
      </g>

      {/* ── Node Target Markers (Crosshairs) ── */}
      <g stroke="#f97316" strokeWidth="1.5" strokeOpacity="0.9">
        {nodes.map((n, i) => (
          <g key={`cross-${i}`}>
            <circle cx={n.x} cy={n.yTop} r="4" fill="none" />
            <line x1={n.x - 8} y1={n.yTop} x2={n.x + 8} y2={n.yTop} />
            <line x1={n.x} y1={n.yTop - 8} x2={n.x} y2={n.yTop + 8} />
            
            <circle cx={n.x} cy={n.yBot} r="4" fill="none" />
            <line x1={n.x - 8} y1={n.yBot} x2={n.x + 8} y2={n.yBot} />
            <line x1={n.x} y1={n.yBot - 8} x2={n.x} y2={n.yBot + 8} />
          </g>
        ))}
      </g>
    </svg>
  )
}
