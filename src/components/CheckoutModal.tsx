import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, ShoppingBag, AlertCircle, Phone, MapPin, User, CreditCard, Upload, RefreshCw, Trash2, Image as ImageIcon } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { PaymentReceipt } from '../types/index.ts';
import {
  validateReceiptFileClient,
  readReceiptFileAsDataUrl,
  formatFileSize,
  SelectedReceiptFile,
} from '../utils/receiptFile.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderNumber: string, receipt?: PaymentReceipt | null) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess
}) => {
  const { cart, totalPrice, clearCart } = useCart();
  const { user, token } = useAuth();
  const { t } = useLanguage();

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('Addis Ababa');
  const [paymentMethod, setPaymentMethod] = useState<'Telebirr' | 'Bank Transfer' | 'Cash on Delivery'>('Telebirr');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<SelectedReceiptFile | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      if (!customerName && user.fullName) setCustomerName(user.fullName);
      if (!phone && user.phone) setPhone(user.phone);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptError('');
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validation = validateReceiptFileClient(file);
    if (!validation.valid) {
      setReceiptError(
        validation.reason === 'type'
          ? t('receipt.invalidType', 'እባክዎ ትክክለኛ የምስል ፋይል (JPEG, PNG ወይም WebP) ብቻ ይምረጡ።')
          : t('receipt.invalidSize', 'የፋይሉ መጠን ከ5MB መብለጥ የለበትም።')
      );
      return;
    }

    try {
      const selected = await readReceiptFileAsDataUrl(file);
      setReceiptFile(selected);
    } catch (err: any) {
      setReceiptError(err?.message || 'Failed to load image preview.');
    }
  };

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

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          shippingAddress: shippingAddress.trim(),
          shippingCity: shippingCity.trim(),
          paymentMethod,
          notes: notes.trim() || null,
          items: itemsPayload,
          paymentReceipt: receiptFile
            ? {
                fileName: receiptFile.fileName,
                mimeType: receiptFile.mimeType,
                dataBase64: receiptFile.dataBase64,
              }
            : undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ትዕዛዝ ማስገባት አልተቻለም');
      }

      clearCart();
      setReceiptFile(null);
      setReceiptError('');
      onOrderSuccess(data.order.order_number, data.receipt || null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'የትዕዛዝ ስህተት ተከስቷል');
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
                { id: 'Bank Transfer', name: 'የባንክ ዝውውር (Any Bank)', desc: 'በማንኛውም የሚመርጡት ባንክ ይክፈሉ' },
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

          {/* Payment Receipt Upload Section */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{t('receipt.sectionTitle', 'የክፍያ ማረጋገጫ ደረሰኝ (Payment Receipt)')}</span>
                </h4>
                <p className="text-[11px] text-gray-600 mt-1">
                  {t('receipt.sectionDesc', 'ክፍያ ከፈጸሙ በኋላ የደረሰኙን ፎቶ ወይም ስክሪንሾት ከስልክዎ ወይም ከኮምፒውተርዎ ያስገቡ (JPEG, PNG, WebP እስከ 5MB)።')}
                </p>
              </div>
            </div>

            <input
              ref={receiptInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReceiptSelect}
              className="hidden"
              data-testid="checkout-receipt-input"
            />

            {receiptError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{receiptError}</span>
              </div>
            )}

            {!receiptFile ? (
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{t('receipt.uploadButton', 'የክፍያ ደረሰኝ ፎቶ ያስገቡ')}</span>
              </button>
            ) : (
              <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-emerald-900 truncate">
                    {t('receipt.previewTitle', 'የደረሰኝ ቅድመ-እይታ (Preview)')}: {receiptFile.fileName}
                  </span>
                  <span className="text-gray-500 shrink-0">{formatFileSize(receiptFile.fileSize)}</span>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center max-h-56">
                  <img
                    src={receiptFile.previewUrl}
                    alt="Payment receipt preview"
                    className="max-h-56 w-auto object-contain"
                    data-testid="checkout-receipt-preview"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => receiptInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('receipt.replaceButton', 'ፎቶ ቀይር (Replace)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptFile(null);
                      setReceiptError('');
                    }}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('receipt.removeButton', 'አጥፋ')}</span>
                  </button>
                </div>
              </div>
            )}
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
