import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  RotateCcw,
  Check,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { useAuth } from '../context/AuthContext';
import { ethiopianLocations } from '../data/locations';
import { productCategories } from '../data/categories';
import { ProductCondition } from '../types';

export const SellModal: React.FC = () => {
  const { t, localize } = useLanguage();
  const { user } = useAuth();
  const { isSellModalOpen, setIsSellModalOpen, addProduct } = useMarketplace();

  // Form Fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('coffee_spices');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellerPhone, setSellerPhone] = useState(user?.phone || '+251904503245');
  const [condition, setCondition] = useState<ProductCondition>('Brand New');
  const [region, setRegion] = useState('addis_ababa');
  const [zone, setZone] = useState('bole');
  const [woreda, setWoreda] = useState('bole_01');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Camera state - Camera only
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Region dependent zones & woredas
  const currentRegionObj = ethiopianLocations.find((r) => r.id === region);
  const availableZones = currentRegionObj ? currentRegionObj.zones : [];
  const currentZoneObj = availableZones.find((z) => z.id === zone);
  const availableWoredas = currentZoneObj?.woredas || [];

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    const reg = ethiopianLocations.find((r) => r.id === newRegion);
    if (reg && reg.zones.length > 0) {
      const firstZone = reg.zones[0];
      setZone(firstZone.id);
      if (firstZone.woredas && firstZone.woredas.length > 0) {
        setWoreda(firstZone.woredas[0].id);
      } else {
        setWoreda('');
      }
    } else {
      setZone('');
      setWoreda('');
    }
  };

  const handleZoneChange = (newZone: string) => {
    setZone(newZone);
    const zObj = availableZones.find((z) => z.id === newZone);
    if (zObj && zObj.woredas && zObj.woredas.length > 0) {
      setWoreda(zObj.woredas[0].id);
    } else {
      setWoreda('');
    }
  };

  // Close camera on unmount or modal close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported by your browser or environment.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Could not access camera. Please allow camera permission on your device.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  const handleConfirmPhoto = () => {
    if (capturedPhoto) {
      setImages((prev) => [...prev, capturedPhoto]);
      setCapturedPhoto(null);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a title for your product.');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Please enter a valid price in Ethiopian Birr (ETB).');
      return;
    }
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Please specify a valid available stock quantity (at least 1).');
      return;
    }
    if (!sellerPhone.trim() || sellerPhone.length < 9) {
      setError('Please provide a contact phone number for buyers.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description of the item.');
      return;
    }
    if (images.length === 0) {
      setError('Please capture at least one photo using your camera.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addProduct({
        title: {
          en: title.trim(),
          am: title.trim(),
          ti: title.trim(),
        },
        description: {
          en: description.trim(),
          am: description.trim(),
          ti: description.trim(),
        },
        categoryId,
        price: numPrice,
        condition,
        quantity: numQty,
        images,
        sellerId: user?.id || 'seller-guest',
        sellerName: user?.name || 'Mela Merchant',
        sellerPhone: sellerPhone.trim(),
        sellerIsVerified: user?.role === 'admin' || user?.role === 'seller',
        region,
        zone,
        woreda: woreda || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsSellModalOpen(false);
        // Reset form
        setTitle('');
        setPrice('');
        setQuantity('1');
        setDescription('');
        setImages([]);
      }, 1800);
    } catch (err: any) {
      setError('Failed to publish listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setIsSellModalOpen(false);
    setError(null);
  };

  if (!isSellModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      
      <div 
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h2 className="font-extrabold text-lg sm:text-xl text-slate-900">
              {t('postAd.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('postAd.subtitle')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1">
          {success ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-900">{t('postAd.success')}</h3>
              <p className="text-sm text-slate-500">Your listing is now live in the marketplace!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('postAd.productTitle')} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Yirgacheffe Specialty Coffee Beans"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                />
              </div>

              {/* Category & Condition (Condition has exactly: አዲስ (Brand New) and ያገለገለ (Used)) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.category')} *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
                  >
                    {productCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {localize(c.name)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.condition')} *
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ProductCondition)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer"
                  >
                    <option value="Brand New">አዲስ (Brand New)</option>
                    <option value="Used">ያገለገለ (Used)</option>
                  </select>
                </div>
              </div>

              {/* Price & Quantity & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.price')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.quantity')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('postAd.phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={sellerPhone}
                    onChange={(e) => setSellerPhone(e.target.value)}
                    placeholder="e.g. +251 904 503 245"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                  />
                </div>
              </div>

              {/* Complete Location Selection: Region -> Zone -> Woreda */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Product Location / የእቃው መገኛ ቦታ
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('postAd.region')} *
                    </label>
                    <select
                      value={region}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white cursor-pointer"
                    >
                      {ethiopianLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {localize(loc.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('postAd.zone')} *
                    </label>
                    <select
                      value={zone}
                      onChange={(e) => handleZoneChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white cursor-pointer"
                    >
                      {availableZones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {localize(z.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('postAd.woreda')} *
                    </label>
                    <select
                      value={woreda}
                      onChange={(e) => setWoreda(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white cursor-pointer"
                    >
                      {availableWoredas.length > 0 ? (
                        availableWoredas.map((w) => (
                          <option key={w.id} value={w.id}>
                            {localize(w.name)}
                          </option>
                        ))
                      ) : (
                        <option value="">{t('postAd.woreda')}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('postAd.description')} *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide detailed description of your product..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-700 text-sm"
                />
              </div>

              {/* Photo Capture - Camera Only (No file browsing) */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-800/15">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-900">
                    {t('postAd.photos')}
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Device Camera Only
                  </span>
                </div>

                {cameraError && (
                  <p className="text-xs text-rose-600 mb-2 font-medium">{cameraError}</p>
                )}

                {/* Live Camera View if active */}
                {isCameraActive ? (
                  <div className="relative aspect-4/3 max-w-sm mx-auto bg-black rounded-2xl overflow-hidden mb-3 shadow-lg">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="px-5 py-2.5 rounded-xl bg-amber-400 text-emerald-950 font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>{t('postAd.cameraCapture')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 text-white font-semibold text-xs active:scale-95 cursor-pointer"
                      >
                        {t('postAd.closeCamera')}
                      </button>
                    </div>
                  </div>
                ) : capturedPhoto ? (
                  /* Captured Photo Review & Preview */
                  <div className="relative aspect-4/3 max-w-sm mx-auto rounded-2xl overflow-hidden mb-3 border-2 border-emerald-700 shadow-md">
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                    <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleConfirmPhoto}
                        className="px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4 text-amber-300" />
                        <span>{t('postAd.usePhoto')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRetakePhoto}
                        className="px-3.5 py-2 rounded-xl bg-white text-slate-800 font-semibold text-xs shadow-md active:scale-95 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                        <span>{t('postAd.retake')}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Camera-only trigger */
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
                    >
                      <Camera className="w-5 h-5 text-amber-400" />
                      <span>{t('postAd.openCamera')}</span>
                    </button>
                    <p className="text-[11px] text-slate-500 text-center mt-1.5">
                      Photos are captured in real-time with device camera for authentic marketplace listings.
                    </p>
                  </div>
                )}

                {/* Previews of attached captured images */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 group">
                        <img src={img} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? t('postAd.submitting') : t('postAd.submit')}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
