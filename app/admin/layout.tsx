import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "CRM interno",
  // El panel no debe aparecer en buscadores bajo ningún concepto.
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
