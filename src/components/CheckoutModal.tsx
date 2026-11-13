import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ShieldCheck, ShoppingBag, AlertCircle, Phone, MapPin, User, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { safeApiFetch, extractErrorMessage, safeText } from '../utils/api.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderNumber: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess
}) => {
  const { cart, totalPrice, clearCart } = useCart();
  const { user, token } = useAuth();

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('Addis Ababa');
  const [paymentMethod, setPaymentMethod] = useState<'Telebirr' | 'CBE Birr' | 'Cash on Delivery'>('Telebirr');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (user?.fullName && !customerName) {
        setCustomerName(user.fullName);
      }
      if (user?.phone && !phone) {
        setPhone(user.phone);
      }
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError('እባክዎ ሙሉ ስምዎን ያስገቡ።');
      return;
    }

    if (!phone.trim()) {
      setError('የስልክ ቁጥር (Phone number) ለትዕዛዝ ማረጋገጫ ግዴታ ነው።');
      return;
    }

    if (!shippingAddress.trim()) {
      setError('እባክዎ የማድረሻ አድራሻ (Delivery address) ያስገቡ።');
      return;
    }

    if (cart.length === 0) {
      setError('የግዢ ጋሪዎ ባዶ ነው።');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const result = await safeApiFetch<{ order?: { order_number?: string } }>('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          shippingAddress: shippingAddress.trim(),
          shippingCity: shippingCity.trim(),
          paymentMethod,
          notes: notes.trim() || null,
          buyerId: user?.id || null,
          items: itemsPayload
        })
      });

      if (!result.ok) {
        setError(extractErrorMessage(result.error, 'ትዕዛዝ ማስገባት አልተቻለም'));
        return;
      }

      clearCart();
      onOrderSuccess(safeText(result.data?.order?.order_number, 'ORD-CONFIRMED'));
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'የትዕዛዝ ስህተት ተከስቷል'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">ትዕዛዝ ማጠቃለያ (Checkout)</h2>
              <p className="text-xs text-emerald-200">
                የማድረሻ አድራሻዎን ያስገቡ እና ክፍያ ይምረጡ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-xl hover:bg-emerald-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cart Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              የተመረጡ እቃዎች ({cart.length})
            </h4>
            <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="font-bold text-emerald-800">{item.quantity}x</span>
                    <span className="text-gray-800 truncate">{item.product.title}</span>
                  </div>
                  <span className="font-bold text-gray-900 whitespace-nowrap">
                    {(item.product.price * item.quantity).toLocaleString()} ብር
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-baseline font-black">
              <span className="text-sm text-gray-800">ጠቅላላ ክፍያ (Total ETB):</span>
              <span className="text-xl text-emerald-700">{totalPrice.toLocaleString()} ETB</span>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>የማድረሻ ዝርዝር (Delivery Info)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  የተቀባይ ሙሉ ስም (Recipient Name) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Almaz Bekele"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  የስልክ ቁጥር (Phone Number) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="+251 911 223 344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ትክክለኛ አድራሻ (Street Address / Landmark) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ምሳሌ፡ ቦሌ ሜድሃኒዓለም ህንፃ ፊትለፊት"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ከተማ (City) *
                </label>
                <input
                  type="text"
                  required
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>የክፍያ ዘዴ (Payment Method) *</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'Telebirr', name: 'ቴሌብር (Telebirr)', desc: 'በቀጥታ በቴሌብር ይክፈሉ' },
                { id: 'CBE Birr', name: 'CBE Birr / ባንክ', desc: 'የኢትዮጵያ ንግድ ባንክ' },
                { id: 'Cash on Delivery', name: 'በእጅ ክፍያ (Cash)', desc: 'እቃው ሲደርስዎት ይክፈሉ' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    paymentMethod === m.id
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs font-bold">{m.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ተጨማሪ ማስታወሻ (Optional Delivery Notes)
            </label>
            <input
              type="text"
              placeholder="ለምሳሌ፡ ከሰዓት በኋላ ይድረሰኝ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>ደህንነቱ የተጠበቀ ክፍያ</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                ይቅር
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'ትዕዛዝ በኔዮን እየተመዘገበ ነው...' : 'ትዕዛዙን አረጋግጥ (Place Order)'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
