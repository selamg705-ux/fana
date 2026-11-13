import React from 'react';
import { PlusCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

interface HeroBannerProps {
  onOpenSellModal: () => void;
  onScrollToNew: () => void;
  onScrollToUsed: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onOpenSellModal,
}) => {
  const { t } = useLanguage();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white">
      {/* Subtle Ethiopian pattern backdrop */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Center-Aligned Action Button */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenSellModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>{t('hero.startSelling')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

