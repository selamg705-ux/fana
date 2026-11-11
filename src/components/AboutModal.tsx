import React from 'react';
import { X, Info, Heart, ShieldCheck, Phone, MessageCircle, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';

export const AboutModal: React.FC = () => {
  const { t } = useLanguage();
  const { isAboutModalOpen, setIsAboutModalOpen } = useMarketplace();

  if (!isAboutModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">
                {t('about.title')}
              </h2>
              <p className="text-xs text-emerald-200 font-medium">MELA MARKET | መላ ገበያ | መላ ዕዳጋ</p>
            </div>
          </div>
          <button
            onClick={() => setIsAboutModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-950">
            <p className="font-medium">
              {t('about.story')}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-900 font-black text-base mb-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <h3>{t('about.missionTitle')}</h3>
            </div>
            <p className="text-slate-600">
              {t('about.mission')}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 text-slate-900 font-black text-base mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h3>{t('about.safetyTitle')}</h3>
            </div>
            <p className="text-slate-600">
              {t('about.safety')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Direct Contact & Support
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="tel:+251904503245"
                className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-700 text-xs font-bold text-slate-800 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-700" />
                <span>+251 904 503 245</span>
              </a>

              <a
                href="https://wa.me/brmiki21"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-700 text-xs font-bold text-slate-800 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp: @brmiki21</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
