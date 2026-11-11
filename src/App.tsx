/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { useLanguage } from './context/LanguageContext';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { CategoryBar } from './components/CategoryBar';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { CartModal } from './components/CartModal';
import { SellModal } from './components/SellModal';
import { AuthModal } from './components/AuthModal';
import { AdminPortal } from './components/AdminPortal';
import { AboutModal } from './components/AboutModal';
import { HelpCenterModal } from './components/HelpCenterModal';
import { Footer } from './components/Footer';
import { FloatingContact } from './components/FloatingContact';
import { productCategories } from './data/categories';
import { RotateCcw, PackageSearch, Sparkles } from 'lucide-react';

const MarketplaceContent: React.FC = () => {
  const { t, localize } = useLanguage();
  const {
    filteredProducts,
    selectedCategory,
    searchQuery,
    selectedRegion,
    selectedZone,
    resetFilters,
  } = useMarketplace();

  // Route state: 'home' | 'admin-login' | 'admin'
  const [currentRoute, setCurrentRoute] = useState<'home' | 'admin-login' | 'admin'>(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/admin/login' || hash === '#admin/login' || hash === '#/admin/login') {
      return 'admin-login';
    }
    if (path === '/admin' || path.startsWith('/admin') || hash === '#admin' || hash === '#/admin') {
      return 'admin';
    }
    return 'home';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin/login' || hash === '#admin/login' || hash === '#/admin/login') {
        setCurrentRoute('admin-login');
      } else if (path === '/admin' || path.startsWith('/admin') || hash === '#admin' || hash === '#/admin') {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('home');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const handleReturnToMarketplace = () => {
    window.history.pushState(null, '', '/');
    setCurrentRoute('home');
  };

  // If directly accessing /admin/login (private admin login route) or /admin (dashboard)
  if (currentRoute === 'admin' || currentRoute === 'admin-login') {
    return (
      <AdminPortal
        onReturnToMarketplace={handleReturnToMarketplace}
        isExplicitLoginRoute={currentRoute === 'admin-login'}
      />
    );
  }

  // Active Category Name
  const currentCategory = productCategories.find((c) => c.id === selectedCategory);
  const activeCategoryTitle =
    selectedCategory === 'all'
      ? t('categories.all')
      : currentCategory
      ? localize(currentCategory.name)
      : t('categories.title');

  const isFiltering = Boolean(selectedCategory !== 'all' || searchQuery || selectedRegion || selectedZone);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
      
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <HeroSection />

      {/* Horizontal Category Bar */}
      <CategoryBar />

      {/* Main Product Grid Section */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        
        {/* Section Heading & Filter Indicators */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200/80 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {activeCategoryTitle}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                {filteredProducts.length}
              </span>
            </div>
            {isFiltering && (
              <p className="text-xs text-slate-500 mt-1">
                Showing results for your active filters and search criteria.
              </p>
            )}
          </div>

          {isFiltering && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-700 bg-white text-xs font-bold text-slate-700 hover:text-emerald-900 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('filter.reset')}</span>
            </button>
          )}
        </div>

        {/* Product Cards Grid: 4 columns desktop, 2 tablet, 1 mobile */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          /* Empty Search / Filter State */
          <div className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-200/70 shadow-xs max-w-lg mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
              <PackageSearch className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              {t('filter.noResults')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
              Try searching with broader terms or removing region and category filters to browse all available items.
            </p>
            <button
              onClick={resetFilters}
              className="px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>{t('filter.reset')}</span>
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />

      {/* Floating Action Buttons for quick Phone and WhatsApp contact */}
      <FloatingContact />

      {/* Interactive Modals */}
      <ProductModal />
      <CartModal />
      <SellModal />
      <AuthModal />
      <AboutModal />
      <HelpCenterModal />

    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MarketplaceProvider>
          <MarketplaceContent />
        </MarketplaceProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
