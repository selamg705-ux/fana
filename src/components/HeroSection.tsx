import React from 'react';
import { Phone, MessageCircle, Search, MapPin, PlusCircle, CheckCircle2, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { ethiopianLocations } from '../data/locations';

export const HeroSection: React.FC = () => {
  const { t, localize } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    selectedRegion,
    setSelectedRegion,
    selectedZone,
    setSelectedZone,
    availableZones,
    resetFilters,
    setIsSellModalOpen,
    filteredProducts,
  } = useMarketplace();

  const handlePostAd = () => {
    if (!user) {
      openAuthModal('login', 'postAd');
    } else {
      setIsSellModalOpen(true);
    }
  };

  const isFiltered = Boolean(selectedRegion || selectedZone || searchQuery);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900 text-white pt-10 pb-16 lg:pt-14 lg:pb-20 border-b border-emerald-950/40">
      {/* Background Decorative Patterns */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-700/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Contact Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <a
            href="tel:+251904503245"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-xs sm:text-sm font-semibold text-emerald-100 backdrop-blur-sm transition-all hover:scale-102"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>+251 904 503 245</span>
            <span className="text-emerald-300 text-xs hidden sm:inline font-normal">({t('hero.badge.phone')})</span>
          </a>

          <a
            href="https://wa.me/brmiki21"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-xs sm:text-sm font-semibold text-emerald-100 backdrop-blur-sm transition-all hover:scale-102"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
            <span>WhatsApp: @brmiki21</span>
            <span className="text-emerald-300 text-xs hidden sm:inline font-normal">({t('hero.badge.whatsapp')})</span>
          </a>
        </div>

        {/* Main Title & Subtitle */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight sm:leading-tight text-white mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-normal">
            {t('hero.description')}
          </p>
        </div>

        {/* Integrated Product Search & Dependent Location Filter Box */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-3 sm:p-4 border border-slate-200/50 text-slate-900">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
            
            {/* Search Input */}
            <div className="md:col-span-5 relative flex items-center">
              <Search className="absolute left-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('hero.searchPlaceholder')}
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-sm font-medium text-slate-900 placeholder-slate-400 outline-hidden transition-all"
              />
            </div>

            {/* Region Selector */}
            <div className="md:col-span-3 relative flex items-center">
              <MapPin className="absolute left-3.5 w-4 h-4 text-emerald-700 pointer-events-none" />
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full pl-9 pr-8 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-sm font-semibold text-slate-800 outline-hidden appearance-none transition-all cursor-pointer truncate"
              >
                <option value="">{t('hero.allRegions')}</option>
                {ethiopianLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {localize(loc.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Dependent Zone / Subcity Selector */}
            <div className="md:col-span-3 relative flex items-center">
              <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                disabled={!selectedRegion || availableZones.length === 0}
                className="w-full pl-9 pr-8 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 text-sm font-semibold text-slate-800 outline-hidden appearance-none transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer truncate"
              >
                <option value="">
                  {selectedRegion ? t('hero.allZones') : t('hero.allZones')}
                </option>
                {availableZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {localize(z.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset / Search Actions */}
            <div className="md:col-span-1 flex items-center gap-1.5">
              {isFiltered ? (
                <button
                  onClick={resetFilters}
                  title={t('filter.reset')}
                  className="w-full h-full min-h-[46px] rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full h-full min-h-[46px] rounded-xl bg-emerald-800 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filter count indicator */}
          <div className="mt-2.5 px-1 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span>
              {t('filter.showing')}: <strong className="text-emerald-800">{filteredProducts.length}</strong> {t('filter.results')}
            </span>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="text-emerald-700 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {t('filter.reset')}
              </button>
            )}
          </div>
        </div>

        {/* CTA Button Row */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handlePostAd}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-sm sm:text-base shadow-lg shadow-amber-400/25 active:scale-98 transition-all cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-emerald-900" />
            <span>{t('nav.postAd')}</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-emerald-700/50 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          
          <div className="flex items-center sm:items-start gap-3.5 bg-emerald-950/25 p-3.5 rounded-xl border border-emerald-700/40">
            <div className="w-10 h-10 rounded-lg bg-emerald-700/60 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{t('hero.trust.verified')}</h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">{t('hero.trust.verifiedDesc')}</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 bg-emerald-950/25 p-3.5 rounded-xl border border-emerald-700/40">
            <div className="w-10 h-10 rounded-lg bg-emerald-700/60 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{t('hero.trust.secure')}</h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">{t('hero.trust.secureDesc')}</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3.5 bg-emerald-950/25 p-3.5 rounded-xl border border-emerald-700/40">
            <div className="w-10 h-10 rounded-lg bg-emerald-700/60 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{t('hero.trust.delivery')}</h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">{t('hero.trust.deliveryDesc')}</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
