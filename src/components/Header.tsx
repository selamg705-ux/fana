import React, { useState, useRef, useEffect } from 'react';
import { ShoppingBag, PlusCircle, User, LogOut, Menu, X, ChevronDown, Globe, HelpCircle, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { Language } from '../types';

export const Header: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut, openAuthModal } = useAuth();
  const { cartItemCount, setIsCartOpen, setIsSellModalOpen, setIsAboutModalOpen, setIsHelpModalOpen } = useMarketplace();

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePostAdClick = () => {
    if (!user) {
      openAuthModal('login', 'postAd');
    } else {
      setIsSellModalOpen(true);
    }
    setIsMobileMenuOpen(false);
  };

  const languagesList: { code: Language; label: string; sub: string }[] = [
    { code: 'am', label: 'አማርኛ', sub: 'Amharic' },
    { code: 'ti', label: 'ትግርኛ', sub: 'Tigrinya' },
    { code: 'en', label: 'English', sub: 'English' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="group flex items-center gap-2.5 focus:outline-hidden"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-900/15 group-hover:scale-105 transition-transform">
                <span className="text-amber-400 font-extrabold text-2xl tracking-tighter">መ</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-emerald-900 tracking-tight leading-none group-hover:text-emerald-700 transition-colors">
                  {t('brand.name')}
                </span>
                <span className="text-[11px] font-medium text-slate-500 tracking-wider mt-1 uppercase">
                  {t('brand.subtitle')}
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-700">
            <button
              onClick={() => setIsAboutModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors cursor-pointer py-1"
            >
              <Info className="w-4 h-4 text-emerald-700" />
              <span>{t('nav.about')}</span>
            </button>
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-emerald-800 transition-colors cursor-pointer py-1"
            >
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <span>{t('nav.help')}</span>
            </button>
          </nav>

          {/* Desktop Right Controls */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-emerald-700/50 hover:bg-slate-50 text-slate-800 text-sm font-semibold transition-all cursor-pointer"
                aria-label="Select language"
              >
                <Globe className="w-4 h-4 text-emerald-800" />
                <span>{language === 'am' ? 'አማርኛ' : language === 'ti' ? 'ትግርኛ' : 'EN'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-100">
                    Language / ቋንቋ
                  </div>
                  {languagesList.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLanguage(item.code);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between transition-colors cursor-pointer ${
                        language === item.code
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-slate-400 font-normal">{item.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl border border-slate-200 hover:border-emerald-700/50 hover:bg-slate-50 text-slate-800 transition-all cursor-pointer group"
              title={t('cart.title')}
              aria-label={t('cart.title')}
            >
              <ShoppingBag className="w-5 h-5 text-slate-700 group-hover:text-emerald-800 transition-colors" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-emerald-950 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs border-2 border-white scale-100 animate-in zoom-in-75">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Auth / Account Menu */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-emerald-800/20 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-900 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-800" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-400">{t('nav.account')}</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        signOut();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-500" />
                <span>{t('nav.login')}</span>
              </button>
            )}

            {/* Post Free Ad CTA */}
            <button
              onClick={handlePostAdClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/20 active:scale-98 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>{t('nav.postAd')}</span>
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-700"
              aria-label="Cart"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute 0 top-1 right-1 bg-amber-400 text-emerald-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-emerald-800 focus:outline-hidden"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-400">Language / ቋንቋ</span>
            <div className="flex gap-1.5">
              {languagesList.map((item) => (
                <button
                  key={item.code}
                  onClick={() => setLanguage(item.code)}
                  className={`px-2.5 py-1 text-xs rounded-md font-bold transition-colors ${
                    language === item.code
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 font-medium text-slate-700">
            <button
              onClick={() => {
                setIsAboutModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 py-2 text-left"
            >
              <Info className="w-5 h-5 text-emerald-700" />
              <span>{t('nav.about')}</span>
            </button>
            <button
              onClick={() => {
                setIsHelpModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 py-2 text-left"
            >
              <HelpCircle className="w-5 h-5 text-emerald-700" />
              <span>{t('nav.help')}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">{t('nav.account')}</p>
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-rose-600 font-semibold bg-rose-50 rounded-lg"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  openAuthModal('login');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl border border-slate-300 font-semibold text-sm text-slate-800 text-center"
              >
                {t('nav.login')}
              </button>
            )}

            <button
              onClick={handlePostAdClick}
              className="w-full py-3 rounded-xl bg-emerald-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20"
            >
              <PlusCircle className="w-5 h-5 text-amber-400" />
              <span>{t('nav.postAd')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
