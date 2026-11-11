import React from 'react';
import { Phone, MessageCircle, ShieldCheck, Heart, Sparkles, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const { setIsAboutModalOpen, setIsHelpModalOpen } = useMarketplace();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-14 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-amber-400 flex items-center justify-center font-black text-xl shadow-md">
                መ
              </div>
              <div>
                <span className="font-black text-lg text-white tracking-tight">
                  {t('brand.name')}
                </span>
                <p className="text-[11px] text-emerald-400 uppercase font-semibold">
                  MELA MARKET ETHIOPIA
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t('hero.trust.verified')}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => setIsAboutModalOpen(true)}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  {t('nav.about')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsHelpModalOpen(true)}
                  className="hover:text-amber-400 transition-colors cursor-pointer text-left"
                >
                  {t('nav.help')}
                </button>
              </li>
              <li>
                <span className="text-slate-400">
                  {t('categories.coffee')}
                </span>
              </li>
              <li>
                <span className="text-slate-400">
                  {t('categories.fashion')}
                </span>
              </li>
              <li>
                <span className="text-slate-400">
                  {t('categories.smartphones')}
                </span>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
              {t('footer.contact')}
            </h3>
            <div className="space-y-3 text-xs">
              <a
                href="tel:+251904503245"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>+251 904 503 245</span>
              </a>

              <a
                href="https://wa.me/brmiki21"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>WhatsApp: @brmiki21</span>
              </a>

              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Addis Ababa, Mekelle & Regional Hubs</span>
              </div>
            </div>
          </div>

          {/* Payment & Security Info */}
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4">
              Payment & Delivery
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Direct and trusted peer-to-peer commerce. Coordinate delivery with verified sellers and pay securely via Cash on Delivery, Telebirr, or CBE Birr.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-300">
              <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">Telebirr</span>
              <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">CBE Birr</span>
              <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700">Cash on Delivery</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} {t('footer.rights')}</p>
          <div className="flex items-center gap-1">
            <span>Built with care for Ethiopia</span>
            <span className="text-amber-400">🇪🇹</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
