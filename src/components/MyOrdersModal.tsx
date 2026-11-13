import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Clock, CheckCircle2, AlertCircle, Upload, RefreshCw, Trash2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { Order } from '../types/index.ts';
import { AuthorizedReceiptImage } from './AuthorizedReceiptImage.tsx';
import {
  validateReceiptFileClient,
  readReceiptFileAsDataUrl,
  formatFileSize,
  SelectedReceiptFile,
} from '../utils/receiptFile.ts';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState<Record<number, SelectedReceiptFile>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<number, string>>({});
  const [uploadingOrderId, setUploadingOrderId] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

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

  const handleSelectReceipt = async (orderId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadErrors((prev) => ({ ...prev, [orderId]: '' }));
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validation = validateReceiptFileClient(file);
    if (!validation.valid) {
      setUploadErrors((prev) => ({
        ...prev,
        [orderId]:
          validation.reason === 'type'
            ? t('receipt.invalidType', 'እባክዎ ትክክለኛ የምስል ፋይል (JPEG, PNG ወይም WebP) ብቻ ይምረጡ።')
            : t('receipt.invalidSize', 'የፋይሉ መጠን ከ5MB መብለጥ የለበትም።'),
      }));
      return;
    }

    try {
      const selected = await readReceiptFileAsDataUrl(file);
      setPendingReceipts((prev) => ({ ...prev, [orderId]: selected }));
    } catch (err: any) {
      setUploadErrors((prev) => ({
        ...prev,
        [orderId]: err?.message || 'Failed to read receipt image.',
      }));
    }
  };

  const handleUploadReceipt = async (orderId: number) => {
    const selected = pendingReceipts[orderId];
    if (!selected || !token) return;

    setUploadingOrderId(orderId);
    setUploadErrors((prev) => ({ ...prev, [orderId]: '' }));
    try {
      const res = await fetch(`/api/orders/${orderId}/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: selected.fileName,
          mimeType: selected.mimeType,
          dataBase64: selected.dataBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload receipt.');
      }

      setPendingReceipts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      await loadOrders();
    } catch (err: any) {
      setUploadErrors((prev) => ({
        ...prev,
        [orderId]: err?.message || 'Could not upload receipt.',
      }));
    } finally {
      setUploadingOrderId(null);
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
            orders.map((o) => {
              const receipt = o.payment_receipt;
              const pendingFile = pendingReceipts[o.id];
              const uploadErr = uploadErrors[o.id];
              const isUploading = uploadingOrderId === o.id;
              const canUploadOrReplace = !receipt || receipt.verification_status !== 'approved';

              return (
                <div key={o.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-3">
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

                  {/* Payment Receipt Status & Upload/Replace */}
                  <div className="border-t border-gray-200 pt-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-gray-700">
                        {t('receipt.sectionTitle', 'የክፍያ ማረጋገጫ ደረሰኝ (Payment Receipt)')}
                      </span>
                      {receipt && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          receipt.verification_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : receipt.verification_status === 'rejected'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {receipt.verification_status === 'approved' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{t('receipt.statusApproved', 'ተረጋግጧል (Approved)')}</span>
                            </>
                          ) : receipt.verification_status === 'rejected' ? (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>{t('receipt.statusRejected', 'ውድቅ ተደርጓል (Rejected)')}</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{t('receipt.statusPending', 'በማረጋገጥ ላይ (Pending Verification)')}</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {receipt && !pendingFile && (
                      <div className="space-y-1.5">
                        <AuthorizedReceiptImage
                          receiptId={receipt.id}
                          token={token}
                          refreshKey={receipt.uploaded_at}
                          alt={`Receipt for ${o.order_number}`}
                          className="w-full max-h-44 object-contain rounded-xl border border-gray-200 bg-white"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500">
                          <span>Uploaded: {new Date(receipt.uploaded_at).toLocaleString()}</span>
                          {receipt.original_filename && <span className="truncate max-w-[180px]">{receipt.original_filename}</span>}
                        </div>
                        {receipt.admin_notes && (
                          <div className={`p-2 rounded-xl text-[11px] border ${
                            receipt.verification_status === 'rejected'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}>
                            <strong>Admin Note:</strong> {receipt.admin_notes}
                          </div>
                        )}
                      </div>
                    )}

                    {uploadErr && (
                      <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{uploadErr}</span>
                      </div>
                    )}

                    {canUploadOrReplace && (
                      <div>
                        <input
                          ref={(el) => {
                            fileInputRefs.current[o.id] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => handleSelectReceipt(o.id, e)}
                          className="hidden"
                        />

                        {pendingFile ? (
                          <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-emerald-900 truncate">
                                {t('receipt.previewTitle', 'የደረሰኝ ቅድመ-እይታ (Preview)')}: {pendingFile.fileName}
                              </span>
                              <span className="text-gray-500 shrink-0">{formatFileSize(pendingFile.fileSize)}</span>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center max-h-44">
                              <img
                                src={pendingFile.previewUrl}
                                alt="Selected receipt preview"
                                className="max-h-44 w-auto object-contain"
                              />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => handleUploadReceipt(o.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{isUploading ? t('receipt.uploading', 'ደረሰኝ በመላክ ላይ...') : t('receipt.submitReceipt', 'ደረሰኝ ላክ (Submit Receipt)')}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => fileInputRefs.current[o.id]?.click()}
                                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{t('receipt.replaceButton', 'ፎቶ ቀይር (Replace)')}</span>
                              </button>
                              <button
                                type="button"
                                disabled={isUploading}
                                onClick={() => {
                                  setPendingReceipts((prev) => {
                                    const next = { ...prev };
                                    delete next[o.id];
                                    return next;
                                  });
                                  setUploadErrors((prev) => ({ ...prev, [o.id]: '' }));
                                }}
                                className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[o.id]?.click()}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
                          >
                            {receipt ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                                <span>{t('receipt.replaceButton', 'ፎቶ ቀይር (Replace)')}</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{t('receipt.uploadButton', 'የክፍያ ደረሰኝ ፎቶ ያስገቡ')}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

