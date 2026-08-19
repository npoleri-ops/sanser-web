import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, 
      phone, 
      message, 
      empresa_url, 
      mountTime,
      turnstileToken 
    } = body;

    // 1. Honeypot check (Trampa invisible para bots)
    // Si el campo tiene texto, abortamos de forma silenciosa simulando éxito
    if (empresa_url && empresa_url.trim() !== "") {
      return NextResponse.json({ success: true, message: "Consulta enviada" }, { status: 200 });
    }

    // 2. Time-trap check (Protección de tiempo mínimo)
    // Si se envía en menos de 2 segundos desde su carga, descartamos
    if (mountTime) {
      const timeElapsed = Date.now() - parseInt(mountTime, 10);
      if (timeElapsed < 2000) {
        return NextResponse.json({ success: true, message: "Consulta enviada" }, { status: 200 });
      }
    } else {
      // Si no viene el tiempo, es sospechoso, pero por ahora podríamos ser permisivos. 
      // Por mayor seguridad, lo descartamos.
      return NextResponse.json({ success: true, message: "Consulta enviada" }, { status: 200 });
    }

    // 3. Turnstile check (si se envió token)
    if (!turnstileToken) {
      return NextResponse.json({ success: false, message: "Falta validación de seguridad." }, { status: 400 });
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      const formData = new FormData();
      formData.append("secret", turnstileSecret);
      formData.append("response", turnstileToken);

      const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: formData,
      });

      const turnstileData = await turnstileRes.json();

      if (!turnstileData.success) {
        return NextResponse.json({ success: false, message: "Validación de seguridad fallida." }, { status: 400 });
      }
    }

    // Enviar a Formspree u otro destino (como el endpoint original https://formspree.io/f/xyegjjdz)
    const formspreeEndpoint = "https://formspree.io/f/xyegjjdz";
    const formspreeFormData = new FormData();
    formspreeFormData.append("name", name || "Cliente");
    formspreeFormData.append("phone", phone || "");
    formspreeFormData.append("message", message || "");
    formspreeFormData.append("_subject", `Nueva consulta de ${name || "Cliente"} (SANSER Web)`);
    formspreeFormData.append("_replyto", "sansermetalurgica@gmail.com");

    const response = await fetch(formspreeEndpoint, {
      method: "POST",
      body: formspreeFormData,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: "Consulta enviada con éxito" });
    } else {
      throw new Error("Error enviando a formspree");
    }

  } catch (error) {
    console.error("Error en contacto:", error);
    return NextResponse.json(
      { success: false, message: "Hubo un problema al procesar la solicitud." },
      { status: 500 }
    );
  }
}
