import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Phone,
  CheckCircle2,
  MapPin,
  Clock,
  Upload,
  Camera,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { ethiopianLocations } from '../data/locations';

export const CartModal: React.FC = () => {
  const { t, localize } = useLanguage();
  const { user } = useAuth();
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartItemCount,
    placeOrder,
    uploadPaymentReceipt,
    lastCreatedOrder,
    clearLastCreatedOrder,
  } = useMarketplace();

  // Checkout form state
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [region, setRegion] = useState('addis_ababa');
  const [zone, setZone] = useState('bole');
  const [woreda, setWoreda] = useState('bole_01');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Payment Receipt Upload State (for lastCreatedOrder)
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Telebirr');
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState('');

  if (!isCartOpen) return null;

  const currentRegionObj = ethiopianLocations.find((r) => r.id === region);
  const availableZones = currentRegionObj ? currentRegionObj.zones : [];
  const currentZoneObj = availableZones.find((z) => z.id === zone);
  const availableWoredas = currentZoneObj?.woredas || [];

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    const reg = ethiopianLocations.find((r) => r.id === newRegion);
    if (reg && reg.zones.length > 0) {
      const firstZone = reg.zones[0];
      setZone(firstZone.id);
      if (firstZone.woredas && firstZone.woredas.length > 0) {
        setWoreda(firstZone.woredas[0].id);
      } else {
        setWoreda('');
      }
    } else {
      setZone('');
      setWoreda('');
    }
  };

  const handleZoneChange = (newZone: string) => {
    setZone(newZone);
    const zObj = availableZones.find((z) => z.id === newZone);
    if (zObj && zObj.woredas && zObj.woredas.length > 0) {
      setWoreda(zObj.woredas[0].id);
    } else {
      setWoreda('');
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name for order delivery.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 9) {
      setErrorMessage('Please enter a valid telephone number.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage('Please provide your street or area delivery address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await placeOrder(
        {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          region,
          zone,
          woreda: woreda || undefined,
          notes: notes.trim(),
        },
        user?.id
      );
      setIsCheckingOut(false);
    } catch (err: any) {
      setErrorMessage('Could not process order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receipt file / capture selection
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReceiptImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Receipt
  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptImage || !lastCreatedOrder) return;

    setIsUploadingReceipt(true);
    try {
      await uploadPaymentReceipt(lastCreatedOrder.id, {
        receiptUrl: receiptImage,
        transactionRef: transactionRef.trim() || undefined,
        paymentMethod,
      });
      setReceiptSuccessMsg('Receipt uploaded successfully. Pending administrator verification.');
    } catch (err) {
      console.warn('Receipt upload error:', err);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleClose = () => {
    setIsCartOpen(false);
    clearLastCreatedOrder();
    setIsCheckingOut(false);
    setReceiptImage(null);
    setTransactionRef('');
    setReceiptSuccessMsg('');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-amber-400 flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                {t('cart.title')}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {cartItemCount} {t('cart.items')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && !isCheckingOut && !lastCreatedOrder && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {t('cart.clear')}
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1">
          
          {/* 1. ORDER CONFIRMATION SCREEN */}
          {lastCreatedOrder ? (
            <div className="text-center py-4 px-2 space-y-5 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  {t('checkout.orderSuccessTitle')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('checkout.orderSuccessDesc')}: <strong className="text-emerald-800">{lastCreatedOrder.id}</strong>
                </p>
              </div>

              {/* Order summary */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-left space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('checkout.customerName')}:</span>
                  <strong className="text-slate-900">{lastCreatedOrder.customerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('checkout.phone')}:</span>
                  <strong className="text-slate-900">{lastCreatedOrder.customerPhone}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{t('filter.location')}:</span>
                  <span className="text-slate-800">{lastCreatedOrder.deliveryAddress}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-emerald-200 text-sm font-bold">
                  <span className="text-emerald-900">{t('cart.total')}:</span>
                  <span className="text-emerald-900">
                    {lastCreatedOrder.totalAmount.toLocaleString()} {t('product.currency')}
                  </span>
                </div>
              </div>

              {/* Payment Receipt Screenshot Upload Section (Requirement 6) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {t('receipt.title')}
                    </h4>
                  </div>
                  {lastCreatedOrder.paymentReceipt ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {lastCreatedOrder.paymentReceipt.verified
                        ? t('receipt.verified')
                        : t('receipt.pending')}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400">
                      {t('receipt.notVerified')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('receipt.desc')}
                </p>

                {/* If already submitted */}
                {lastCreatedOrder.paymentReceipt ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                    <img
                      src={lastCreatedOrder.paymentReceipt.receiptUrl}
                      alt="Receipt"
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-slate-800">
                        Method: {lastCreatedOrder.paymentReceipt.paymentMethod}
                      </p>
                      {lastCreatedOrder.paymentReceipt.transactionRef && (
                        <p className="text-slate-600">
                          Ref: <span className="font-mono">{lastCreatedOrder.paymentReceipt.transactionRef}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-amber-800 font-semibold mt-1">
                        Status: Pending Admin Verification
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Form to attach receipt screenshot */
                  <form onSubmit={handleUploadReceipt} className="space-y-3 pt-1">
                    {receiptSuccessMsg && (
                      <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold">
                        {receiptSuccessMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {t('receipt.method')}
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white cursor-pointer"
                        >
                          <option value="Telebirr">Telebirr (ቴሌብር)</option>
                          <option value="CBE Birr">CBE Birr (ሲቢኢ ብር)</option>
                          <option value="Commercial Bank of Ethiopia">Commercial Bank of Ethiopia (CBE)</option>
                          <option value="Awash Bank">Awash Bank (አዋሽ ባንክ)</option>
                          <option value="Cash on Delivery">Cash on Delivery (በእጅ ክፍያ)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {t('receipt.ref')}
                        </label>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="e.g. TXN-940212"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* Screenshot file upload / camera attach */}
                    <div>
                      <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-700 bg-white cursor-pointer text-xs font-bold text-slate-700 transition-colors">
                        <Upload className="w-4 h-4 text-emerald-700" />
                        <span>{receiptImage ? 'Change Receipt Screenshot' : t('receipt.attach')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {receiptImage && (
                      <div className="relative aspect-16/9 max-w-xs mx-auto rounded-xl overflow-hidden border border-slate-300">
                        <img src={receiptImage} alt="Preview" className="w-full h-full object-contain bg-slate-900" />
                        <button
                          type="button"
                          onClick={() => setReceiptImage(null)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploadingReceipt || !receiptImage}
                      className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    >
                      {isUploadingReceipt ? t('receipt.uploading') : t('receipt.uploadBtn')}
                    </button>
                  </form>
                )}
              </div>

              {/* Order Assistance Note */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Direct Communication & Order Assistance</span>
                </div>
                <p className="leading-relaxed">
                  {t('checkout.orderSuccessNote')}
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href="tel:+251904503245"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 text-white font-bold text-xs shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Call Support: +251904503245</span>
                  </a>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-all cursor-pointer"
              >
                Done / ተመለስ
              </button>
            </div>
          ) : isCheckingOut ? (
            /* 2. CHECKOUT ORDER FORM */
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">{t('checkout.title')}</h3>
                <button
                  type="button"
                  onClick={() => setIsCheckingOut(false)}
                  className="text-xs text-emerald-800 font-semibold hover:underline"
                >
                  ← Back to Cart
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('checkout.customerName')} *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Almaz Kebede"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('checkout.phone')} *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +251 91 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                />
              </div>

              {/* Complete Region - Zone - Woreda Delivery Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.region')}
                  </label>
                  <select
                    value={region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    {ethiopianLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {localize(loc.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.zone')}
                  </label>
                  <select
                    value={zone}
                    onChange={(e) => handleZoneChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    {availableZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {localize(z.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.woreda')}
                  </label>
                  <select
                    value={woreda}
                    onChange={(e) => setWoreda(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold cursor-pointer"
                  >
                    {availableWoredas.length > 0 ? (
                      availableWoredas.map((w) => (
                        <option key={w.id} value={w.id}>
                          {localize(w.name)}
                        </option>
                      ))
                    ) : (
                      <option value="">{t('postAd.woreda')}</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('checkout.deliveryAddress')} *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Bole Medhanialem, Street 24, Apt 4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('checkout.notes')}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific delivery instructions..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">{t('cart.total')}:</span>
                  <p className="text-lg font-black text-emerald-900">
                    {cartTotal.toLocaleString()} {t('product.currency')}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : t('checkout.submitOrder')}
                </button>
              </div>
            </form>
          ) : (
            /* 3. NORMAL CART ITEMS LIST */
            <>
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">{t('cart.empty')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/50"
                    >
                      <img
                        src={item.product.images[0] || ''}
                        alt={localize(item.product.title)}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-200 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {localize(item.product.title)}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">
                          {item.product.sellerName}
                        </p>
                        <p className="text-xs sm:text-sm font-extrabold text-emerald-900 mt-1">
                          {item.product.price.toLocaleString()} {t('product.currency')}
                        </p>
                      </div>

                      {/* Quantity Buttons */}
                      <div className="flex items-center gap-1 border border-slate-200 rounded-xl bg-white p-1">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= (item.product.quantity ?? 1)}
                          className="w-7 h-7 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer / Subtotal & Checkout Button */}
        {cart.length > 0 && !isCheckingOut && !lastCreatedOrder && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">{t('cart.total')}</span>
              <p className="text-xl font-black text-emerald-900">
                {cartTotal.toLocaleString()} {t('product.currency')}
              </p>
            </div>

            <button
              onClick={() => setIsCheckingOut(true)}
              className="px-6 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 shadow-md shadow-emerald-900/15 cursor-pointer active:scale-98 transition-all"
            >
              <span>{t('cart.checkout')}</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
