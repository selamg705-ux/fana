import React, { useState, useEffect } from 'react';
import { X, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order } from '../types/index.ts';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      loadOrders();
    }
  }, [isOpen, token]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (e) {
      console.warn(e);
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
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-500">ትዕዛዞችዎን ከኔዮን ዳታቤዝ በመጫን ላይ...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-800">እስካሁን ያዘዙት እቃ የለም</h3>
              <p className="text-xs text-gray-500 mt-1">የሚፈልጉትን አዲስ ወይም ያገለገለ እቃ ይዘዙ</p>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-purple-900">{o.order_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    o.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : o.status === 'shipped'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {o.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  ቀን: {new Date(o.created_at).toLocaleDateString()} • ክፍያ: {o.payment_method}
                </div>
                <div className="border-t border-gray-200 pt-2 text-xs divide-y divide-gray-100">
                  {o.items?.map((it, idx) => (
                    <div key={idx} className="py-1 flex justify-between">
                      <span className="text-gray-800">{it.quantity}x {it.product_title}</span>
                      <span className="font-bold text-gray-900">{(it.unit_price * it.quantity).toLocaleString()} ETB</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-baseline font-black text-xs">
                  <span>ጠቅላላ ክፍያ:</span>
                  <span className="text-sm text-emerald-800">{Number(o.total_amount).toLocaleString()} ETB</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
