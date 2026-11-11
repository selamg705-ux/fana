import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Package,
  ShoppingBag,
  Users,
  DollarSign,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Eye,
  Plus,
  Minus,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { OrderStatus } from '../types';
import { ethiopianLocations } from '../data/locations';

export const AdminModal: React.FC = () => {
  const { t, localize } = useLanguage();
  const { user, isAdmin, openAuthModal } = useAuth();
  const {
    isAdminModalOpen,
    setIsAdminModalOpen,
    products,
    deleteProduct,
    updateProductQuantity,
    orders,
    updateOrderStatus,
    verifyPaymentReceipt,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  if (!isAdminModalOpen) return null;

  const handleClose = () => {
    setIsAdminModalOpen(false);
    setPreviewReceiptUrl(null);
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // If not logged in, ask to login
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Administrator Sign In</h3>
          <p className="text-xs text-slate-500">
            Please sign in with administrator credentials to access the management portal.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                handleClose();
                openAuthModal('login', 'admin');
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs cursor-pointer"
            >
              Sign In Now
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If logged in but not admin
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Access Denied</h3>
          <p className="text-xs text-slate-500">
            {t('admin.accessDenied')} (Current user: {user.email})
          </p>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalListings = products.length;
  const activeOrders = orders.filter((o) => o.status === 'Pending').length;
  const verifiedSellersCount = new Set(
    products.filter((p) => p.sellerIsVerified).map((p) => p.sellerId)
  ).size;
  const totalVolume = orders.reduce((sum, ord) => sum + ord.totalAmount, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">
                {t('admin.title')}
              </h2>
              <span className="text-xs text-amber-400/90 font-medium">
                Admin: {user.name} ({user.email})
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('admin.tab.overview')}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('admin.tab.products')} ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-emerald-800 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t('admin.tab.orders')} ({orders.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {/* TAB 1: OVERVIEW & STATS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-emerald-800 font-bold">{t('admin.stats.listings')}</span>
                    <Package className="w-4 h-4 text-emerald-700" />
                  </div>
                  <p className="text-2xl font-black text-emerald-950">{totalListings}</p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-amber-800 font-bold">{t('admin.stats.orders')}</span>
                    <ShoppingBag className="w-4 h-4 text-amber-700" />
                  </div>
                  <p className="text-2xl font-black text-amber-950">{activeOrders}</p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-800 font-bold">{t('admin.stats.sellers')}</span>
                    <Users className="w-4 h-4 text-blue-700" />
                  </div>
                  <p className="text-2xl font-black text-blue-950">{verifiedSellersCount}</p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-purple-800 font-bold">{t('admin.stats.revenue')}</span>
                    <DollarSign className="w-4 h-4 text-purple-700" />
                  </div>
                  <p className="text-2xl font-black text-purple-950">
                    {totalVolume.toLocaleString()}
                  </p>
                </div>

              </div>

              {/* Recent Orders Overview */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                <h3 className="font-black text-sm text-slate-900 mb-3">Quick Orders Feed</h3>
                <div className="space-y-2">
                  {orders.slice(0, 4).map((ord) => (
                    <div key={ord.id} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900">{ord.id}</span>
                        <span className="text-slate-500 ml-2">by {ord.customerName} ({ord.customerPhone})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-emerald-900">{ord.totalAmount.toLocaleString()} ETB</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {ord.status}
                        </span>
                        {ord.paymentReceipt && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.paymentReceipt.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.paymentReceipt.verified ? 'Verified Payment' : 'Receipt Pending'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-sm text-slate-900">Marketplace Listings ({products.length})</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3">Seller</th>
                      <th className="py-2.5 px-3">Price (ETB)</th>
                      <th className="py-2.5 px-3">Stock Qty</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((prod) => {
                      const regionObj = ethiopianLocations.find((r) => r.id === prod.region);
                      const regName = regionObj ? localize(regionObj.name) : prod.region;
                      const znObj = regionObj?.zones.find((z) => z.id === prod.zone);
                      const znName = znObj ? localize(znObj.name) : prod.zone;
                      const wrObj = znObj?.woredas?.find((w) => w.id === prod.woreda);
                      const wrName = wrObj ? localize(wrObj.name) : prod.woreda;
                      const locStr = wrName ? `${wrName}, ${znName || regName}` : znName ? `${znName}, ${regName}` : regName;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-2.5">
                            <img
                              src={prod.images[0] || ''}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                            <span className="font-bold text-slate-900 max-w-[180px] truncate">
                              {localize(prod.title)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{prod.categoryId}</td>
                          <td className="py-3 px-3 text-slate-600 max-w-[130px] truncate" title={locStr}>
                            {locStr}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-800">{prod.sellerName}</p>
                            <p className="text-[10px] text-slate-400">{prod.sellerPhone}</p>
                          </td>
                          <td className="py-3 px-3 font-black text-emerald-900">
                            {prod.price.toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            {/* Stock Quantity Controls */}
                            <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 w-fit bg-white">
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(prod.id, (prod.quantity ?? 1) - 1)}
                                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-600"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center font-black text-emerald-950">
                                {prod.quantity ?? 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(prod.id, (prod.quantity ?? 1) + 1)}
                                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-600"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {prod.condition === 'Brand New' ? 'አዲስ (Brand New)' : 'ያገለገለ (Used)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this listing?')) {
                                  deleteProduct(prod.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={t('admin.deleteProduct')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS MANAGEMENT & PAYMENT RECEIPTS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h3 className="font-black text-sm text-slate-900">Customer Orders & Payment Verification ({orders.length})</h3>

              <div className="space-y-3">
                {orders.map((ord) => (
                  <div key={ord.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <span className="font-black text-sm text-slate-900">{ord.id}</span>
                        <span className="text-xs text-slate-400 ml-2">{ord.orderDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Order Status:</span>
                        <select
                          value={ord.status}
                          onChange={(e) => updateOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-xs bg-slate-50 cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Customer: {ord.customerName}</p>
                        <p className="text-slate-500">Phone: <a href={`tel:${ord.customerPhone}`} className="text-emerald-700 underline">{ord.customerPhone}</a></p>
                        <p className="text-slate-500">Address: {ord.deliveryAddress}</p>
                        {ord.woreda && <p className="text-slate-500">Woreda: {ord.woreda}</p>}
                      </div>
                      <div className="sm:text-right">
                        <p className="text-slate-500">Total Amount:</p>
                        <p className="text-base font-black text-emerald-900">
                          {ord.totalAmount.toLocaleString()} ETB
                        </p>
                        {ord.notes && (
                          <p className="text-[11px] text-amber-800 italic mt-1">Note: "{ord.notes}"</p>
                        )}
                      </div>
                    </div>

                    {/* Payment Receipt Verification Box (Requirement 6) */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-700" />
                          <span className="font-bold text-xs text-slate-900">Payment Receipt Screenshot:</span>
                          {ord.paymentReceipt ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ord.paymentReceipt.verified
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              {ord.paymentReceipt.verified ? 'Verified by Admin ✓' : 'Pending Verification (Not Verified)'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No receipt screenshot uploaded yet</span>
                          )}
                        </div>

                        {/* Admin verification action buttons */}
                        {ord.paymentReceipt && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewReceiptUrl(ord.paymentReceipt!.receiptUrl)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-700 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Full Image</span>
                            </button>

                            {ord.paymentReceipt.verified ? (
                              <button
                                type="button"
                                onClick={() => verifyPaymentReceipt(ord.id, false)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                              >
                                Revoke Verification
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => verifyPaymentReceipt(ord.id, true)}
                                className="px-3 py-1 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-2xs"
                              >
                                Verify Payment (ክፍያ አረጋግጥ)
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Receipt detail info if uploaded */}
                      {ord.paymentReceipt && (
                        <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center gap-3 text-xs">
                          <img
                            src={ord.paymentReceipt.receiptUrl}
                            alt="Receipt"
                            onClick={() => setPreviewReceiptUrl(ord.paymentReceipt!.receiptUrl)}
                            className="w-14 h-14 rounded-lg object-cover border border-slate-300 cursor-pointer hover:opacity-85"
                          />
                          <div className="text-[11px] text-slate-600">
                            <p><strong>Payment Method:</strong> {ord.paymentReceipt.paymentMethod || 'Telebirr'}</p>
                            {ord.paymentReceipt.transactionRef && (
                              <p><strong>Transaction Ref:</strong> <span className="font-mono text-slate-800">{ord.paymentReceipt.transactionRef}</span></p>
                            )}
                            <p className="text-slate-400">Uploaded on {ord.paymentReceipt.uploadedAt?.split('T')[0]}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="pt-1 flex flex-wrap gap-2">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          {it.imageUrl && <img src={it.imageUrl} alt="" className="w-6 h-6 rounded object-cover" />}
                          <span className="font-semibold text-slate-800">{it.productTitle}</span>
                          <span className="text-slate-500 font-bold">x{it.quantity}</span>
                          <span className="text-emerald-800 font-bold">({(it.price * it.quantity).toLocaleString()} ETB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Full-Screen Receipt Preview Modal */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 flex flex-col">
            <div className="flex justify-between items-center px-3 py-2 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">Payment Receipt Screenshot</span>
              <button
                onClick={() => setPreviewReceiptUrl(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] flex items-center justify-center p-2 bg-slate-900">
              <img src={previewReceiptUrl} alt="Receipt Full" className="max-w-full max-h-[75vh] object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
