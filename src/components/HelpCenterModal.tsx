import React, { useState } from 'react';
import { X, HelpCircle, ChevronDown, Phone, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';

export const HelpCenterModal: React.FC = () => {
  const { t } = useLanguage();
  const { isHelpModalOpen, setIsHelpModalOpen } = useMarketplace();

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!isHelpModalOpen) return null;

  const faqs = [
    { q: t('help.q1'), a: t('help.a1') },
    { q: t('help.q2'), a: t('help.a2') },
    { q: t('help.q3'), a: t('help.a3') },
    { q: t('help.q4'), a: t('help.a4') },
    {
      q: 'How does local delivery and payment work?',
      a: 'After you place an order or call the seller, you agree on a meetup or courier delivery in your sub-city/zone. You inspect your goods upon arrival before paying via cash, Telebirr, CBE Birr, or direct bank transfer.',
    },
    {
      q: 'How do product reviews work?',
      a: 'Verified reviews are submitted by customers who have purchased the item. Star ratings dynamically calculate the average product rating displayed across the marketplace.',
    },
  ];

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
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">
                {t('help.title')}
              </h2>
              <p className="text-xs text-emerald-200 font-medium">Frequently Asked Questions & Support</p>
            </div>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-4">
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50 transition-colors"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 font-bold text-sm text-slate-900 hover:bg-slate-100/70 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-emerald-800' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/50 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Help Contacts */}
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
            <p className="font-bold text-xs text-emerald-950">
              Need immediate help from our support agent?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href="tel:+251904503245"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-800 text-white font-bold text-xs shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Call: +251 904 503 245</span>
              </a>
              <a
                href="https://wa.me/brmiki21"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>WhatsApp: @brmiki21</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
