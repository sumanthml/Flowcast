'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { AuthView } from '@/components/AuthView';
import { Navbar } from '@/components/Navbar';
import { DashboardOverview } from '@/components/DashboardOverview';
import { RecommendationsTab } from '@/components/RecommendationsTab';
import { ForecastingTab } from '@/components/ForecastingTab';
import { ProductsTab } from '@/components/ProductsTab';
import { MovementsTab } from '@/components/MovementsTab';
import { PurchaseOrdersTab } from '@/components/PurchaseOrdersTab';
import { CsvImportExportTab } from '@/components/CsvImportExportTab';
import { TocLabTab } from '@/components/TocLabTab';
import { StockMovementModal } from '@/components/StockMovementModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { GroqChatDrawer } from '@/components/GroqChatDrawer';
import { Product } from '@/types';
import { Boxes, Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isGroqChatOpen, setIsGroqChatOpen] = useState<boolean>(false);
  
  // Selected product for stock movement adjustment modal
  const [movementModalProduct, setMovementModalProduct] = useState<Product | null>(null);

  // Selected product to spotlight in Verification & Decision Rules
  const [tocSpotlightProductId, setTocSpotlightProductId] = useState<string | undefined>(undefined);

  const handleSelectProductForToc = (productId: string) => {
    setTocSpotlightProductId(productId);
    setActiveTab('toc_lab');
  };

  // 1. Initial Auth Session Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Boxes className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm tracking-tight">FlowCast Enterprise</span>
            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          </div>
          <p className="text-xs text-slate-500">Connecting secure retail workspace...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Show World-Class Auth View (Login / Register)
  if (!user) {
    return <AuthView initialMode="signin" />;
  }

  // 3. Authenticated State: Main Platform
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Fixed Header with Business Switcher, User Profile & Navigation */}
      <Navbar
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenGroqChat={() => setIsGroqChatOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {activeTab === 'overview' && (
          <DashboardOverview
            onNavigateToTab={setActiveTab}
            onSelectProductForToc={handleSelectProductForToc}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'forecasting' && (
          <ForecastingTab
            selectedProductId={tocSpotlightProductId}
          />
        )}

        {activeTab === 'products' && (
          <ProductsTab
            onOpenMovementModal={(prod) => setMovementModalProduct(prod)}
          />
        )}

        {activeTab === 'movements' && (
          <MovementsTab />
        )}

        {activeTab === 'purchase_orders' && (
          <PurchaseOrdersTab />
        )}

        {activeTab === 'csv_import' && (
          <CsvImportExportTab />
        )}

        {activeTab === 'toc_lab' && (
          <TocLabTab
            initialProductId={tocSpotlightProductId}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            FlowCast Enterprise • Intelligent Retail Demand & Replenishment Platform
          </p>
          <p className="text-[11px] text-slate-400">
            Advisory decision-support engine • Recommendations never auto-place external orders
          </p>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <StockMovementModal
        product={movementModalProduct}
        onClose={() => setMovementModalProduct(null)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      <GroqChatDrawer
        isOpen={isGroqChatOpen}
        onClose={() => setIsGroqChatOpen(false)}
      />

    </div>
  );
}
