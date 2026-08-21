import { NextResponse } from "next/server";
import { createLead, readRequestContext } from "@/lib/crm/leads";
import { isDatabaseConfigured } from "@/lib/crm/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, 
      phone, 
      message, 
      empresa_url, 
      mountTime
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

    // Guardar en el CRM antes de reenviar. Si la base falla no se pierde la
    // consulta: Formspree sigue siendo la vía de aviso por correo.
    if (isDatabaseConfigured()) {
      try {
        await createLead(
          {
            kind: "contacto",
            name: name || null,
            phone: phone || null,
            message: message || null,
            sourcePath: body.sourcePath || "/",
          },
          readRequestContext(req),
        );
      } catch (dbError) {
        console.error("No se pudo guardar el contacto en el CRM", dbError);
      }
    }

    // En local no se reenvía: si no, cada prueba del formulario acaba como correo
    // real en la casilla de SANSER. Poné FORMSPREE_ENABLED=true para probarlo.
    if (process.env.NODE_ENV !== "production" && process.env.FORMSPREE_ENABLED !== "true") {
      console.log("[contacto] Guardado en el CRM; reenvío a Formspree omitido fuera de producción");
      return NextResponse.json({ success: true, message: "Consulta enviada con éxito" });
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
