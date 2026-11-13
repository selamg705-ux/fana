import React from 'react';
import { ShoppingBag, ShieldCheck, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface FooterProps {
  onOpenAdminPortal: () => void;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAdminPortal,
  contactPhone = '0904503245',
  contactWhatsapp = '@brmiki21',
  contactEmail = 'support@melamarket.et'
}) => {
  const { isSuperAdmin } = useAuth();

  return (
    <footer className="bg-emerald-950 text-white border-t-4 border-emerald-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8 text-center sm:text-left">
          {/* Brand Info */}
          <div className="space-y-3 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tight text-white">MELA MARKET</span>
            </div>
            <p className="text-xs text-emerald-200 leading-relaxed max-w-sm">
              መላ ማርኬት በመላው ኢትዮጵያ ላሉ ገዢዎችና ሻጮች የተዘጋጀ ዘመናዊ፣ አስተማማኝ እና ፈጣን የግብይት መድረክ ነው።
            </p>
            <div className="text-xs text-emerald-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>አዲስ አበባ፣ ኢትዮጵያ (Addis Ababa, Ethiopia)</span>
            </div>
          </div>

          {/* Customer Support & Functional Contacts */}
          <div className="text-center sm:text-left">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">
              የደንበኞች አገልግሎት (Contact Us)
            </h4>
            <div className="text-xs text-emerald-200 space-y-2.5">
              {/* Functional Phone */}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Phone className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                  className="hover:text-amber-300 underline font-mono text-sm tracking-wide text-white transition-colors"
                  title="ደውለው ይዘዙ: 0904503245"
                >
                  {contactPhone}
                </a>
              </div>

              {/* Functional WhatsApp */}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <a
                  href="https://wa.me/251904503245"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-300 underline text-sm text-emerald-200 transition-colors font-medium"
                  title="በዋትስአፕ መልዕክት ይላኩ: @brmiki21"
                >
                  WhatsApp: <strong className="text-amber-300">{contactWhatsapp}</strong>
                </a>
              </div>

              {/* Email */}
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <a href={`mailto:${contactEmail}`} className="hover:text-amber-300 transition-colors">
                  {contactEmail}
                </a>
              </div>

            </div>
          </div>

          {/* Super Admin & Security */}
          <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">
              ደህንነት እና አስተዳደር
            </h4>
            <div className="text-xs text-emerald-200 space-y-2.5">
              <p className="text-[11px] text-emerald-200 leading-relaxed">
                የተጠቃሚዎች እና የክፍያ መረጃዎች በጠንካራ የይለፍ ቃል ምስጠራ የተጠበቁ ናቸው።
              </p>

              {isSuperAdmin && (
                <button
                  onClick={onOpenAdminPortal}
                  className="mt-2 flex items-center justify-center gap-1.5 bg-purple-900 hover:bg-purple-800 text-amber-300 text-xs font-bold px-3 py-2 rounded-xl border border-purple-700 shadow transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Super Admin Dashboard &rarr;</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-900 pt-6 flex flex-col sm:flex-row items-center justify-center text-xs text-emerald-300 gap-3 text-center">
          <div>
            &copy; {new Date().getFullYear()} Mela Market (መላ ማርኬት)። መብቱ በህግ የተጠበቀ ነው።
          </div>
        </div>
      </div>
    </footer>
  );
};
