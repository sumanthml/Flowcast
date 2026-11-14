'use client';

import React, { useState } from 'react';
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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isGroqChatOpen, setIsGroqChatOpen] = useState<boolean>(false);
  
  // Selected product for stock movement adjustment modal
  const [movementModalProduct, setMovementModalProduct] = useState<Product | null>(null);

  // Selected product to spotlight in TOC Automata Lab
  const [tocSpotlightProductId, setTocSpotlightProductId] = useState<string | undefined>(undefined);

  const handleSelectProductForToc = (productId: string) => {
    setTocSpotlightProductId(productId);
    setActiveTab('toc_lab');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Fixed Header with Business Switcher & Tabs */}
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
            FlowCast TOC • Explainable Inventory Planning Platform • Theory of Computation Finite Automaton Model
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
