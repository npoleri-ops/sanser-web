/**
 * Validación de los datos de contacto que deja un visitante. La usan tanto los
 * formularios —para avisar mientras escribe— como las rutas de la API —para
 * quien mande el POST por su cuenta—, así que no puede depender ni del
 * navegador ni de Node.
 */

export type ResultadoTelefono =
  | {
      ok: true
      /** Listo para wa.me: 549 + característica + número, sin 0 ni 15. */
      digitos: string
      /** Cómo se lo mostramos al visitante para que lo confirme. */
      legible: string
    }
  | { ok: false; motivo: string }

/**
 * Lleva un teléfono argentino a su forma internacional para celulares.
 *
 * Antes bastaba con 8 dígitos y así entraron «L22167137» o números a los que
 * les faltaba la característica: Santi no tenía a quién escribirle. Un celular
 * argentino es siempre característica + número = 10 dígitos; lo que sobra
 * alrededor (+54, el 9, el 0 de larga distancia, el 15) es decoración que cada
 * uno escribe a su manera y se quita.
 */
export function normalizarTelefono(entrada: string | null | undefined): ResultadoTelefono {
  const texto = (entrada ?? "").trim()
  if (!texto) return { ok: false, motivo: "Ingresá tu teléfono." }
  if (/[a-z]/i.test(texto)) {
    return { ok: false, motivo: "El teléfono sólo lleva números." }
  }

  let d = texto.replace(/\D/g, "")
  if (d.startsWith("00")) d = d.slice(2)

  // Del exterior: no sabemos validar su numeración, sólo que sea plausible.
  if (texto.startsWith("+") && !d.startsWith("54")) {
    if (d.length < 8 || d.length > 15) {
      return { ok: false, motivo: "Revisá el número: no parece un teléfono válido." }
    }
    return { ok: true, digitos: d, legible: `+${d}` }
  }

  if (d.startsWith("54") && d.length >= 12) d = d.slice(2)
  if (d.startsWith("9") && d.length === 11) d = d.slice(1)
  if (d.startsWith("0")) d = d.slice(1)

  // El 15 va después de la característica, que tiene 2, 3 o 4 cifras.
  if (d.length === 12) {
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === "15") {
        d = d.slice(0, largo) + d.slice(largo + 2)
        break
      }
    }
  }

  if (d.length < 10) {
    return {
      ok: false,
      motivo: "Falta la característica: escribí código de área y número, ej. 3743 487728.",
    }
  }
  if (d.length > 10) {
    return { ok: false, motivo: "Sobran números: escribí código de área y número, sin 0 ni 15." }
  }
  // Ninguna característica empieza por 0 o 1 salvo Buenos Aires (11).
  if (d[0] === "0" || (d[0] === "1" && d[1] !== "1")) {
    return { ok: false, motivo: "Revisá el código de área." }
  }
  if (/^(\d)\1+$/.test(d.slice(-8))) {
    return { ok: false, motivo: "Revisá el número: no parece real." }
  }

  return { ok: true, digitos: `549${d}`, legible: `+54 9 ${d}` }
}

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i

// Errores de tipeo que se repiten con los proveedores que usa la gente acá. Un
// correo mal escrito no rebota en el formulario: rebota cuando Santi contesta.
const DOMINIOS_CORREGIDOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.com.ar": "gmail.com",
  "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hormail.com": "hotmail.com",
  "yahoo.con": "yahoo.com",
  "yaho.com": "yahoo.com",
  "outlook.con": "outlook.com",
  "outlok.com": "outlook.com",
}

export type ResultadoEmail =
  | { ok: true; email: string }
  | { ok: false; motivo: string; sugerencia?: string }

export function validarEmail(entrada: string | null | undefined): ResultadoEmail {
  const email = (entrada ?? "").trim().toLowerCase()
  if (!email) return { ok: false, motivo: "Ingresá tu correo electrónico." }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, motivo: "Revisá el correo: falta algo (ej. nombre@gmail.com)." }
  }

  const [usuario, dominio] = email.split("@")
  const corregido = DOMINIOS_CORREGIDOS[dominio]
  if (corregido) {
    const sugerencia = `${usuario}@${corregido}`
    return { ok: false, motivo: `¿Quisiste decir ${sugerencia}?`, sugerencia }
  }

  return { ok: true, email }
}

/** Primer problema que impide registrar el contacto, o null si está todo bien. */
export function problemaDeContacto(datos: {
  name?: string | null
  phone?: string | null
  email?: string | null
  /** El correo sólo se exige al visitante; Santi carga clientes que no lo dieron. */
  exigirEmail: boolean
}): string | null {
  if (!datos.name?.trim()) return "Ingresá tu nombre."
  const tel = normalizarTelefono(datos.phone)
  if (!tel.ok) return tel.motivo
  if (datos.exigirEmail || datos.email?.trim()) {
    const mail = validarEmail(datos.email)
    if (!mail.ok) return mail.motivo
  }
  return null
}
