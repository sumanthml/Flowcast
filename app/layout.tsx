import type { Metadata } from 'next';
import './globals.css';
import { InventoryProvider } from '@/lib/store/inventory-store';

export const metadata: Metadata = {
  title: 'FlowCast TOC - Explainable Inventory Planning Platform',
  description: 'Explainable retail inventory planning platform with Theory of Computation Finite Automaton state classification and statistical demand forecasting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <InventoryProvider>
          {children}
        </InventoryProvider>
      </body>
    </html>
  );
}
