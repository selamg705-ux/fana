import React, { useState, useEffect } from 'react';
import { X, Store, Package, ShoppingBag, PlusCircle, Trash2, Edit, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Product, Order } from '../types/index.ts';

interface SellerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSellModal: () => void;
  onRefreshMarketplace: () => void;
}

export const SellerDashboardModal: React.FC<SellerDashboardModalProps> = ({
  isOpen,
  onClose,
  onOpenSellModal,
  onRefreshMarketplace
}) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      loadSellerData();
    }
  }, [isOpen, token, activeTab]);

  const loadSellerData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, prodsRes, ordersRes] = await Promise.all([
        fetch('/api/seller/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/seller/products', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/seller/orders', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (dashRes.ok) setStats(await dashRes.json());
      if (prodsRes.ok) setProducts(await prodsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (e) {
      console.warn('Error loading seller dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadSellerData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        loadSellerData();
        onRefreshMarketplace();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden my-6 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center shadow">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {user?.storeName || 'የሻጭ ዳሽቦርድ (Seller Dashboard)'}
                </h2>
                {user?.sellerVerified && (
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Seller</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200">
                የምርቶችዎን ሁኔታ እና የደንበኞች ትዕዛዞችን በቀላሉ ያስተዳድሩ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenSellModal();
              }}
              className="hidden sm:flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold px-3 py-2 rounded-xl shadow transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>አዲስ እቃ ጨምር</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-amber-200 hover:text-white rounded-xl hover:bg-amber-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-amber-50/50 border-b border-amber-100 flex-shrink-0">
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase">የተመዘገቡ እቃዎች</span>
            <div className="text-lg font-black text-gray-900 mt-0.5">
              {stats?.products?.total_products || products.length}
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase">አዳዲስ / ያገለገሉ</span>
            <div className="text-sm font-bold text-gray-800 mt-1">
              <span className="text-emerald-700">{stats?.products?.new_products || 0} አዲስ</span> • <span className="text-amber-700">{stats?.products?.used_products || 0} ያገለገለ</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase">የትዕዛዞች ብዛት</span>
            <div className="text-lg font-black text-purple-900 mt-0.5">
              {stats?.orders?.total_orders || orders.length}
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase">የተገኘ ገቢ (Sales)</span>
            <div className="text-lg font-black text-emerald-800 mt-0.5">
              {Number(stats?.orders?.total_sales_volume || 0).toLocaleString()} ETB
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'products'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>የእኔ እቃዎች (My Products)</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'orders'
                ? 'border-amber-600 text-amber-900'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>የገዢዎች ትዕዛዞች (Orders - {orders.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {activeTab === 'products' ? (
            <div className="space-y-3">
              {products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">እስካሁን ምንም እቃ አልመዘገቡም</p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSellModal();
                    }}
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    የመጀመሪያውን እቃዎን ይሽጡ &rarr;
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase">
                      <tr>
                        <th className="p-3">ምርት (Product)</th>
                        <th className="p-3">ይዞታ</th>
                        <th className="p-3">ቦታ (Region/Woreda)</th>
                        <th className="p-3">ዋጋ (ETB)</th>
                        <th className="p-3">ብዛት</th>
                        <th className="p-3">ሁኔታ</th>
                        <th className="p-3 text-right">እርምጃ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3 flex items-center gap-2">
                            <img
                              src={p.primary_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=80&q=80'}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                            <span className="font-bold text-gray-900 truncate max-w-[160px]">{p.title}</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.condition === 'new' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.condition === 'new' ? 'አዲስ' : 'ያገለገለ'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600">
                            {p.region} • {p.woreda}
                          </td>
                          <td className="p-3 font-black text-gray-900">{Number(p.price).toLocaleString()} ብር</td>
                          <td className="p-3">{p.stock}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="አጥፋ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">ምንም አዲስ ትዕዛዝ የለም</p>
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <div className="text-xs font-black text-purple-900">{o.order_number}</div>
                        <div className="text-[11px] text-gray-500">
                          ደንበኛ: {o.customer_name} • ስልክ: {o.phone}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700">ሁኔታ:</span>
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-xs text-gray-700">
                      <strong>የማድረሻ አድራሻ:</strong> {o.shipping_address}
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl space-y-1 text-xs">
                      {o.items?.map((it: any) => (
                        <div key={it.id} className="flex justify-between">
                          <span>{it.quantity}x {it.product_title}</span>
                          <span className="font-bold text-gray-900">{(it.unit_price * it.quantity).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
