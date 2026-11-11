import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

export const FloatingContact: React.FC = () => {
  return (
    <aside aria-label="Support contacts" className="fixed bottom-5 right-4 z-40 flex flex-col gap-2.5 sm:bottom-6 sm:right-6">
      {/* WhatsApp Quick Floating Button */}
      <a
        href="https://wa.me/brmiki21"
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
        title="Chat on WhatsApp: @brmiki21"
        aria-label="WhatsApp Support"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </a>

      {/* Telephone Direct Call Floating Button */}
      <a
        href="tel:+251904503245"
        className="w-12 h-12 rounded-full bg-emerald-800 hover:bg-emerald-700 text-amber-400 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer border border-emerald-700"
        title="Direct Support Phone: +251 904 503 245"
        aria-label="Direct Support Call"
      >
        <Phone className="w-5 h-5" />
      </a>
    </aside>
  );
};
