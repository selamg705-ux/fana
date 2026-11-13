import React, { useRef } from 'react';
import { MapPin, ShoppingCart, Eye, Tag, CheckCircle2, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { Product } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';

interface NewProductsSectionProps {
  products: Product[];
  onSelectProduct: (p: Product) => void;
  isLoading?: boolean;
}

export const NewProductsSection: React.FC<NewProductsSectionProps> = ({
  products,
  onSelectProduct,
  isLoading
}) => {
  const { addToCart } = useCart();
  const { t, getCategoryName } = useLanguage();
  const sliderRef = useRef<HTMLDivElement>(null);

  // Independent smooth scroll handler for New Products carousel across mobile, tablet, and desktop
  const scrollCarousel = (direction: 'prev' | 'next') => {
    const container = sliderRef.current;
    if (!container) return;

    const firstCard = container.querySelector('[data-product-card]') as HTMLElement | null;
    const gap = window.innerWidth >= 640 ? 24 : 12;
    const step = firstCard ? firstCard.offsetWidth + gap : 280;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);

    if (maxScroll <= 0) return;

    if (direction === 'next') {
      if (container.scrollLeft >= maxScroll - 4) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: step, behavior: 'smooth' });
      }
    } else {
      if (container.scrollLeft <= 4) {
        container.scrollTo({ left: maxScroll, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -step, behavior: 'smooth' });
      }
    }
  };

  const sortedProducts = [...products].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-b from-white to-emerald-50/40 border-b border-emerald-100 relative">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-6 pb-4 border-b border-emerald-200/80">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight text-center">
            {t('products.newTitle')}
          </h2>
        </div>

        {/* Horizontal Product Carousel Container */}
        <div className="relative">
          {/* Horizontal Product Slider (side-by-side with touch swipe) */}
          {isLoading ? (
            <div
              ref={sliderRef}
              className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto scroll-smooth py-3 px-1 scrollbar-none touch-pan-x"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-[185px] sm:w-[270px] md:w-[310px] lg:w-[340px] flex-shrink-0 animate-pulse bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-xs">
                  <div className="bg-gray-200 aspect-4/3 rounded-xl mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-9 bg-gray-200 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-dashed border-emerald-200 max-w-lg mx-auto">
              <Tag className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800 text-center">በዚህ ምርጫ የተገኘ እቃ የለም</h3>
            </div>
          ) : (
            <>
              <div
                ref={sliderRef}
                data-carousel-track="new-products"
                className="flex items-stretch gap-3 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory py-3 px-1 scrollbar-none touch-pan-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {sortedProducts.map((p) => {
                  const hasDiscount = p.original_price && p.original_price > p.price;
                  const discountPct = hasDiscount
                    ? Math.round(((p.original_price! - p.price) / p.original_price!) * 100)
                    : 0;
                  const imageUrl = p.primary_image || (p.images && p.images[0]?.image_url) || '';

                  return (
                    <div
                      key={p.id}
                      data-product-card
                      className="w-[185px] sm:w-[270px] md:w-[310px] lg:w-[340px] flex-shrink-0 snap-start group bg-white rounded-2xl border border-emerald-100/90 shadow-xs hover:shadow-xl hover:border-emerald-400 transition-all duration-300 flex flex-col overflow-hidden"
                    >
                      {/* Product Image (Real DB image with preview click) */}
                      <div
                        onClick={() => onSelectProduct(p)}
                        className="relative aspect-4/3 overflow-hidden bg-gray-100 cursor-pointer flex items-center justify-center"
                        title="ዝርዝር ይመልከቱ (Click to Preview)"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <ShoppingBag className="w-10 h-10 text-emerald-300" />
                        )}

                        {/* Discount Badge */}
                        {hasDiscount && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            -{discountPct}%
                          </div>
                        )}

                        {/* Location Badge */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-emerald-950/85 backdrop-blur-xs text-emerald-100 text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span className="truncate">{p.region} • {p.woreda}</span>
                        </div>
                      </div>

                      {/* Card Content: Title and Price clearly displayed below image */}
                      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Category & Store */}
                          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 mb-1 gap-1">
                            <span className="text-emerald-700 font-semibold truncate max-w-[90px] sm:max-w-[140px]">
                              {p.category_name
                                ? getCategoryName({ name: p.category_name, name_amharic: p.category_name_amharic })
                                : (p.category_name_amharic || 'ምርት')}
                            </span>
                            {p.store_name && (
                              <span className="flex items-center gap-0.5 text-gray-600 truncate max-w-[75px] sm:max-w-[110px]">
                                <span className="truncate">{p.store_name}</span>
                                {p.seller_verified && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                              </span>
                            )}
                          </div>

                          {/* Product Title */}
                          <h3
                            onClick={() => onSelectProduct(p)}
                            className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 cursor-pointer leading-snug min-h-[2.4em]"
                            title={p.title}
                          >
                            {p.title}
                          </h3>
                        </div>

                        {/* Price & Actions */}
                        <div className="mt-2.5 sm:mt-3 pt-2 border-t border-gray-100 space-y-2">
                          <div className="flex items-baseline justify-between gap-1">
                            <div className="flex items-baseline gap-1 truncate">
                              <span className="text-sm sm:text-base lg:text-lg font-black text-emerald-950 truncate">
                                {Number(p.price).toLocaleString()}
                              </span>
                              <span className="text-[10px] sm:text-xs font-bold text-emerald-700">ብር</span>
                            </div>
                            {hasDiscount && (
                              <span className="text-[10px] text-gray-400 line-through truncate">
                                {Number(p.original_price).toLocaleString()} ብር
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectProduct(p)}
                              className="flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-colors active:scale-95"
                              title="ዝርዝር ይመልከቱ (Preview Details)"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">ይመልከቱ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => addToCart(p, 1)}
                              className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95"
                              title="ወደ ጋሪ ጨምር (Add to Cart)"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                              <span className="truncate">ግዛ</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Independent Previous & Next Controls directly underneath the product photos */}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollCarousel('prev')}
                  aria-label="Previous New Products"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-600 text-emerald-900 hover:text-white border border-emerald-300 shadow-sm text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t('carousel.previous', 'Previous')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel('next')}
                  aria-label="Next New Products"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-sm text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <span>{t('carousel.next', 'Next')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
