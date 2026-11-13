import React from 'react';
import { X, MapPin, Sparkles, RefreshCw, CheckCircle2, ShoppingCart, Phone, Store, Shield, ArrowRight, MessageCircle } from 'lucide-react';
import { Product } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onBuyNow: (p: Product) => void;
  contactPhone?: string;
  contactWhatsapp?: string;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onBuyNow,
  contactPhone = '0904503245',
  contactWhatsapp = '@brmiki21'
}) => {
  const { addToCart } = useCart();

  if (!product) return null;

  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-md backdrop-blur-sm transition-all active:scale-95"
          title="ዝጋ"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image Showcase */}
            <div className="relative bg-gray-50 flex flex-col justify-center items-center p-4 sm:p-6 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-inner bg-gray-100 max-h-80 sm:max-h-none">
                <img
                  src={product.primary_image || (product.images && product.images[0]?.image_url) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />

                {/* Condition Badge (Clearly functional in details) */}
                <div className="absolute top-3 left-3">
                  {product.condition === 'new' ? (
                    <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>አዲስ እቃ (NEW)</span>
                    </span>
                  ) : (
                    <span className="bg-amber-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                      <span>ያገለገለ እቃ (USED)</span>
                    </span>
                  )}
                </div>

                {hasDiscount && (
                  <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">
                    -{discountPct}% ቅናሽ
                  </div>
                )}
              </div>

              {/* Additional gallery thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto w-full py-1">
                  {product.images.map((img) => (
                    <div key={img.id} className="w-14 h-14 rounded-lg overflow-hidden border border-emerald-300 flex-shrink-0">
                      <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info & Actions */}
            <div className="p-5 sm:p-6 md:p-8 flex flex-col justify-between space-y-4">
              <div>
                {/* Category */}
                <div className="text-xs font-bold text-emerald-700 tracking-wide uppercase mb-1">
                  {product.category_name_amharic || product.category_name || 'የገበያ እቃ'}
                </div>

                {/* Title */}
                <h1 className="text-lg sm:text-2xl font-black text-gray-900 leading-tight mb-2">
                  {product.title}
                </h1>

                {product.title_amharic && (
                  <p className="text-sm font-semibold text-emerald-800 mb-3">
                    {product.title_amharic}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-4 bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                    {Number(product.price).toLocaleString()}
                  </span>
                  <span className="text-sm font-black text-emerald-700">ETB (ብር)</span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-400 line-through ml-2">
                      {Number(product.original_price).toLocaleString()} ብር
                    </span>
                  )}
                </div>

                {/* Ethiopian Location */}
                <div className="mb-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>የሚገኝበት ቦታ (Location)</span>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg text-xs">
                      ክልል: {product.region}
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg text-xs">
                      ወረዳ: {product.woreda}
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg text-xs">
                      ከተማ: {product.city}
                    </span>
                  </div>
                </div>

                {/* Seller & Contact Strip */}
                <div className="mb-4 p-3 bg-amber-50/60 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-gray-900">
                          {product.store_name || 'Mela Verified Shop'}
                        </span>
                        {product.seller_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500">የተረጋገጠ የኢትዮጵያ ሻጭ</span>
                    </div>
                  </div>

                  {/* Direct Contact Links */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-xs transition-colors"
                      title="በስልክ ይደውሉ"
                    >
                      <Phone className="w-3 h-3 text-amber-300" />
                      <span>{contactPhone}</span>
                    </a>
                    <a
                      href="https://wa.me/251904503245"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 hover:text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-colors"
                      title="በዋትስአፕ ያግኙን"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-300" />
                      <span>{contactWhatsapp}</span>
                    </a>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    የእቃው ዝርዝር (Description)
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line max-h-32 sm:max-h-40 overflow-y-auto">
                    {product.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      addToCart(product, 1);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs sm:text-sm py-3 rounded-xl transition-all active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-700" />
                    <span>ወደ ጋሪ ጨምር</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onBuyNow(product);
                    }}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <span>አሁኑኑ ይዘዙ</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center text-[11px] text-gray-500 flex items-center justify-center gap-2 pt-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>በቴሌብር (Telebirr) እና CBE Birr ክፍያ ይፈጸማል</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
