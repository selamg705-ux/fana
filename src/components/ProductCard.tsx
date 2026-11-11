import React from 'react';
import { Star, ShieldCheck, MapPin, Eye, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { ethiopianLocations } from '../data/locations';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { t, localize } = useLanguage();
  const { openProductModal, addToCart, filteredProducts, products, viewingProduct } = useMarketplace();

  // Find human readable location names (Region, Zone, Woreda)
  const regionObj = ethiopianLocations.find((r) => r.id === product.region);
  const regionName = regionObj ? localize(regionObj.name) : product.region;
  const zoneObj = regionObj?.zones.find((z) => z.id === product.zone);
  const zoneName = zoneObj ? localize(zoneObj.name) : product.zone;
  const woredaObj = zoneObj?.woredas?.find((w) => w.id === product.woreda);
  const woredaName = woredaObj ? localize(woredaObj.name) : product.woreda;

  const locationString = woredaName
    ? `${woredaName}, ${zoneName || regionName}`
    : zoneName
    ? `${zoneName}, ${regionName}`
    : regionName;

  // Condition translation mapping: exactly Brand New or Used
  const conditionLabel =
    product.condition === 'Brand New'
      ? 'አዲስ (Brand New)'
      : 'ያገለገለ (Used)';

  // Calculate Next product in the current active product listing
  const list = filteredProducts && filteredProducts.length > 0 ? filteredProducts : products;
  const currentIndex = list ? list.findIndex((p) => p.id === product.id) : -1;
  const isLast = !list || list.length === 0 || currentIndex === -1 || currentIndex >= list.length - 1;
  const nextProduct = list && list.length > 0 ? (isLast ? list[0] : list[currentIndex + 1]) : null;

  // Function to navigate to the next product in the product listing
  const handleNavigateNext = () => {
    if (!nextProduct) return;

    // Scroll to the next product card in the product listing
    const nextCardEl = document.getElementById(`product-card-${nextProduct.id}`);
    if (nextCardEl) {
      nextCardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nextCardEl.focus({ preventScroll: true });
      nextCardEl.classList.add('ring-4', 'ring-emerald-600', 'ring-offset-2', 'shadow-2xl');
      setTimeout(() => {
        nextCardEl.classList.remove('ring-4', 'ring-emerald-600', 'ring-offset-2', 'shadow-2xl');
      }, 1500);
    }

    // If preview modal is currently open, switch the detailed preview to the next product
    if (viewingProduct) {
      openProductModal(nextProduct);
    }
  };

  return (
    <div 
      id={`product-card-${product.id}`}
      data-product-id={product.id}
      tabIndex={0}
      className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-700/40 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition-all duration-300 flex flex-col overflow-hidden"
    >
      
      {/* Product Image Box */}
      <div 
        onClick={() => openProductModal(product)}
        className="relative w-full aspect-4/3 bg-slate-100 overflow-hidden cursor-pointer"
      >
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80'}
          alt={localize(product.title)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Condition Tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider bg-white/95 backdrop-blur-xs text-slate-800 shadow-xs">
            {conditionLabel}
          </span>
        </div>

        {/* Verified Seller Badge on top right */}
        {product.sellerIsVerified && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-800/90 text-amber-300 backdrop-blur-xs shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('product.verifiedSeller')}</span>
            </span>
          </div>
        )}

        {/* Quick View Overlay on Hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none sm:pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openProductModal(product);
            }}
            className="px-4 py-2 rounded-xl bg-white/95 text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-emerald-800 hover:text-white transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('product.quickView')}</span>
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        
        <div>
          {/* Location & Rating Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <div className="flex items-center gap-1 truncate max-w-[65%]" title={locationString}>
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">{locationString}</span>
            </div>
            
            <div className="flex items-center gap-1 text-amber-600 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal text-[11px]">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Title */}
          <h3 
            onClick={() => openProductModal(product)}
            className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-2 leading-snug cursor-pointer mb-2"
          >
            {localize(product.title)}
          </h3>

          {/* Seller Name and Actual Available Quantity */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3 gap-2">
            <span className="truncate">{product.sellerName}</span>
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-100">
              {t('product.quantity')}: <span className="font-black text-emerald-950">{product.quantity ?? 1}</span>
            </span>
          </div>
        </div>

        {/* Pricing & Add to Cart Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-black text-emerald-900 tracking-tight">
                {product.price.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-700 uppercase">
                {t('product.currency')}
              </span>
            </div>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-slate-400 line-through">
                {product.originalPrice.toLocaleString()} {t('product.currency')}
              </span>
            )}
          </div>

          <button
            onClick={() => addToCart(product, 1)}
            disabled={(product.quantity ?? 1) <= 0}
            className="p-2.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-800 text-emerald-800 hover:text-white border border-emerald-800/20 transition-all font-semibold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('product.addToCart')}
            aria-label={t('product.addToCart')}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{t('product.addToCart')}</span>
          </button>
        </div>

        {/* Dedicated Two Functional Buttons: Preview & Next */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          {/* 1. Preview Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openProductModal(product);
            }}
            className="w-full py-2 px-2.5 sm:px-3 rounded-xl bg-slate-100 hover:bg-emerald-800 text-slate-800 hover:text-white border border-slate-200/90 hover:border-emerald-800 transition-all duration-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer group/preview"
            title={t('product.preview')}
            aria-label="Preview"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-700 group-hover/preview:text-amber-300 transition-colors shrink-0" />
            <span className="truncate">{t('product.preview')}</span>
            <span className="sr-only">Preview</span>
          </button>

          {/* 2. Next Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateNext();
            }}
            className="w-full py-2 px-2.5 sm:px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 transition-all duration-200 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 cursor-pointer group/next"
            title={isLast ? t('product.lastProductNotice') : t('product.next')}
            aria-label="Next"
          >
            <span className="truncate">{t('product.next')}</span>
            <span className="sr-only">Next</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-300 group-hover/next:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </div>

      </div>
    </div>
  );
};

