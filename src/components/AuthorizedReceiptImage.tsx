import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2, Maximize2, X } from 'lucide-react';

interface AuthorizedReceiptImageProps {
  receiptId: number;
  token: string | null;
  alt?: string;
  className?: string;
  refreshKey?: string | number;
}

export const AuthorizedReceiptImage: React.FC<AuthorizedReceiptImageProps> = ({
  receiptId,
  token,
  alt = 'Payment Receipt',
  className = 'w-full max-h-56 object-contain rounded-xl border border-gray-200 bg-white',
  refreshKey,
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    const loadFile = async () => {
      if (!receiptId || !token) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      try {
        const res = await fetch(`/api/payment-receipts/${receiptId}/file?t=${encodeURIComponent(String(refreshKey ?? ''))}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error('Unauthorized or missing receipt image');
        }
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setObjectUrl(createdUrl);
        } else {
          URL.revokeObjectURL(createdUrl);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setObjectUrl(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      cancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [receiptId, token, refreshKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        <span>ደረሰኝ በመጫን ላይ...</span>
      </div>
    );
  }

  if (hasError || !objectUrl) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-red-200 bg-red-50/50 text-xs text-red-600">
        <ImageIcon className="w-4 h-4" />
        <span>የደረሰኝ ፎቶን መጫን አልተቻለም (Unable to load receipt image)</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <img
          src={objectUrl}
          alt={alt}
          onClick={() => setIsZoomed(true)}
          className={`${className} cursor-zoom-in`}
        />
        <button
          type="button"
          onClick={() => setIsZoomed(true)}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors"
          title="ሙሉ መጠን ይመልከቱ (Full Size)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isZoomed && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="self-end mb-2 p-2 rounded-full bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={objectUrl}
              alt={alt}
              className="max-h-[82vh] w-auto max-w-full rounded-2xl object-contain bg-white shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
