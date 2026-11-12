import React, { useState, useRef } from 'react';
import { RefreshCw, MapPin, ShoppingCart, Eye, Tag, CheckCircle2, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';

interface UsedProductsSectionProps {
  products: Product[];
  onSelectProduct: (p: Product) => void;
  isLoading?: boolean;
}

export const UsedProductsSection: React.FC<UsedProductsSectionProps> = ({
  products,
  onSelectProduct,
  isLoading
}) => {
  const { addToCart } = useCart();
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const sliderRef = useRef<HTMLDivElement>(null);

  // Smooth scroll handler for carousel across mobile, tablet, and desktop
  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const isMobile = sliderRef.current.clientWidth < 640;
      const scrollAmount = isMobile ? 280 : Math.min(sliderRef.current.clientWidth * 0.75, 600);
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Filter and sort for the USED PRODUCTS section independently
  const filteredProducts = products.filter((p) => {
    if (filterRegion === 'all') return true;
    return p.region === filterRegion;
  }).sort((a, b) => {
    if (sortBy === 'price_low') return a.price - b.price;
    if (sortBy === 'price_high') return b.price - a.price;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Extract unique regions present in used products
  const availableRegions = Array.from(new Set(products.map((p) => p.region).filter(Boolean)));

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-b from-amber-50/20 via-white to-amber-50/30 border-b border-amber-100/80 relative">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 pb-4 border-b border-amber-200/80">
          <div className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2.5 mx-auto">
            <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
            <span>ያገለገሉ እቃ (Used Products Section)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight text-center">
            ያገለገሉ እቃዎች
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 max-w-xl mx-auto text-center leading-relaxed">
            ጥራት ያላቸው እና በተመጣጣኝ ዋጋ የቀረቡ ያገለገሉ እቃዎች (ስልኮች፣ ላፕቶፖች፣ መኪኖች እና የቤት እቃዎች)።
          </p>

          {/* Navigation, Filters & Carousel Controls */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mt-4">
            {availableRegions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className="bg-transparent text-gray-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all">ሁሉም ክልሎች (All Regions)</option>
                  {availableRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs shadow-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="featured">ተመራጭ (Featured)</option>
                <option value="price_low">ዋጋ፡ ከዝቅተኛ (Low to High)</option>
                <option value="price_high">ዋጋ፡ ከከፍተኛ (High to Low)</option>
                <option value="newest">አዲስ የተጨመሩ (Newest)</option>
              </select>
            </div>

            {/* Slider Arrow Controls in Header (Visible on all screen sizes) */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="Previous Products (←)"
                className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 shadow-xs hover:border-amber-500 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                title="ወደ ኋላ (Previous ←)"
              >
                <ChevronLeft className="w-4 h-4 text-amber-700" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="Next Products (→)"
                className="p-2 sm:p-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 shadow-xs hover:border-amber-500 transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                title="ወደ ፊት (Next →)"
              >
                <ChevronRight className="w-4 h-4 text-amber-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Product Carousel Container with Always-Visible Floating Controls */}
        <div className="relative group/carousel">
          {/* Always Visible Left Arrow (Mobile, Tablet & Desktop) */}
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Previous Used Products (←)"
            className="flex absolute left-0.5 sm:-left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-white/95 hover:bg-amber-600 hover:text-white text-amber-950 border border-amber-300 shadow-md sm:shadow-xl items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer backdrop-blur-xs"
            title="ወደ ኋላ (Previous ←)"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-800 hover:text-white" />
          </button>

          {/* Always Visible Right Arrow (Mobile, Tablet & Desktop) */}
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Next Used Products (→)"
            className="flex absolute right-0.5 sm:-right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-white/95 hover:bg-amber-600 hover:text-white text-amber-950 border border-amber-300 shadow-md sm:shadow-xl items-center justify-center transition-all active:scale-90 hover:scale-105 cursor-pointer backdrop-blur-xs"
            title="ወደ ፊት (Next →)"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-800 hover:text-white" />
          </button>

          {/* Horizontal Product Slider */}
          {isLoading ? (
            <div
              ref={sliderRef}
              className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto scroll-smooth py-4 px-1 scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-[260px] sm:w-[280px] md:w-[300px] flex-shrink-0 animate-pulse bg-white rounded-2xl p-4 border border-gray-100 shadow-xs">
                  <div className="bg-gray-200 aspect-4/3 rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-9 bg-gray-200 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-dashed border-amber-200 max-w-lg mx-auto">
              <Tag className="w-12 h-12 text-amber-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800 text-center">በዚህ ምርጫ የተገኘ እቃ የለም</h3>
              <p className="text-xs text-gray-500 mt-1 text-center">
                በተመረጠው ክልል ወይም መስፈርት የተመዘገበ እቃ የለም። እቃዎን አሁኑኑ ይሽጡ!
              </p>
            </div>
          ) : (
            <div
              ref={sliderRef}
              className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 px-1 scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {filteredProducts.map((p) => {
                const hasDiscount = p.original_price && p.original_price > p.price;
                const discountPct = hasDiscount
                  ? Math.round(((p.original_price! - p.price) / p.original_price!) * 100)
                  : 0;

                return (
                  <div
                    key={p.id}
                    className="w-[260px] sm:w-[280px] md:w-[300px] flex-shrink-0 snap-start group bg-white rounded-2xl border border-amber-200/70 shadow-xs hover:shadow-xl hover:border-amber-400 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    {/* Product Image (Clearly visible with preview click) */}
                    <div
                      onClick={() => onSelectProduct(p)}
                      className="relative aspect-4/3 overflow-hidden bg-gray-100 cursor-pointer"
                      title="ዝርዝር ይመልከቱ (Click to Preview)"
                    >
                      <img
                        src={p.primary_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Discount Badge */}
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          -{discountPct}%
                        </div>
                      )}

                      {/* Location Badge */}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-gray-900/85 backdrop-blur-xs text-amber-100 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span className="truncate">{p.region} • {p.woreda}</span>
                      </div>
                    </div>

                    {/* Card Content: Title and Price clearly displayed below image */}
                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Category & Store */}
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 mb-1">
                          <span className="text-amber-800 font-semibold truncate max-w-[120px]">
                            {p.category_name_amharic || p.category_name || 'ምርት'}
                          </span>
                          {p.store_name && (
                            <span className="flex items-center gap-0.5 text-gray-600 truncate max-w-[90px]">
                              <span className="truncate">{p.store_name}</span>
                              {p.seller_verified && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                            </span>
                          )}
                        </div>

                        {/* Product Title */}
                        <h3
                          onClick={() => onSelectProduct(p)}
                          className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-amber-800 transition-colors line-clamp-2 cursor-pointer leading-snug min-h-[2.4em]"
                          title={p.title}
                        >
                          {p.title}
                        </h3>
                      </div>

                      {/* Price & Actions: Display existing price and clear Preview button */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-2">
                        {/* Price Row */}
                        <div className="flex items-baseline justify-between gap-1">
                          <div className="flex items-baseline gap-1 truncate">
                            <span className="text-sm sm:text-base lg:text-lg font-black text-gray-900 truncate">
                              {Number(p.price).toLocaleString()}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-amber-800">ብር</span>
                          </div>
                          {hasDiscount && (
                            <span className="text-[10px] text-gray-400 line-through truncate">
                              {Number(p.original_price).toLocaleString()} ብር
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Preview and Add to Cart */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(p)}
                            className="flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 py-1.5 px-2 rounded-xl text-xs font-bold transition-colors active:scale-95"
                            title="ዝርዝር ይመልከቱ (Preview Details)"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-700" />
                            <span>ይመልከቱ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => addToCart(p, 1)}
                            className="flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 text-white py-1.5 px-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                            title="ወደ ጋሪ ጨምር (Add to Cart)"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-amber-200" />
                            <span>ግዛ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

