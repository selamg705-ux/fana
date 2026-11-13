import React, { useState } from 'react';
import { ShoppingBag, PlusCircle, User, ShieldCheck, Store, LogOut, Package, X, Globe, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Category } from '../types/index.ts';

interface NavbarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenSellModal: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onOpenAdminPortal: () => void;
  onOpenSellerDashboard: () => void;
  onOpenMyOrders: () => void;
  onOpenChangePasswordModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedCategory: _selectedCategory,
  onSelectCategory,
  onOpenSellModal,
  onOpenAuthModal,
  onOpenAdminPortal,
  onOpenSellerDashboard,
  onOpenMyOrders,
  onOpenChangePasswordModal,
}) => {
  const { user, isSuperAdmin, isAdmin, isSeller, logout } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayName = user?.fullName || (user as any)?.full_name || user?.email || user?.phone || 'User';
  const userInitial = (displayName.trim().charAt(0) || 'U').toUpperCase();
  const userRole = user?.role || 'customer';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-emerald-100 shadow-sm">
      {/* Top Header Area */}
      <div className="bg-emerald-950 text-white text-xs py-2 px-3 sm:px-6 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Top Header Area: Logo & Name on left, Language & Hamburger on RIGHT */}
          <div className="flex md:hidden items-center justify-between gap-1.5">
            {/* Mela Market Logo & Name */}
            <button
              onClick={() => {
                onSelectCategory('');
              }}
              className="flex items-center gap-1.5 text-left group flex-shrink-0"
              title="Mela Market"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-transform flex-shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="flex items-center gap-1 leading-none">
                <span className="text-base font-black text-white tracking-tight">
                  MELA
                </span>
                <span className="text-base font-light text-emerald-300">
                  MARKET
                </span>
              </div>
            </button>

            {/* Mobile Language Selector */}
            <div className="inline-flex items-center rounded-lg bg-emerald-900 border border-emerald-700/80 p-0.5 text-[10px] flex-shrink-0">
              <button
                type="button"
                onClick={() => setLanguage('am')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  language === 'am' ? 'bg-amber-400 text-emerald-950 shadow-xs' : 'text-emerald-200 hover:text-white'
                }`}
                title="አማርኛ (Amharic)"
              >
                አማ
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  language === 'en' ? 'bg-amber-400 text-emerald-950 shadow-xs' : 'text-emerald-200 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ti')}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  language === 'ti' ? 'bg-amber-400 text-emerald-950 shadow-xs' : 'text-emerald-200 hover:text-white'
                }`}
                title="ትግርኛ (Tigrinya)"
              >
                ትግ
              </button>
            </div>

            {/* Right Side: Mobile Hamburger Menu (☰) on the FAR RIGHT */}
            <div className="flex items-center gap-1.5 flex-shrink-0">

              {/* Mobile Hamburger Menu (☰) on the FAR RIGHT */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-900 text-white border border-emerald-700/80 hover:bg-emerald-800 active:scale-95 transition-all flex-shrink-0"
                aria-label={t('nav.menu')}
                title={t('nav.menu')}
              >
                {isMobileMenuOpen ? (
                  <X className="w-4 h-4 text-white" strokeWidth={2.5} />
                ) : (
                  <svg
                    className="w-4 h-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Top Bar */}
          <div className="hidden md:flex justify-between items-center text-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-300 text-[11px]">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('nav.locationBar')}</span>
            </div>

            <div className="flex items-center gap-3.5">

              {/* Three-Language Selector: Amharic (አማርኛ), English, Tigrinya (ትግርኛ) */}
              <div className="inline-flex items-center rounded-lg bg-emerald-900/90 border border-emerald-700/80 p-0.5 text-[11px] shadow-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('am')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    language === 'am'
                      ? 'bg-amber-400 text-emerald-950 font-bold shadow-xs'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                  title="አማርኛ (Amharic)"
                >
                  አማርኛ
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    language === 'en'
                      ? 'bg-amber-400 text-emerald-950 font-bold shadow-xs'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                  title="English"
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ti')}
                  className={`px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    language === 'ti'
                      ? 'bg-amber-400 text-emerald-950 font-bold shadow-xs'
                      : 'text-emerald-200 hover:text-white'
                  }`}
                  title="ትግርኛ (Tigrinya)"
                >
                  ትግርኛ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        {/* Mobile Main Row (< md): Action Buttons */}
        <div className="flex md:hidden items-center justify-between h-12 py-1 gap-2">
          {/* Start Selling Button (እቃ ይሽጡ) */}
          <button
            onClick={onOpenSellModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-xs active:scale-95 transition-all flex-shrink-0 whitespace-nowrap"
            title="እቃ ይሽጡ (Sell Product)"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
            <span>እቃ ይሽጡ</span>
          </button>

          {/* Action Buttons on Mobile: Neatly arranged without overlapping or clipping */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-emerald-900 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors flex-shrink-0"
              title="የግዢ ጋሪ (Shopping Cart)"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-emerald-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow">
                  {totalItems}
                </span>
              )}
            </button>

            {/* User Account / Sign In */}
            <div className="relative flex-shrink-0">
              {user ? (
                <div>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center border border-emerald-300 hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                    title={displayName}
                  >
                    {userInitial}
                  </button>
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                      onClick={() => setIsUserMenuOpen(false)}
                     >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">{t('nav.signedInAs')}</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{displayName}</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          userRole === 'superadmin'
                            ? 'bg-purple-100 text-purple-800'
                            : userRole === 'seller'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {userRole === 'superadmin' ? '⭐ Super Admin' : userRole === 'seller' ? '🏪 Verified Seller' : '👤 Customer'}
                        </span>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={onOpenAdminPortal}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>{t('nav.superAdmin')}</span>
                        </button>
                      )}

                      {isSeller && (
                        <button
                          onClick={onOpenSellerDashboard}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                        >
                          <Store className="w-4 h-4 text-amber-600" />
                          <span>{t('nav.sellerHub')}</span>
                        </button>
                      )}

                      <button
                        onClick={onOpenMyOrders}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Package className="w-4 h-4 text-gray-500" />
                        <span>{t('nav.myOrders')}</span>
                      </button>

                      {onOpenChangePasswordModal && (
                        <button
                          onClick={onOpenChangePasswordModal}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="w-4 h-4 flex items-center justify-center text-gray-400">🔑</span>
                          <span>{t('nav.changePassword')}</span>
                        </button>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onOpenAuthModal('login')}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors flex-shrink-0 whitespace-nowrap"
                  title={`${t('nav.signIn')} / Sign In`}
                >
                  <User className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>{t('nav.signIn')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Main Row (>= md): Unchanged desktop layout */}
        <div className="hidden md:flex items-center justify-between h-16 md:h-20 gap-3">
          {/* Logo & Brand Identity (Desktop & Tablet) */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <button
              onClick={() => {
                onSelectCategory('');
              }}
              className="flex items-center gap-2.5 text-left group flex-shrink-0"
              title="Mela Market"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform flex-shrink-0">
                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-amber-300" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-xl md:text-2xl font-black text-emerald-900 tracking-tight">
                    MELA
                  </span>
                  <span className="text-xl md:text-2xl font-light text-emerald-600">
                    MARKET
                  </span>
                </div>
                <span className="text-[10px] md:text-[11px] font-medium text-emerald-700 mt-0.5 tracking-wider truncate max-w-[150px] md:max-w-none">
                  {t('brand.subtitle')}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Action Buttons */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {/* Start Selling Button */}
            <button
              onClick={onOpenSellModal}
              className="flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs md:text-sm px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-xs active:scale-95 transition-all flex-shrink-0 whitespace-nowrap"
              title={t('nav.sellProduct')}
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <span>{t('nav.sellProduct')}</span>
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 md:p-3 text-emerald-900 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors flex-shrink-0"
              title={t('nav.cart')}
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-emerald-950 font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Super Admin Direct Button */}
            {isSuperAdmin && (
              <button
                onClick={onOpenAdminPortal}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition-colors"
                title="Super Admin Control System"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>{t('nav.superAdmin')}</span>
              </button>
            )}

            {/* User Account / Login Icon on Desktop */}
            <div className="relative flex-shrink-0">
              {user ? (
                <div className="flex items-center">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left flex-shrink-0"
                    title={displayName}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {userInitial}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-bold text-gray-800 truncate max-w-[110px]">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                        {userRole}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500">{t('nav.signedInAs')}</p>
                        <p className="text-sm font-bold text-gray-800 truncate">{displayName}</p>
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          userRole === 'superadmin'
                            ? 'bg-purple-100 text-purple-800'
                            : userRole === 'seller'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {userRole === 'superadmin' ? '⭐ Super Admin' : userRole === 'seller' ? '🏪 Verified Seller' : '👤 Customer'}
                        </span>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={onOpenAdminPortal}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>{t('nav.superAdmin')}</span>
                        </button>
                      )}

                      {isSeller && (
                        <button
                          onClick={onOpenSellerDashboard}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2"
                        >
                          <Store className="w-4 h-4 text-amber-600" />
                          <span>{t('nav.sellerHub')}</span>
                        </button>
                      )}

                      <button
                        onClick={onOpenMyOrders}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Package className="w-4 h-4 text-gray-500" />
                        <span>{t('nav.myOrders')}</span>
                      </button>

                      {onOpenChangePasswordModal && (
                        <button
                          onClick={onOpenChangePasswordModal}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="w-4 h-4 flex items-center justify-center text-gray-400">🔑</span>
                          <span>{t('nav.changePassword')}</span>
                        </button>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    onClick={() => onOpenAuthModal('login')}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2.5 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0 whitespace-nowrap"
                    title={`${t('nav.signIn')} / Sign In`}
                  >
                    <User className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                    <span>{t('nav.signIn')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-emerald-100 bg-white px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 shadow-lg rounded-b-2xl">
            {/* 3-Language Selector in Mobile Menu */}
            <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-700" />
                <span>ቋንቋ / Language / ቋንቋ:</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setLanguage('am')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    language === 'am'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  አማርኛ
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    language === 'en'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ti')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    language === 'ti'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  ትግርኛ
                </button>
              </div>
            </div>

            {/* Quick Sell Button */}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSellModal();
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-sm active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-amber-300" />
              <span>{t('nav.sellProduct')}</span>
            </button>

            {/* User Links */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
              {isAdmin && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAdminPortal();
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-lg font-bold text-purple-700 bg-purple-50 flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>{t('nav.superAdmin')}</span>
                </button>
              )}

              {isSeller && (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenSellerDashboard();
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-lg font-bold text-amber-800 bg-amber-50 flex items-center gap-2"
                >
                  <Store className="w-4 h-4 text-amber-600" />
                  <span>{t('nav.sellerHub')}</span>
                </button>
              )}

              {user ? (
                <>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenMyOrders();
                    }}
                    className="w-full text-left py-2.5 px-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Package className="w-4 h-4 text-gray-500" />
                    <span>{t('nav.myOrders')}</span>
                  </button>
                  {onOpenChangePasswordModal && (
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenChangePasswordModal();
                      }}
                      className="w-full text-left py-2.5 px-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="w-4 h-4 flex items-center justify-center text-gray-400">🔑</span>
                      <span>{t('nav.changePassword')}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left py-2.5 px-3 rounded-lg font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuthModal('login');
                  }}
                  className="w-full text-center py-2.5 px-3 rounded-xl font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>{t('nav.openAccountOrSignIn')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
