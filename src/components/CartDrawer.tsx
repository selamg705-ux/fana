import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const { cart, removeFromCart, updateQuantity, totalPrice, isCartOpen, setIsCartOpen } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 bg-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-6 h-6 text-amber-300" />
              <div>
                <h2 className="text-lg font-bold">የግዢ ጋሪ (Shopping Cart)</h2>
                <span className="text-xs text-emerald-200">{cart.length} የተመረጡ እቃዎች</span>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-gray-100">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <ShoppingBag className="w-16 h-16 text-emerald-200 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-800 mb-1">ጋሪዎ ባዶ ነው</h3>
                <p className="text-xs text-gray-500">የሚፈልጓቸውን አዳዲስ ወይም ያገለገሉ እቃዎች ይምረጡ</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="pt-4 first:pt-0 flex gap-4 items-center">
                  <img
                    src={item.product.primary_image || (item.product.images && item.product.images[0]?.image_url) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'}
                    alt={item.product.title}
                    className="w-16 h-16 rounded-xl object-cover border border-emerald-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 truncate">{item.product.title}</h4>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      {item.product.condition === 'new' ? 'አዲስ' : 'ያገለገለ'} • {item.product.region}
                    </span>
                    <div className="text-xs font-black text-gray-900 mt-1">
                      {Number(item.product.price).toLocaleString()} ETB
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="አስወግድ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded-l text-gray-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded-r text-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Bar */}
          {cart.length > 0 && (
            <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-baseline font-black">
                <span className="text-sm text-gray-700">ጠቅላላ ድምር (Subtotal):</span>
                <span className="text-xl text-emerald-900">{totalPrice.toLocaleString()} ETB</span>
              </div>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onProceedToCheckout();
                }}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3.5 rounded-2xl shadow-md transition-all active:scale-98"
              >
                <span>ትዕዛዝ ያጠናቁ (Proceed to Checkout)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
