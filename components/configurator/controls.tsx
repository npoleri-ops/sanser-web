"use client"

import { cn } from "@/lib/utils"
import {
  COLOR_HEX,
  COLOR_LABEL,
  LIMITS,
  SHEET_LABEL,
  TYPE_LABEL,
  type RoofColor,
  type SheetType,
  type ShedConfig,
  type ShedType,
} from "@/lib/shed-config"

interface Props {
  config: ShedConfig
  update: <K extends keyof ShedConfig>(key: K, value: ShedConfig[K]) => void
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#F97316]">{label}</h3>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-sm border px-3 py-2.5 text-left font-mono text-xs uppercase tracking-wider transition-colors",
            value === o.value
              ? "border-[#F97316] bg-[#F97316]/15 text-[#F97316]"
              : "border-border bg-secondary/40 text-muted-foreground hover:border-[#F97316]/40 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-sm font-600 text-foreground">
          {value} <span className="text-[#F97316]">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: "#F97316" }}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-sm border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:border-[#F97316]/40"
    >
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#F97316]" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-background transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  )
}

export function Controls({ config, update }: Props) {
  return (
    <div className="space-y-7">
      <Group label="Tipología">
        <Segmented<ShedType>
          value={config.type}
          onChange={(v) => update("type", v)}
          options={[
            { value: "gable", label: TYPE_LABEL.gable },
            { value: "gable_portico", label: TYPE_LABEL.gable_portico },
            { value: "shed", label: TYPE_LABEL.shed },
          ]}
        />
      </Group>

      <Group label="Dimensiones">
        <div className="space-y-5">
          <Slider
            label="Ancho"
            unit="m"
            value={config.width}
            min={LIMITS.width.min}
            max={LIMITS.width.max}
            step={LIMITS.width.step}
            onChange={(v) => update("width", v)}
          />
          <Slider
            label="Largo"
            unit="m"
            value={config.length}
            min={LIMITS.length.min}
            max={LIMITS.length.max}
            step={LIMITS.length.step}
            onChange={(v) => update("length", v)}
          />
          <Slider
            label="Altura libre"
            unit="m"
            value={config.height}
            min={LIMITS.height.min}
            max={LIMITS.height.max}
            step={LIMITS.height.step}
            onChange={(v) => update("height", v)}
          />
        </div>
      </Group>

      <Group label="Cubierta y Acabado">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Techo</span>
            <Segmented<SheetType>
              value={config.sheet}
              onChange={(v) => update("sheet", v)}
              options={[
                { value: "t101", label: SHEET_LABEL.t101 },
                { value: "sinusoidal", label: SHEET_LABEL.sinusoidal },
              ]}
            />
          </div>
          
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Paredes / Cerramientos</span>
            <Segmented<any>
              value={config.wallSheet}
              onChange={(v) => update("wallSheet", v)}
              options={[
                { value: "same", label: "Misma que el Techo" },
                { value: "t101", label: "Trapezoidal T-101" },
                { value: "sinusoidal", label: "Sinusoidal" },
              ]}
            />
          </div>

          <div className="pt-2 grid grid-cols-3 gap-2">
            {(Object.keys(COLOR_HEX) as RoofColor[]).map((c) => (
              <button
                key={c}
                onClick={() => update("color", c)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-sm border p-2 transition-colors",
                  config.color === c ? "border-[#F97316]" : "border-border hover:border-[#F97316]/40",
                )}
              >
                <span
                  className="h-8 w-full rounded-sm border border-border/50"
                  style={{ backgroundColor: COLOR_HEX[c] }}
                />
                <span className="text-center font-mono text-[9px] uppercase leading-tight text-muted-foreground">
                  {COLOR_LABEL[c].split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Group>

      <Group label="Opciones Adicionales">
        <div className="space-y-2">
          <Toggle
            label="Cerramientos laterales"
            desc="Chapa en los laterales y fondo"
            checked={config.walls}
            onChange={(v) => update("walls", v)}
          />
          <Toggle
            label="Portón frontal"
            desc="Abertura delantera para acceso de vehículos"
            checked={config.gate}
            onChange={(v) => update("gate", v)}
          />
          <Toggle
            label="Portón trasero"
            desc="Abertura posterior para vehículos (galpón pasante)"
            checked={config.gateBack}
            onChange={(v) => update("gateBack", v)}
          />
        </div>
      </Group>
    </div>
  )
}
