import React from 'react';
import { Sparkles, RefreshCw, ShieldCheck, MapPin, PlusCircle, Phone, MessageCircle, ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  onOpenSellModal: () => void;
  onScrollToNew: () => void;
  onScrollToUsed: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onOpenSellModal,
  onScrollToNew,
  onScrollToUsed
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white">
      {/* Subtle Ethiopian pattern backdrop */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          {/* Top Pill / Badge */}
          <div className="inline-flex items-center justify-center gap-2 bg-emerald-800/80 border border-emerald-600/50 rounded-full px-4 py-1.5 text-xs text-amber-300 font-bold backdrop-blur-sm shadow-sm mx-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>የኢትዮጵያ አስተማማኝ እና ፈጣን የገበያ ቦታ</span>
          </div>

          {/* Center-Aligned Main Heading */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tight text-white leading-tight text-center break-words px-1">
            ይግዙ፣ ይሽጡ፣ <br className="hidden sm:inline" />
            <span className="text-amber-400">በቀላሉ ይገበያዩ!</span>
          </h1>

          {/* Center-Aligned Description */}
          <p className="text-xs sm:text-sm md:text-base text-emerald-100/90 max-w-2xl mx-auto leading-relaxed text-center px-2">
            በመላው ኢትዮጵያ 14 ክልሎች እና የከተማ አስተዳደሮች በቴሌብር እና በኢትዮጵያ ንግድ ባንክ በአስተማማኝ ሁኔታ ይሸምቱ።
          </p>

          {/* Center-Aligned Feature Badges */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 pt-1 text-xs">
            <span className="bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>በ14ቱም የኢትዮጵያ ክልሎች የሚገኝ</span>
            </span>
            <span className="bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>የተረጋገጡ ሻጮች እና የጥራት ቁጥጥር</span>
            </span>
            <span className="bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="text-amber-400 font-bold">ብር</span>
              <span>ቴሌብር (Telebirr) እና CBE Birr ክፍያ</span>
            </span>
          </div>

          {/* Center-Aligned Functional Contact Strip */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
            <a
              href="tel:0904503245"
              className="inline-flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-amber-400/40 text-emerald-100 hover:text-white px-3.5 py-2 rounded-xl transition-all"
              title="ደውለው ያግኙን: 0904503245"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>ስልክ: <strong className="text-white font-mono">0904503245</strong></span>
            </a>
            <a
              href="https://wa.me/251904503245"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500/50 text-white px-3.5 py-2 rounded-xl transition-all shadow-xs"
              title="በዋትስአፕ ያግኙን: @brmiki21"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
              <span>WhatsApp: <strong className="text-amber-300 font-semibold">@brmiki21</strong></span>
            </a>
          </div>

          {/* Center-Aligned Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={onOpenSellModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-sm px-6 py-3.5 rounded-2xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>እቃ ይሽጡ (Start Selling)</span>
            </button>

            <button
              onClick={onScrollToNew}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-700/90 hover:bg-emerald-600 text-white font-bold text-sm px-5 py-3.5 rounded-2xl border border-emerald-500/50 shadow transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>አዳዲስ ምርቶች (Brand New)</span>
            </button>

            <button
              onClick={onScrollToUsed}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-emerald-900/90 hover:bg-emerald-800 text-amber-300 font-bold text-sm px-5 py-3.5 rounded-2xl border border-amber-400/40 shadow transition-all"
            >
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>ያገለገሉ ምርቶች (Pre-Owned)</span>
            </button>
          </div>

          {/* Center-Aligned Quick Dual Highlights (Without duplicate repetitive tags) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 max-w-2xl mx-auto">
            <div
              onClick={onScrollToNew}
              className="group cursor-pointer bg-emerald-800/60 hover:bg-emerald-800/90 p-4 rounded-2xl border border-emerald-600/40 hover:border-amber-400 transition-all text-center flex flex-col items-center"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-amber-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                የፋብሪካ እና የሱቅ ምርቶች
              </h3>
              <p className="text-[11px] text-emerald-200 mt-1">
                ያልተከፈቱ ኤሌክትሮኒክስ፣ ባህል ልብሶች እና የቤት እቃዎች
              </p>
            </div>

            <div
              onClick={onScrollToUsed}
              className="group cursor-pointer bg-emerald-950/60 hover:bg-emerald-950/90 p-4 rounded-2xl border border-amber-500/30 hover:border-amber-400 transition-all text-center flex flex-col items-center"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                ጥራት ያላቸው የተመረጡ ቅናሾች
              </h3>
              <p className="text-[11px] text-amber-200/90 mt-1">
                የተፈተሹ ስልኮች፣ ላፕቶፖች እና ተሽከርካሪዎች
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
