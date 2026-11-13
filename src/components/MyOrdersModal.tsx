import React, { useState, useEffect } from 'react';
import { X, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order } from '../types/index.ts';
import { safeApiFetch, extractErrorMessage, safeText } from '../utils/api.ts';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      loadOrders();
    }
  }, [isOpen, token]);

  const loadOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await safeApiFetch<Order[]>('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (result.ok && Array.isArray(result.data)) {
        setOrders(result.data);
      } else {
        setError(extractErrorMessage(result.error, 'ትዕዛዞችዎን መጫን አልተቻለም (Could not load orders)'));
      }
    } catch (e) {
      setError(extractErrorMessage(e, 'ትዕዛዞችዎን መጫን አልተቻለም'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">የትዕዛዞች ዝርዝር (My Orders)</h2>
              <p className="text-xs text-emerald-200">ያዘዟቸውን እቃዎች ሁኔታ እዚህ ይከታተሉ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-emerald-200 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-500">ትዕዛዞችዎን ከኔዮን ዳታቤዝ በመጫን ላይ...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800">እስካሁን ያዘዙት እቃ የለም</h3>
              <p className="text-xs text-gray-500 mt-1">የሚፈልጉትን አዲስ ወይም ያገለገለ እቃ ይዘዙ</p>
            </div>
          ) : (
            orders.map((o) => {
              const orderStatus = safeText(o.status, 'pending');
              const validItems = Array.isArray(o.items)
                ? o.items.filter((it) => it && it.id !== null && it.product_title)
                : [];
              return (
                <div key={o.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-purple-900">{safeText(o.order_number, `#${o.id}`)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      orderStatus === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : orderStatus === 'shipped'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {orderStatus.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    ቀን: {o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'} • ክፍያ: {safeText(o.payment_method, 'Cash')}
                  </div>
                  <div className="border-t border-gray-200 pt-2 text-xs divide-y divide-gray-100">
                    {validItems.map((it, idx) => (
                      <div key={it.id ?? idx} className="py-1 flex justify-between">
                        <span className="text-gray-800">{it.quantity}x {it.product_title}</span>
                        <span className="font-bold text-gray-900">{((Number(it.unit_price) || 0) * (Number(it.quantity) || 0)).toLocaleString()} ETB</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline font-black text-xs">
                    <span>ጠቅላላ ክፍያ:</span>
                    <span className="text-sm text-emerald-800">{Number(o.total_amount || 0).toLocaleString()} ETB</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
