import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  Phone,
  MessageCircle,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle,
  UserCheck,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { ethiopianLocations } from '../data/locations';
import { productCategories } from '../data/categories';

export const ProductModal: React.FC = () => {
  const { t, localize } = useLanguage();
  const { user, openAuthModal } = useAuth();
  const {
    viewingProduct,
    closeProductModal,
    addToCart,
    getProductReviews,
    addReview,
  } = useMarketplace();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  if (!viewingProduct) return null;

  const images = viewingProduct.images && viewingProduct.images.length > 0
    ? viewingProduct.images
    : ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80'];

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Location display (Region, Zone, Woreda)
  const regionObj = ethiopianLocations.find((r) => r.id === viewingProduct.region);
  const regionName = regionObj ? localize(regionObj.name) : viewingProduct.region;
  const zoneObj = regionObj?.zones.find((z) => z.id === viewingProduct.zone);
  const zoneName = zoneObj ? localize(zoneObj.name) : viewingProduct.zone;
  const woredaObj = zoneObj?.woredas?.find((w) => w.id === viewingProduct.woreda);
  const woredaName = woredaObj ? localize(woredaObj.name) : viewingProduct.woreda;
  const fullLocation = woredaName
    ? `${woredaName}, ${zoneName || regionName}`
    : zoneName
    ? `${zoneName}, ${regionName}`
    : regionName;

  // Category display
  const categoryObj = productCategories.find((c) => c.id === viewingProduct.categoryId);
  const categoryName = categoryObj ? localize(categoryObj.name) : viewingProduct.categoryId;

  // Reviews
  const productReviews = getProductReviews(viewingProduct.id);

  const handleAddToCart = () => {
    addToCart(viewingProduct, quantity);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    if (!user) {
      openAuthModal('login');
      return;
    }

    setIsSubmittingReview(true);
    await addReview({
      productId: viewingProduct.id,
      userId: user.id,
      userName: user.name,
      rating: reviewRating,
      comment: reviewComment.trim(),
    });

    setReviewComment('');
    setIsSubmittingReview(false);
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 4000);
  };

  const conditionLabel =
    viewingProduct.condition === 'Brand New'
      ? 'አዲስ (Brand New)'
      : 'ያገለገለ (Used)';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div 
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button Top Right */}
        <button
          onClick={closeProductModal}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 flex items-center justify-center shadow-md border border-slate-200 transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8">
          
          {/* Main Top Section: Image Carousel + Core Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* Left: Image Carousel & Thumbnails */}
            <div className="lg:col-span-6 flex flex-col gap-3">
              
              {/* Main Image Box */}
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 group">
                <img
                  src={images[activeImageIndex]}
                  alt={localize(viewingProduct.title)}
                  className="w-full h-full object-cover transition-transform duration-300"
                />

                {/* Left/Right Carousel Controls */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                      aria-label="Previous Image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all cursor-pointer"
                      aria-label="Next Image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Badges on Image */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-white/95 text-slate-900 shadow-xs">
                    {conditionLabel}
                  </span>
                  {viewingProduct.sellerIsVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-800 text-amber-300 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      {t('product.verifiedSeller')}
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnails Row */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-emerald-700 ring-2 ring-emerald-700/20 scale-102'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info & Pricing */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div>
                
                {/* Category & Location Header */}
                <div className="flex flex-wrap items-center justify-between text-xs font-medium text-slate-500 mb-2 gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                    {categoryName}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{fullLocation}</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug mb-3">
                  {localize(viewingProduct.title)}
                </h1>

                {/* Rating & Reviews Count */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-extrabold text-amber-900">
                      {viewingProduct.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {viewingProduct.reviewsCount} {t('product.reviews')}
                  </span>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t('productModal.listedOn')}: {viewingProduct.createdAt}</span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-800/15 mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
                      {viewingProduct.price.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-emerald-800 uppercase">
                      {t('product.currency')}
                    </span>
                    {viewingProduct.originalPrice && viewingProduct.originalPrice > viewingProduct.price && (
                      <span className="ml-2 text-sm text-slate-400 line-through">
                        {viewingProduct.originalPrice.toLocaleString()} {t('product.currency')}
                      </span>
                    )}
                  </div>
                  
                  {/* Actual Available Quantity */}
                  <div className="mt-2.5 pt-2 border-t border-emerald-800/15 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold">{t('product.quantity')}:</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black">
                      {viewingProduct.quantity ?? 1} in stock
                    </span>
                  </div>
                </div>

                {/* Seller Contact Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {viewingProduct.sellerName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">{t('productModal.sellerInfo')}</p>
                        <p className="text-sm font-bold text-slate-900">{viewingProduct.sellerName}</p>
                      </div>
                    </div>
                    {viewingProduct.sellerIsVerified && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Direct Contact Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${viewingProduct.sellerPhone}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold transition-all shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t('productModal.callSeller')}</span>
                    </a>
                    <a
                      href={`https://wa.me/251904503245?text=${encodeURIComponent('Hello! I am interested in your listing: ' + localize(viewingProduct.title))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-amber-300" />
                      <span>{t('productModal.chatWhatsApp')}</span>
                    </a>
                  </div>
                </div>

              </div>

              {/* Quantity Selector & Add to Cart */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={(viewingProduct.quantity ?? 1) <= 0}
                    className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-slate-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(viewingProduct.quantity ?? 1, q + 1))}
                    disabled={(viewingProduct.quantity ?? 1) <= quantity}
                    className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={(viewingProduct.quantity ?? 1) <= 0}
                  className="flex-1 py-3 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>{(viewingProduct.quantity ?? 1) <= 0 ? 'Out of Stock' : t('product.addToCart')}</span>
                </button>
              </div>

            </div>

          </div>

          {/* Description & Specifications */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
            <h2 className="font-extrabold text-base text-slate-900 mb-3">
              {t('productModal.description')}
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {localize(viewingProduct.description)}
            </p>
          </div>

          {/* Customer Reviews Section */}
          <div className="space-y-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-lg text-slate-900">
                {t('productModal.reviewsTitle')} ({productReviews.length})
              </h2>
              <div className="flex items-center gap-1.5 text-amber-600 font-extrabold text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{viewingProduct.rating.toFixed(1)} / 5.0</span>
              </div>
            </div>

            {/* Add Review Box */}
            <form onSubmit={handleSubmitReview} className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 mb-3">
                {t('productModal.addReview')}
              </h3>

              {reviewSuccess && (
                <div className="mb-3 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                  <span>Your review has been verified and added to the listing!</span>
                </div>
              )}

              {/* Star Rating Picker */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-slate-500 font-medium">{t('productModal.rating')}:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= reviewRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment text area */}
              <textarea
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={t('productModal.yourComment')}
                className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 mb-3"
                required
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview || !reviewComment.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingReview ? 'Submitting...' : t('productModal.submitReview')}
                </button>
              </div>
            </form>

            {/* Reviews List */}
            {productReviews.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-4">
                {t('productModal.noReviews')}
              </p>
            ) : (
              <div className="space-y-4">
                {productReviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{rev.userName}</span>
                        {rev.isVerifiedPurchase && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            {t('productModal.verifiedPurchase')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{rev.date}</span>
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
