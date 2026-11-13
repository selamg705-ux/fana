import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, Phone, User, Store, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { safeApiFetch } from '../utils/api.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login'
}) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state (STRICTLY NO REGION, WOREDA OR CITY!)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSeller, setIsSeller] = useState(false);
  const [storeName, setStoreName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccess('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginIdentifier.trim() || !loginPassword) {
      setError('እባክዎ ኢሜይል ወይም ስልክ ቁጥር እና የይለፍ ቃል ያስገቡ።');
      return;
    }

    setIsLoading(true);
    try {
      const result = await safeApiFetch<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword
        })
      });

      if (!result.ok || !result.data?.token) {
        setError(result.error || 'መግባት አልተቻለም፤ እባክዎ መረጃዎን በትክክል ያስገቡ።');
        return;
      }

      const safeUser = result.data.user ? {
        ...result.data.user,
        fullName: result.data.user.fullName || result.data.user.full_name || loginIdentifier.trim() || 'User',
        role: result.data.user.role || 'customer'
      } : {
        id: 0,
        fullName: loginIdentifier.trim() || 'User',
        role: 'customer',
        isActive: true
      };

      login(result.data.token, safeUser);
      setSuccess('በተሳካ ሁኔታ ገብተዋል!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'የመግቢያ ስህተት ተከስቷል');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim()) {
      setError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setError('ኢሜይል ወይም ስልክ ቁጥር ማስገባት ግዴታ ነው።');
      return;
    }

    if (registerPassword.length < 6) {
      setError('የይለፍ ቃል ቢያንስ 6 ፊደላት ወይም ቁጥሮች መሆን አለበት።');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError('ያስገቧቸው የይለፍ ቃሎች አይመሳሰሉም።');
      return;
    }

    setIsLoading(true);
    try {
      const result = await safeApiFetch<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          password: registerPassword,
          confirmPassword,
          isSeller,
          storeName: isSeller ? storeName.trim() || `${fullName.trim()}'s Shop` : null
        })
      });

      if (!result.ok || !result.data?.token) {
        setError(result.error || 'ምዝገባው አልተሳካም፤ እባክዎ እንደገና ይሞክሩ።');
        return;
      }

      const safeUser = result.data.user ? {
        ...result.data.user,
        fullName: result.data.user.fullName || result.data.user.full_name || fullName.trim() || 'User',
        role: result.data.user.role || (isSeller ? 'seller' : 'customer')
      } : {
        id: 0,
        fullName: fullName.trim() || 'User',
        role: isSeller ? 'seller' : 'customer',
        isActive: true
      };

      login(result.data.token, safeUser);
      setSuccess('መለያዎ በተሳካ ሁኔታ ተፈጥሯል!');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'የምዝገባ ስህተት ተከስቷል');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700/50 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-black text-amber-300">MELA MARKET</span>
            <span className="text-xs text-emerald-200 font-semibold">• መላ ማርኬት</span>
          </div>
          <h2 className="text-xl font-bold">
            {mode === 'login' ? 'ወደ መለያዎ ይግቡ (Sign In)' : 'አዲስ መለያ ይክፈቱ (Create Account)'}
          </h2>
          <p className="text-xs text-emerald-200 mt-0.5">
            {mode === 'login'
              ? 'የኢትዮጵያ አስተማማኝ የገበያ ቦታ'
              : 'በቀላሉ ይመዝገቡና እቃ ይግዙ ወይም ይሽጡ'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              mode === 'login'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            መግቢያ (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              mode === 'register'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            አዲስ ምዝገባ (Register)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ኢሜይል ወይም ስልክ ቁጥር (Email or Phone) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="email@example.com ወይም +251 9..."
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  የይለፍ ቃል (Password) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? 'እየገባ ነው (Signing in)...' : 'ግባ (Sign In)'}
              </button>

              <div className="pt-2 text-center text-xs text-gray-500">
                አካውንት የለዎትም?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  ይመዝገቡ (Register here)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* IMPORTANT: Region, Woreda and City MUST NOT appear in registration! */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ሙሉ ስም (Full Name) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="ሙሉ ስም ያስገቡ (e.g. Almaz Bekele)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ኢሜይል (Email)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      placeholder="almaz@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ስልክ ቁጥር (Phone)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="+251 911 223 344"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የይለፍ ቃል (Password) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="ቢያንስ 6 ፊደላት"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የይለፍ ቃል ማረጋገጫ *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="የይለፍ ቃል ድገሙ"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Seller Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isSeller}
                    onChange={(e) => setIsSeller(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-950">እቃዎችን መሸጥ እፈልጋለሁ (Register as Seller)</span>
                    <span className="block text-[10px] text-emerald-700">መደብር ከፍተው የራስዎን እቃዎች በቀላሉ ይሽጡ</span>
                  </div>
                </label>
              </div>

              {isSeller && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የመደብሩ ስም (Store / Shop Name)
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="ምሳሌ፡ አቢሲኒያ የንግድ ቤት"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-emerald-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? 'እየተመዘገበ ነው (Creating account)...' : 'መለያ ፍጠር (Create Account)'}
              </button>

              <div className="pt-2 text-center text-xs text-gray-500">
                አካውንት አለዎት?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  ይግቡ (Sign In here)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
