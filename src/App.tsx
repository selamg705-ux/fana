import React, { useState, useEffect, useRef } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { NewProductsSection } from './components/NewProductsSection.tsx';
import { UsedProductsSection } from './components/UsedProductsSection.tsx';
import { SellProductModal } from './components/SellProductModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { SuperAdminPortal } from './components/SuperAdminPortal.tsx';
import { SellerDashboardModal } from './components/SellerDashboardModal.tsx';
import { MyOrdersModal } from './components/MyOrdersModal.tsx';
import { ChangePasswordModal } from './components/ChangePasswordModal.tsx';
import { Footer } from './components/Footer.tsx';
import { Category, Product } from './types/index.ts';
import { CheckCircle2, Sparkles, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';
import { safeApiFetch, safeText } from './utils/api.ts';

function MarketplaceContent() {
  const { isSuperAdmin, isSeller, user } = useAuth();
  const { t } = useLanguage();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modals state
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isSellerDashboardOpen, setIsSellerDashboardOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderSuccessNumber, setOrderSuccessNumber] = useState<string | null>(null);

  // Section scroll refs
  const newSectionRef = useRef<HTMLDivElement>(null);
  const usedSectionRef = useRef<HTMLDivElement>(null);

  // Fetch categories and products from Neon PostgreSQL
  const fetchData = async () => {
    setIsLoading(true);
    try {
      let prodUrl = '/api/products';
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      if (params.toString()) {
        prodUrl += `?${params.toString()}`;
      }

      const [catsRes, prodsRes] = await Promise.all([
        safeApiFetch<Category[]>('/api/categories'),
        safeApiFetch<Product[]>(prodUrl)
      ]);

      if (catsRes.ok && Array.isArray(catsRes.data)) {
        setCategories(catsRes.data);
      }
      if (prodsRes.ok && Array.isArray(prodsRes.data)) {
        setProducts(prodsRes.data);
      }
    } catch (err) {
      console.warn('Could not load marketplace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, searchQuery]);

  const scrollToNew = () => {
    newSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToUsed = () => {
    usedSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // STRICT SEPARATION OF NEW AND USED PRODUCTS (Core Prompt Requirement)
  const newProducts = products.filter((p) => p.condition === 'new');
  const usedProducts = products.filter((p) => p.condition === 'used');

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 flex flex-col font-sans text-gray-900 selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        categories={categories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onOpenSellModal={() => setIsSellModalOpen(true)}
        onOpenAuthModal={(mode) => {
          setAuthMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        onOpenSellerDashboard={() => setIsSellerDashboardOpen(true)}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
        onOpenChangePasswordModal={() => setIsChangePasswordOpen(true)}
      />


      <main className="flex-1">
        {/* Hero Section */}
        <HeroBanner
          onOpenSellModal={() => setIsSellModalOpen(true)}
          onScrollToNew={scrollToNew}
          onScrollToUsed={scrollToUsed}
        />

        {/* 1. NEW PRODUCTS SECTION (አዲስ እቃ) — Independent Vertical Section */}
        <div ref={newSectionRef} id="new-products">
          <NewProductsSection
            products={newProducts}
            onSelectProduct={(p) => setSelectedProduct(p)}
            isLoading={isLoading}
          />
        </div>


        {/* 2. USED PRODUCTS SECTION (ያገለገሉ እቃ) — Independent Vertical Section */}
        <div ref={usedSectionRef} id="used-products">
          <UsedProductsSection
            products={usedProducts}
            onSelectProduct={(p) => setSelectedProduct(p)}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Footer */}
      <Footer onOpenAdminPortal={() => setIsAdminPortalOpen(true)} />

      {/* Modals */}
      <SellProductModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        categories={categories}
        onProductCreated={fetchData}
        onRequireAuth={() => {
          setAuthMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onBuyNow={(p) => {
          setSelectedProduct(null);
          setIsCheckoutModalOpen(true);
        }}
      />

      <CartDrawer
        onProceedToCheckout={() => setIsCheckoutModalOpen(true)}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onOrderSuccess={(orderNum) => {
          setOrderSuccessNumber(safeText(orderNum, 'ORD-CONFIRMED'));
          fetchData();
        }}
      />

      <SuperAdminPortal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
        onRefreshMarketplace={fetchData}
      />

      <SellerDashboardModal
        isOpen={isSellerDashboardOpen}
        onClose={() => setIsSellerDashboardOpen(false)}
        onOpenSellModal={() => setIsSellModalOpen(true)}
        onRefreshMarketplace={fetchData}
      />

      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Order Success Confirmation Banner */}
      {orderSuccessNumber && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-emerald-200 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-gray-900">{t('checkout.successTitle', 'ትዕዛዝዎ በተሳካ ሁኔታ ተመዝግቧል!')}</h3>
            <p className="text-xs text-gray-600">
              {t('checkout.orderNumber', 'የትዕዛዝ ቁጥርዎ:')}{' '}
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                {orderSuccessNumber}
              </span>
            </p>
            <p className="text-xs text-gray-500">
              {t('checkout.successDesc', 'ሻጩ ትዕዛዝዎን ተቀብሎ በአጭር ጊዜ ውስጥ በስልክዎ ይደውላል።')}
            </p>
            <button
              onClick={() => setOrderSuccessNumber(null)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all"
            >
              {t('detail.close', 'እሺ፣ ተረዳሁ (Close)')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CartProvider>
          <MarketplaceContent />
        </CartProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
