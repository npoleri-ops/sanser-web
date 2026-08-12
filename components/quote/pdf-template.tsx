import React from 'react';
import { CONTACT } from '@/lib/shed-config';

export interface QuoteItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface PdfTemplateProps {
  date: string;
  cuit: string;
  phone: string;
  title: string;
  materials: string;
  images: string[];
  items: QuoteItem[];
}

export const PdfTemplate = React.forwardRef<HTMLDivElement, PdfTemplateProps>(({ date, cuit, phone, title, materials, images, items }, ref) => {
  const total = items.reduce((acc, item) => acc + item.quantity * item.price, 0);

  return (
    <div 
      id="pdf-template"
      ref={ref} 
      className="p-12 mx-auto w-[210mm] min-h-[297mm] shadow-lg box-border relative font-sans"
      style={{ backgroundColor: "#ffffff", color: "#000000" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 pb-6 mb-8" style={{ borderColor: "#F97316" }}>
        <div className="w-1/2">
          {/* Logo - assuming we have /sanser-logo.jpeg in public */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sanser-logo.jpeg" alt="SANSER" className="h-24 object-contain" />
        </div>
        <div className="w-1/2 text-right text-sm space-y-1">
          <p className="font-bold text-xl tracking-wider" style={{ color: "#1f2937" }}>PRESUPUESTO</p>
          <p className="mt-2"><strong>Fecha:</strong> {date}</p>
          <p><strong>Tel:</strong> {CONTACT.phoneDisplay}</p>
          <p><strong>Mail:</strong> {CONTACT.email}</p>
          <p><strong>Dir:</strong> {CONTACT.address}</p>
          <p><strong>CUIT:</strong> 27-24674999-5</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8 grid grid-cols-2 gap-4 text-sm p-4 rounded-md border" style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}>
        <p><strong>Cliente CUIT:</strong> {cuit || "Consumidor Final"}</p>
        <p><strong>Teléfono Cliente:</strong> {phone || "No especificado"}</p>
      </div>

      {/* Description */}
      <div className="mb-8">
        <h3 className="font-bold text-lg mb-2 uppercase border-b pb-1" style={{ color: "#F97316", borderColor: "#d1d5db" }}>
          DESCRIPCIÓN DEL TRABAJO: {title || "Tinglado"}
        </h3>
        <div className="text-sm whitespace-pre-wrap leading-relaxed mt-4 p-4 border rounded-md" style={{ color: "#374151", backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}>
          <strong className="block mb-2" style={{ color: "#000000" }}>Materiales de Construcción:</strong>
          {materials || "No se especificaron materiales."}
        </div>
      </div>

      {/* Photos */}
      {images.filter(img => img).length > 0 && (
        <div className="mb-8">
          <h3 className="font-bold text-lg mb-4 uppercase border-b pb-1" style={{ color: "#F97316", borderColor: "#d1d5db" }}>
            FOTOGRAFÍAS / RENDERS DEL TRABAJO
          </h3>
          <div className="grid grid-cols-2 gap-4 h-[250px]">
            {images.map((img, idx) => (
              img ? (
                <div key={idx} className="rounded-lg overflow-hidden border h-full flex items-center justify-center" style={{ backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Render ${idx+1}`} className="w-full h-full object-cover" />
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* Budget Table */}
      <div className="mb-8">
        <h3 className="font-bold text-lg mb-4 uppercase border-b pb-1" style={{ color: "#F97316", borderColor: "#d1d5db" }}>
          PRESUPUESTO DETALLADO
        </h3>
        <table className="w-full text-sm border-collapse border" style={{ borderColor: "#d1d5db" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6", color: "#1f2937" }}>
              <th className="border p-2 text-left" style={{ borderColor: "#d1d5db" }}>Ítem</th>
              <th className="border p-2 text-center w-20" style={{ borderColor: "#d1d5db" }}>Unid</th>
              <th className="border p-2 text-center w-20" style={{ borderColor: "#d1d5db" }}>Cant</th>
              <th className="border p-2 text-right w-32" style={{ borderColor: "#d1d5db" }}>Precio Unit.</th>
              <th className="border p-2 text-right w-32" style={{ borderColor: "#d1d5db" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border p-2" style={{ borderColor: "#d1d5db" }}>{item.description}</td>
                <td className="border p-2 text-center" style={{ borderColor: "#d1d5db" }}>{item.unit}</td>
                <td className="border p-2 text-center" style={{ borderColor: "#d1d5db" }}>{item.quantity}</td>
                <td className="border p-2 text-right" style={{ borderColor: "#d1d5db" }}>
                  ${item.price.toLocaleString("es-AR")}
                </td>
                <td className="border p-2 text-right" style={{ borderColor: "#d1d5db" }}>
                  ${(item.price * item.quantity).toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="border p-4 text-center" style={{ borderColor: "#d1d5db", color: "#6b7280" }}>
                  No hay ítems cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-end mt-10">
        <div className="px-8 py-4 rounded-md shadow-md text-right" style={{ backgroundColor: "#F97316", color: "#ffffff" }}>
          <p className="text-sm font-semibold uppercase opacity-90 mb-1">TOTAL FINAL</p>
          <p className="text-3xl font-bold tracking-tight">
            $ {total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      
      {/* Footer message */}
      <div className="absolute bottom-12 left-12 right-12 text-center text-xs border-t pt-4" style={{ color: "#9ca3af", borderColor: "#e5e7eb" }}>
        Los presupuestos tienen una validez de 7 días. Precios sujetos a modificación sin previo aviso.
      </div>
    </div>
  );
});
PdfTemplate.displayName = 'PdfTemplate';
