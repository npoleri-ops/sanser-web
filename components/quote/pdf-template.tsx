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
      ref={ref} 
      className="bg-white text-black p-12 mx-auto w-[210mm] min-h-[297mm] shadow-lg box-border relative font-sans"
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-[#F97316] pb-6 mb-8">
        <div className="w-1/2">
          {/* Logo - assuming we have /sanser-logo.jpeg in public */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sanser-logo.jpeg" alt="SANSER" className="h-24 object-contain" />
        </div>
        <div className="w-1/2 text-right text-sm space-y-1">
          <p className="font-bold text-xl text-gray-800 tracking-wider">PRESUPUESTO</p>
          <p className="mt-2"><strong>Fecha:</strong> {date}</p>
          <p><strong>Tel:</strong> {CONTACT.phoneDisplay}</p>
          <p><strong>Mail:</strong> {CONTACT.email}</p>
          <p><strong>Dir:</strong> {CONTACT.address}</p>
          <p><strong>CUIT:</strong> 27-24674999-5</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8 grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-md border border-gray-200">
        <p><strong>Cliente CUIT:</strong> {cuit || "Consumidor Final"}</p>
        <p><strong>Teléfono Cliente:</strong> {phone || "No especificado"}</p>
      </div>

      {/* Description */}
      <div className="mb-8">
        <h3 className="font-bold text-lg text-[#F97316] mb-2 uppercase border-b border-gray-300 pb-1">
          DESCRIPCIÓN DEL TRABAJO: {title || "Tinglado"}
        </h3>
        <div className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed bg-white mt-4 p-4 border border-gray-200 rounded-md">
          <strong className="block mb-2 text-black">Materiales de Construcción:</strong>
          {materials || "No se especificaron materiales."}
        </div>
      </div>

      {/* Photos */}
      {images.filter(img => img).length > 0 && (
        <div className="mb-8">
          <h3 className="font-bold text-lg text-[#F97316] mb-4 uppercase border-b border-gray-300 pb-1">
            FOTOGRAFÍAS DEL TRABAJO
          </h3>
          <div className="grid grid-cols-2 gap-4 h-[250px]">
            {images.map((img, idx) => (
              img ? (
                <div key={idx} className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 h-full">
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
        <h3 className="font-bold text-lg text-[#F97316] mb-4 uppercase border-b border-gray-300 pb-1">
          PRESUPUESTO DETALLADO
        </h3>
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-800">
              <th className="border border-gray-300 p-2 text-left">Ítem</th>
              <th className="border border-gray-300 p-2 text-center w-20">Unid</th>
              <th className="border border-gray-300 p-2 text-center w-20">Cant</th>
              <th className="border border-gray-300 p-2 text-right w-32">Precio Unit.</th>
              <th className="border border-gray-300 p-2 text-right w-32">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border border-gray-300 p-2">{item.description}</td>
                <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">
                  ${item.price.toLocaleString("es-AR")}
                </td>
                <td className="border border-gray-300 p-2 text-right">
                  ${(item.price * item.quantity).toLocaleString("es-AR")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="border border-gray-300 p-4 text-center text-gray-500">
                  No hay ítems cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-end mt-10">
        <div className="bg-[#F97316] text-white px-8 py-4 rounded-md shadow-md text-right">
          <p className="text-sm font-semibold uppercase opacity-90 mb-1">TOTAL FINAL</p>
          <p className="text-3xl font-bold tracking-tight">
            $ {total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      
      {/* Footer message */}
      <div className="absolute bottom-12 left-12 right-12 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
        Los presupuestos tienen una validez de 7 días. Precios sujetos a modificación sin previo aviso.
      </div>
    </div>
  );
});
PdfTemplate.displayName = 'PdfTemplate';
