import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/firebase/auth-context';
import { InventoryProvider } from '@/lib/store/inventory-store';

export const metadata: Metadata = {
  title: 'FlowCast Enterprise - Intelligent Retail Demand & Replenishment',
  description: 'Explainable retail inventory planning platform with statistical demand forecasting and automated replenishment optimization.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <AuthProvider>
          <InventoryProvider>
            {children}
          </InventoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
