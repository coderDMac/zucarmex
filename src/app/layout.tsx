import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Portal de Clientes ZUCARMEX — Culiacán', template: '%s | ZUCARMEX' },
  description:
    'Gestiona tus pedidos y anticipa tu abastecimiento. Prototipo académico para el Punto de Venta Culiacán.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
