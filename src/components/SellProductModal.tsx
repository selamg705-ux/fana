import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Sparkles, RefreshCw, AlertCircle, CheckCircle, Camera, FlipHorizontal, Trash2, RotateCcw, Video } from 'lucide-react';
import { ETHIOPIAN_REGIONS } from '../data/ethiopianLocations.ts';
import { Category } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface SellProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onProductCreated: () => void;
  onRequireAuth: () => void;
}

export const SellProductModal: React.FC<SellProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  onProductCreated,
  onRequireAuth
}) => {
  const { user, token } = useAuth();

  const [title, setTitle] = useState('');
  const [titleAmharic, setTitleAmharic] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [condition, setCondition] = useState<'new' | 'used'>('new');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [description, setDescription] = useState('');

  // ETHIOPIAN LOCATION SYSTEM (Mandatory in Selling Form)
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedWoreda, setSelectedWoreda] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // CAMERA-ONLY PRODUCT IMAGE CAPTURE SYSTEM
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Clean up camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraLoading(false);
  };

  // Reset form when opened / Clean up camera when closed
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  // Dependent dropdowns logic:
  // When Region changes, update available woredas and clear subsequent fields
  const currentRegionData = ETHIOPIAN_REGIONS.find((r) => r.region === selectedRegion);
  const availableWoredas = currentRegionData ? currentRegionData.woredas : [];

  const handleRegionChange = (regionName: string) => {
    setSelectedRegion(regionName);
    setSelectedWoreda('');
    setSelectedCity('');
  };

  // When Woreda changes, update available cities
  const currentWoredaData = availableWoredas.find((w) => w.name === selectedWoreda);
  const availableCities = currentWoredaData ? currentWoredaData.cities : [];

  const handleWoredaChange = (woredaName: string) => {
    setSelectedWoreda(woredaName);
    const matchedWoreda = availableWoredas.find((w) => w.name === woredaName);
    if (matchedWoreda && matchedWoreda.cities.length > 0) {
      setSelectedCity(matchedWoreda.cities[0]);
    } else {
      setSelectedCity(woredaName);
    }
  };

  // Start in-browser camera / webcam
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setCameraError(null);
    setIsCameraLoading(true);
    setIsCameraActive(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraLoading(false);
      setCameraError('የካሜራ አገልግሎት በዚህ ብሮውዘር አይደገፍም (Camera API not supported in this browser environment).');
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraLoading(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('⚠️ የካሜራ ፈቃድ ተከልክሏል (Camera Permission Denied). እባክዎ በብሮውዘርዎ ወይም በመሳሪያዎ Settings ውስጥ ለዚህ መተግበሪያ የካሜራ ፈቃድ ይስጡ።');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('⚠️ ካሜራ አልተገኘም (No Camera Found). እባክዎ ካሜራ ወይም ዌብካም የተገናኘ መሆኑን ያረጋግጡ።');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('⚠️ ካሜራው በሌላ መተግበሪያ ተይዟል (Camera In Use by another application). እባክዎ ሌሎች ካሜራ የሚጠቀሙ መተግበሪያዎችን ይዝጉ።');
      } else {
        setCameraError(`⚠️ ካሜራውን ማስነሳት አልተቻለም፡ ${err.message || 'ስህተት አጋጥሟል'}`);
      }
    }
  };

  // Flip camera between environment and user
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Snap photo from live camera video frame
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedPhotos((prev) => [...prev, dataUrl]);
    stopCamera();
  };

  // Native phone camera capture handler (strictly opens device camera via capture="environment")
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCapturedPhotos((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    }
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.value = '';
    }
  };

  // Retake photo
  const retakePhoto = (index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
    startCamera();
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!user || !token) {
      onRequireAuth();
      return;
    }

    if (!title.trim()) {
      setErrorMessage('የእቃው ስም (Product title) አስፈላጊ ነው።');
      return;
    }

    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setErrorMessage('እባክዎ ትክክለኛ ዋጋ በብር (Valid price in ETB) ያስገቡ።');
      return;
    }

    // MANDATORY ETHIOPIAN LOCATION CHECK
    if (!selectedRegion) {
      setErrorMessage('እባክዎ ክልል (Ethiopian Region) ይምረጡ።');
      return;
    }

    if (!selectedWoreda) {
      setErrorMessage('እባክዎ ወረዳ (Woreda) ይምረጡ።');
      return;
    }

    if (!selectedCity) {
      setErrorMessage('እባክዎ ከተማ (City/Town) ይምረጡ ወይም ያስገቡ።');
      return;
    }

    // MANDATORY CAMERA PHOTO VALIDATION (Camera-Only Requirement)
    if (capturedPhotos.length === 0) {
      setErrorMessage('የእቃው ፎቶ አስፈላጊ ነው! እባክዎ ከመመዝገብዎ በፊት ቢያንስ አንድ ፎቶ በካሜራ ያንሱ (Camera-captured photo is required).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          titleAmharic: titleAmharic.trim() || null,
          description: description.trim() || title.trim(),
          price: parseFloat(price),
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          condition, // 'new' | 'used'
          stock: parseInt(stock || '1', 10),
          categoryId: categoryId || (categories[0]?.id || null),
          region: selectedRegion,
          woreda: selectedWoreda,
          city: selectedCity,
          images: capturedPhotos
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ምርቱን መመዝገብ አልተቻለም');
      }

      setSuccessMessage('እቃው በተሳካ ሁኔታ ተመዝግቧል!');
      setTimeout(() => {
        onProductCreated();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'ስህተት ተከስቷል');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center shadow">
              +
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">እቃ ይሽጡ (Sell on Mela Market)</h2>
              <p className="text-xs text-emerald-200">
                አዲስ ወይም ያገለገለ እቃዎን በመላው ኢትዮጵያ ላሉ ገዢዎች ያቅርቡ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Not Logged In Notice */}
        {!user ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">እቃ ለመሸጥ መለያ ያስፈልጋል</h3>
            <p className="text-sm text-gray-600 mb-6">
              እቃዎን ለመመዝገብ እባክዎ መጀመሪያ ይግቡ ወይም በነጻ አዲስ መለያ ይክፈቱ።
            </p>
            <button
              onClick={() => {
                onClose();
                onRequireAuth();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow transition-all"
            >
              ይግቡ ወይም ይመዝገቡ (Sign In / Register)
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* PRODUCT CONDITION: NEW VS USED (Core Requirement) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                የእቃው ይዞታ (Product Condition) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCondition('new')}
                  className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                    condition === 'new'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${condition === 'new' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="leading-tight">አዲስ እቃ (New)</div>
                    <div className="text-[10px] font-normal text-gray-500">ያልተከፈተ / በፋብሪካ የታሸገ</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCondition('used')}
                  className={`flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border-2 font-bold text-sm transition-all ${
                    condition === 'used'
                      ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${condition === 'used' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="leading-tight">ያገለገለ እቃ (Used)</div>
                    <div className="text-[10px] font-normal text-gray-500">ጥራት ያለው የሁለተኛ እጅ እቃ</div>
                  </div>
                </button>
              </div>
            </div>

            {/* ETHIOPIAN LOCATION SYSTEM (Mandatory & Dependent Dropdowns) */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  የእቃው የሚገኝበት ቦታ (Ethiopian Location) *
                </h4>
              </div>
              <p className="text-[11px] text-emerald-800 -mt-2">
                እቃው የሚገኝበትን ክልል፣ ወረዳ እና ከተማ ይምረጡ (ይህ መረጃ በምርቱ ዝርዝር ላይ ይታያል)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Region (ክልል) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    1. ክልል (Region) *
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    required
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- ክልል ይምረጡ --</option>
                    {ETHIOPIAN_REGIONS.map((r) => (
                      <option key={r.region} value={r.region}>
                        {r.regionAmharic} ({r.region})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Woreda (ወረዳ) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    2. ወረዳ (Woreda) *
                  </label>
                  <select
                    value={selectedWoreda}
                    onChange={(e) => handleWoredaChange(e.target.value)}
                    disabled={!selectedRegion}
                    required
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:opacity-60"
                  >
                    <option value="">-- ወረዳ ይምረጡ --</option>
                    {availableWoredas.map((w) => (
                      <option key={w.name} value={w.name}>
                        {w.nameAmharic} ({w.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. City (ከተማ) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    3. ከተማ / ሰፈር (City) *
                  </label>
                  {availableCities.length > 0 ? (
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!selectedWoreda}
                      required
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:opacity-60"
                    >
                      <option value="">-- ከተማ ይምረጡ --</option>
                      {availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="የከተማ ወይም ሰፈር ስም"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!selectedWoreda}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የእቃው ስም (Title - English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samsung Galaxy A55 5G 256GB"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የእቃው ስም በአማርኛ (Title in Amharic)
                  </label>
                  <input
                    type="text"
                    placeholder="ምሳሌ፡ አዲስ ሳምሰንግ ጋላክሲ ስልክ"
                    value={titleAmharic}
                    onChange={(e) => setTitleAmharic(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ክፍል (Category) *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_amharic ? `${c.name_amharic} (${c.name})` : c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ዋጋ በብር (Price ETB) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="e.g. 8500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ብዛት (Stock)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* CAMERA-ONLY PRODUCT PHOTO SECTION */}
              <div className="space-y-3 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>የእቃው ፎቶ (Product Photo - Camera Only) *</span>
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {capturedPhotos.length} / 4 ፎቶዎች
                  </span>
                </div>

                <p className="text-[11px] text-gray-600">
                  ትክክለኛውን እቃ በቀጥታ በካሜራ ወይም በስልክዎ ያንሱ። የፋይል ሰነድ ወይም ጋለሪ መጫን አይፈቀድም።
                </p>

                {/* Camera Permission / Device Error Message */}
                {cameraError && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="leading-relaxed font-medium">{cameraError}</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        🔄 ካሜራውን ደግመው ይሞክሩ (Retry Camera)
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Camera Viewfinder */}
                {isCameraActive && (
                  <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500 shadow-xl">
                    <div className="relative aspect-4/3 w-full max-h-80 bg-black flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {isCameraLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs font-bold gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                          <span>ካሜራው እየተከፈተ ነው... (Connecting camera)</span>
                        </div>
                      )}
                    </div>

                    {/* Camera Controls Bar */}
                    <div className="p-3 bg-gray-900/90 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={toggleCameraFacing}
                        className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="ካሜራ ቀይር (Switch Camera Front/Rear)"
                      >
                        <FlipHorizontal className="w-4 h-4 text-amber-400" />
                        <span className="hidden sm:inline">ካሜራ ቀይር</span>
                      </button>

                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={isCameraLoading}
                        className="flex-1 max-w-[200px] py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                        title="ፎቶውን አንሳ (Snap Photo)"
                      >
                        <Camera className="w-4 h-4" />
                        <span>ፎቶ አንሳ (Snap)</span>
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                        title="ዝጋ (Cancel)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Captured Photos Preview Grid & Actions */}
                {capturedPhotos.length > 0 && !isCameraActive && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {capturedPhotos.map((photo, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-300 shadow-xs group bg-gray-100"
                        >
                          <img
                            src={photo}
                            alt={`Product photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />

                          {/* Primary Photo Badge */}
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                              ዋና ፎቶ
                            </span>
                          )}

                          {/* Action Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                            <button
                              type="button"
                              onClick={() => retakePhoto(idx)}
                              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 rounded-lg shadow font-bold text-[10px] flex items-center gap-1"
                              title="እንደገና አንሳ (Retake Photo)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">እንደገና</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg shadow font-bold text-[10px]"
                              title="አስወግድ (Remove)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Camera Buttons (Only visible when camera is not actively snapping) */}
                {!isCameraActive && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {capturedPhotos.length < 4 && (
                      <>
                        {/* Live Webcam / Browser Camera */}
                        <button
                          type="button"
                          onClick={() => startCamera('environment')}
                          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
                        >
                          <Camera className="w-4 h-4 text-amber-300" />
                          <span>
                            {capturedPhotos.length === 0
                              ? 'ፎቶ በካሜራ አንሳ (Take Photo with Camera)'
                              : '+ ሌላ ፎቶ በካሜራ ጨምር (Capture Another Photo)'}
                          </span>
                        </button>

                        {/* Direct Native Phone Camera Trigger (strictly opens mobile camera with capture="environment") */}
                        <button
                          type="button"
                          onClick={() => nativeCameraInputRef.current?.click()}
                          className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all"
                          title="በስልክዎ ካሜራ በቀጥታ አንሳ"
                        >
                          <Video className="w-4 h-4 text-emerald-700" />
                          <span>በሞባይል ካሜራ አንሳ (Phone Camera)</span>
                        </button>

                        {/* Hidden Native Camera Input - Strictly Camera capture, no gallery option */}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          ref={nativeCameraInputRef}
                          onChange={handleNativeCameraCapture}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  ዝርዝር መግለጫ (Product Description)
                </label>
                <textarea
                  rows={3}
                  placeholder="የእቃውን ሁኔታ፣ መጠን፣ ቀለም ወይም ሌላ አስፈላጊ መረጃ ይጥቀሱ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                ይቅር (Cancel)
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'በኔዮን ፖስትግሬስ ላይ እየተመዘገበ ነው...' : 'እቃውን መዝግብ (Publish Product)'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
