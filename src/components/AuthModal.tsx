import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';

export const AuthModal: React.FC = () => {
  const { t } = useLanguage();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    openAuthModal,
    signIn,
    signUp,
    isLoading,
    error,
    clearError,
    authRedirectAction,
  } = useAuth();

  const { setIsSellModalOpen, setIsAdminModalOpen } = useMarketplace();

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isAuthModalOpen) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (isLogin) {
      const res = await signIn(email, password);
      if (res.success) {
        if (authRedirectAction === 'postAd') {
          setIsSellModalOpen(true);
        } else if (authRedirectAction === 'admin') {
          setIsAdminModalOpen(true);
        }
      }
    } else {
      const res = await signUp({
        name: fullName,
        email,
        phone,
        password,
      });
      if (res.success) {
        if (authRedirectAction === 'postAd') {
          setIsSellModalOpen(true);
        } else if (authRedirectAction === 'admin') {
          setIsAdminModalOpen(true);
        }
      }
    }
  };

  const handleFillDemoSeller = () => {
    setEmail('almaz@melamarket.et');
    setPassword('seller123');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      
      <div 
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-400 flex items-center justify-center font-extrabold shadow-xs">
              መ
            </div>
            <div>
              <h2 className="font-black text-lg text-slate-900">
                {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Mela Market Ethiopia</p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Full Name (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.fullName')} *
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dawit Haile"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.email')} *
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-700 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Phone (Register only) */}
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('auth.phone')} *
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0911223344"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-700 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('auth.password')} *
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-700 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Processing...' : isLogin ? t('auth.signIn') : t('auth.signUp')}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>

          </form>

          {/* Switch Mode */}
          <div className="mt-4 text-center">
            <button
              onClick={() => openAuthModal(isLogin ? 'register' : 'login', authRedirectAction)}
              className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
            >
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
          </div>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Demo / Test Accounts:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleFillDemoSeller}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-700 text-[11px] font-semibold text-slate-700 hover:text-emerald-900 transition-colors cursor-pointer"
              >
                Use Verified Merchant (Almaz)
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
