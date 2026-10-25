"use client"

import { useState } from "react"
import { normalizarTelefono, validarEmail } from "@/lib/crm/contacto"

interface CampoProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  /** Tras un intento de envío se muestran los errores aunque no haya salido del campo. */
  mostrarErrores?: boolean
}

/**
 * Los errores esperan a que salga del campo: avisar «falta la característica»
 * con el tercer dígito es retar a alguien que todavía está escribiendo.
 */
function useTocado(mostrarErrores?: boolean) {
  const [tocado, setTocado] = useState(false)
  return { visible: tocado || Boolean(mostrarErrores), marcar: () => setTocado(true) }
}

export function CampoTelefono({ value, onChange, mostrarErrores, ...props }: CampoProps) {
  const { visible, marcar } = useTocado(mostrarErrores)
  const resultado = normalizarTelefono(value)

  return (
    <>
      <input
        {...props}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={marcar}
        aria-invalid={visible && !resultado.ok}
        placeholder={props.placeholder ?? "Ej: 3743 487728"}
      />
      {resultado.ok ? (
        // El número tal como lo vamos a usar: un dígito cambiado sólo lo ve
        // quien lo escribió, y sólo si se lo mostramos.
        <p className="mt-1 text-xs text-muted-foreground">
          Te vamos a escribir al <strong className="text-foreground">{resultado.legible}</strong>
        </p>
      ) : visible && value.trim() ? (
        <p className="mt-1 text-xs text-red-500">{resultado.motivo}</p>
      ) : visible ? (
        <p className="mt-1 text-xs text-red-500">Ingresá tu teléfono.</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Código de área + número, sin 0 ni 15.</p>
      )}
    </>
  )
}

export function CampoEmail({
  value,
  onChange,
  mostrarErrores,
  opcional,
  ...props
}: CampoProps & { opcional?: boolean }) {
  const { visible: tocado, marcar } = useTocado(mostrarErrores)
  const resultado = validarEmail(value)
  // Opcional sólo para Santi: un cliente cargado a mano puede no tener correo.
  const visible = tocado && !(opcional && !value.trim())

  return (
    <>
      <input
        {...props}
        type="email"
        inputMode="email"
        autoComplete="email"
        required={!opcional}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={marcar}
        aria-invalid={visible && !resultado.ok}
        placeholder={props.placeholder ?? "Ej: marta@gmail.com"}
      />
      {!resultado.ok && "sugerencia" in resultado && resultado.sugerencia ? (
        // El error de tipeo se avisa enseguida y con el arreglo a un toque.
        <p className="mt-1 text-xs text-amber-500">
          ¿Quisiste decir{" "}
          <button
            type="button"
            onClick={() => onChange(resultado.sugerencia!)}
            className="font-semibold underline"
          >
            {resultado.sugerencia}
          </button>
          ?
        </p>
      ) : !resultado.ok && visible ? (
        <p className="mt-1 text-xs text-red-500">{resultado.motivo}</p>
      ) : null}
    </>
  )
}
