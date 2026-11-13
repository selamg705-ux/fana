import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, Users, Store, Package, ShoppingCart, FolderTree,
  Settings, History, Database, Search, CheckCircle2, AlertTriangle,
  Trash2, UserCheck, UserX, RefreshCw, Eye, Edit, Plus, Power, Key,
  Shield, Check, DollarSign, Clock, FileText, Lock, ChevronRight,
  TrendingUp, MapPin, Phone, Mail, Award, MessageSquare, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  AdminStats, AdminActivityLog, Category, Product, Order,
  DatabaseStatusReport, MarketplaceReport, UserRole
} from '../types/index.ts';
import { AuthorizedReceiptImage } from './AuthorizedReceiptImage.tsx';
import { formatFileSize } from '../utils/receiptFile.ts';

interface SuperAdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshMarketplace: () => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'manage_users', label: 'ተጠቃሚዎችን ማስተዳደር (Manage Users)' },
  { id: 'manage_products', label: 'እቃዎችን ማጽደቅና ማስተዳደር (Approve & Manage Products)' },
  { id: 'manage_orders', label: 'ትዕዛዞችንና ክፍያዎችን መከታተል (Manage Orders & Payments)' },
  { id: 'manage_categories', label: 'ምድቦችን ማስተዳደር (Manage Categories)' },
  { id: 'manage_sellers', label: 'ነጋዴዎችን ማረጋገጥና ማስተዳደር (Verify & Manage Sellers)' },
  { id: 'manage_settings', label: 'የገበያ ቅንብሮች (Marketplace Settings)' },
  { id: 'view_logs', label: 'የአሰራር ታሪክ መመልከት (View Audit Logs)' }
];

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({
  isOpen,
  onClose,
  onRefreshMarketplace
}) => {
  const { token, user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'staff' | 'sellers' | 'products' | 'orders' | 'categories' | 'reports' | 'settings' | 'logs' | 'database'
  >('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [sellersList, setSellersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [reportsList, setReportsList] = useState<MarketplaceReport[]>([]);
  const [logsList, setLogsList] = useState<AdminActivityLog[]>([]);
  const [dbStatus, setDbStatus] = useState<DatabaseStatusReport | null>(null);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productConditionFilter, setProductConditionFilter] = useState('all');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');

  // Modals & Sub-states inside Admin
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<any | null>(null);

  // Staff Modal
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [newStaffFullName, setNewStaffFullName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'staff'>('staff');
  const [newStaffPermissions, setNewStaffPermissions] = useState<string[]>([
    'manage_products', 'manage_orders', 'view_logs'
  ]);
  const [editingStaffPermissions, setEditingStaffPermissions] = useState<any | null>(null);

  // Category Modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryAmharic, setNewCategoryAmharic] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');
  const [newCategoryDisplayOrder, setNewCategoryDisplayOrder] = useState('0');

  // Order Detail & Payment Modal
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [updatingPaymentOrder, setUpdatingPaymentOrder] = useState<Order | null>(null);
  const [paymentStatusInput, setPaymentStatusInput] = useState<'pending' | 'paid' | 'refunded'>('paid');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');
  const [receiptNotesInput, setReceiptNotesInput] = useState('');
  const [isVerifyingReceipt, setIsVerifyingReceipt] = useState(false);

  // Report Resolution Modal
  const [resolvingReport, setResolvingReport] = useState<MarketplaceReport | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'dismissed'>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Product Delete Modal
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);

  // Neon DB Configurator
  const [neonInputUrl, setNeonInputUrl] = useState('');
  const [neonDirectUrl, setNeonDirectUrl] = useState('');
  const [isConfiguringDb, setIsConfiguringDb] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      loadInitialData();
    }
  }, [isOpen, token, activeTab, userRoleFilter, userStatusFilter, productStatusFilter, productConditionFilter, orderStatusFilter, orderPaymentFilter]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4500);
  };

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'overview') {
        const [statsRes, dbRes] = await Promise.all([
          fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/db/status')
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (dbRes.ok) setDbStatus(await dbRes.json());
      } else if (activeTab === 'users') {
        const url = `/api/admin/users?search=${encodeURIComponent(userSearch)}&role=${userRoleFilter}&status=${userStatusFilter}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setUsersList(await res.json());
      } else if (activeTab === 'staff') {
        const res = await fetch('/api/admin/staff', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStaffList(await res.json());
      } else if (activeTab === 'sellers') {
        const res = await fetch('/api/admin/sellers', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setSellersList(await res.json());
      } else if (activeTab === 'products') {
        const url = `/api/admin/products?search=${encodeURIComponent(productSearch)}&status=${productStatusFilter}&condition=${productConditionFilter}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setProductsList(await res.json());
      } else if (activeTab === 'orders') {
        const url = `/api/admin/orders?search=${encodeURIComponent(orderSearch)}&status=${orderStatusFilter}&payment_status=${orderPaymentFilter}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setOrdersList(await res.json());
      } else if (activeTab === 'categories') {
        const res = await fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setCategoriesList(await res.json());
      } else if (activeTab === 'reports') {
        const res = await fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setReportsList(await res.json());
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setSettingsMap(await res.json());
      } else if (activeTab === 'logs') {
        const res = await fetch('/api/admin/logs', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setLogsList(await res.json());
      } else if (activeTab === 'database') {
        const res = await fetch('/api/db/status');
        if (res.ok) setDbStatus(await res.json());
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- USER ACTIONS ----------------
  const viewUserDetails = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not fetch user details');
      const data = await res.json();
      setSelectedUserDetail(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const saveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: editingUser.full_name,
          email: editingUser.email,
          phone: editingUser.phone,
          bio: editingUser.bio
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setEditingUser(null);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleUserStatus = async (userId: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const changeUserRole = async (userId: number, roleName: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roleName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newAdminPassword) return;
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newAdminPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setResetPasswordUser(null);
      setNewAdminPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteUserSafeguard = async () => {
    if (!confirmDeleteUser) return;
    try {
      const res = await fetch(`/api/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setConfirmDeleteUser(null);
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------- STAFF MANAGEMENT ----------------
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: newStaffFullName,
          email: newStaffEmail || null,
          phone: newStaffPhone || null,
          password: newStaffPassword,
          roleName: newStaffRole,
          permissions: newStaffPermissions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setIsCreateStaffOpen(false);
      setNewStaffFullName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffPassword('');
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveStaffPermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffPermissions) return;
    try {
      const res = await fetch(`/api/admin/staff/${editingStaffPermissions.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          permissions: editingStaffPermissions.permissions
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setEditingStaffPermissions(null);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------- SELLER ACTIONS ----------------
  const toggleSellerVerification = async (sellerId: number, currentVerified: boolean) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isVerified: !currentVerified })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------- PRODUCT ACTIONS ----------------
  const updateProductStatus = async (productId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleProductFeatured = async (productId: number, currentFeatured: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/featured`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isFeatured: !currentFeatured })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const deleteProductConfirm = async () => {
    if (!confirmDeleteProduct) return;
    try {
      const res = await fetch(`/api/admin/products/${confirmDeleteProduct.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setConfirmDeleteProduct(null);
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------- ORDER & PAYMENT ACTIONS ----------------
  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingPaymentOrder) return;
    try {
      const res = await fetch(`/api/admin/orders/${updatingPaymentOrder.id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: paymentStatusInput,
          paymentNotes: paymentNotesInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setUpdatingPaymentOrder(null);
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const verifyPaymentReceipt = async (
    receiptId: number,
    verificationStatus: 'approved' | 'rejected' | 'pending',
    notes?: string
  ) => {
    setIsVerifyingReceipt(true);
    try {
      const res = await fetch(`/api/admin/payment-receipts/${receiptId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          verificationStatus,
          adminNotes: notes ?? receiptNotesInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Receipt verification failed');
      showToast(data.message);
      if (selectedOrderDetail && selectedOrderDetail.payment_receipt?.id === receiptId) {
        setSelectedOrderDetail({
          ...selectedOrderDetail,
          payment_status: verificationStatus === 'approved' ? 'paid' : 'pending',
          payment_receipt: data.receipt
        });
      }
      if (updatingPaymentOrder && updatingPaymentOrder.payment_receipt?.id === receiptId) {
        setUpdatingPaymentOrder({
          ...updatingPaymentOrder,
          payment_status: verificationStatus === 'approved' ? 'paid' : 'pending',
          payment_receipt: data.receipt
        });
      }
      setReceiptNotesInput('');
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsVerifyingReceipt(false);
    }
  };

  // ---------------- CATEGORY ACTIONS ----------------
  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName || !newCategorySlug) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          nameAmharic: newCategoryAmharic.trim() || null,
          slug: newCategorySlug.trim().toLowerCase(),
          icon: newCategoryIcon || 'Tag',
          displayOrder: parseInt(newCategoryDisplayOrder, 10) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Category created successfully');
      setNewCategoryName('');
      setNewCategoryAmharic('');
      setNewCategorySlug('');
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const deleteCategorySafe = async (catId: number) => {
    if (!window.confirm('Delete this category? Existing products will be safely detached.')) return;
    try {
      const res = await fetch(`/api/admin/categories/${catId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------- REPORT ACTIONS ----------------
  const handleResolveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingReport) return;
    try {
      const res = await fetch(`/api/admin/reports/${resolvingReport.id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: resolutionStatus,
          resolutionNotes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setResolvingReport(null);
      setResolutionNotes('');
      loadInitialData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------- SETTINGS ACTIONS ----------------
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settingsMap)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ---------------- NEON DB CONFIG ----------------
  const configureNeonDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!neonInputUrl.trim() && !neonDirectUrl.trim()) return;
    setIsConfiguringDb(true);
    try {
      const res = await fetch('/api/db/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseUrl: neonInputUrl.trim() || neonDirectUrl.trim(),
          directUrl: neonDirectUrl.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message);
      setNeonInputUrl('');
      setNeonDirectUrl('');
      loadInitialData();
      onRefreshMarketplace();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsConfiguringDb(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-7xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-purple-200 overflow-hidden my-auto max-h-[96dvh] sm:max-h-[94dvh] min-h-0 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-900 text-white p-3.5 sm:p-5 flex items-start sm:items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-xl font-black tracking-tight break-words">MELA MARKET — SUPER ADMIN PORTAL</h2>
                <span className="inline-block bg-purple-800 text-purple-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Complete Authority
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200 break-words">
                የኢትዮጵያ አስተማማኝ ግብይት ሙሉ መቆጣጠሪያ ማዕከል (Full-Stack Neon PostgreSQL Control Center)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={loadInitialData}
              className="p-2 text-purple-200 hover:text-white hover:bg-purple-800/60 rounded-xl transition-colors"
              title="ሪፍሬሽ (Reload data)"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-purple-200 hover:text-white hover:bg-purple-800/60 rounded-xl transition-colors"
              title="Close Super Admin Portal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Toast message */}
        {actionMessage && (
          <div className={`px-4 py-2.5 text-xs font-bold text-center transition-all flex-shrink-0 ${
            actionMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Navigation Tabs Bar (Wraps cleanly so all 11 sections are always visible on mobile and desktop) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap border-b border-gray-200 bg-gray-50/90 text-[11px] sm:text-xs font-bold flex-shrink-0 max-h-[34dvh] sm:max-h-none overflow-y-auto sm:overflow-visible">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: ShieldCheck },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'staff', label: 'Staff & Admin RBAC', icon: Shield },
            { id: 'products', label: 'Product Control', icon: Package },
            { id: 'orders', label: 'Order & Payments', icon: ShoppingCart },
            { id: 'sellers', label: 'Sellers Hub', icon: Store },
            { id: 'categories', label: 'Categories', icon: FolderTree },
            { id: 'reports', label: 'Reports & Flagged', icon: AlertCircle },
            { id: 'settings', label: 'Marketplace Settings', icon: Settings },
            { id: 'logs', label: 'Audit Activity Logs', icon: History },
            { id: 'database', label: 'Neon Database Status', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 border-b-2 transition-all text-left min-w-0 ${
                  isActive
                    ? 'border-purple-600 text-purple-950 bg-white shadow-xs'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className="leading-tight sm:whitespace-nowrap break-words">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 bg-slate-50/60">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Neon Connection Status Pill Banner */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                dbStatus?.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide">
                      {dbStatus?.connected ? 'Neon PostgreSQL: Connected & Synced' : 'Neon PostgreSQL: Ready for Connection'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {dbStatus?.connected
                        ? `Host: ${dbStatus.host} | DB: ${dbStatus.database} | SSL: Active`
                        : dbStatus?.error || 'Database operations running with memory fallback. Provide DATABASE_URL for Neon.'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('database')}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 shadow-xs"
                >
                  Manage Connection &rarr;
                </button>
              </div>

              {/* Statistics Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-500 break-words">ተጠቃሚዎች (Users)</span>
                    <Users className="w-4 h-4 text-purple-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{stats?.users.total_users || 0}</div>
                  <div className="text-[10px] text-gray-500 break-words">
                    {stats?.users.suspended_users || 0} suspended • {stats?.users.total_customers || 0} buyers
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-500 break-words">ነጋዴዎች (Sellers)</span>
                    <Store className="w-4 h-4 text-amber-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{stats?.sellers.total_sellers || 0}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold break-words">
                    {stats?.sellers.verified_sellers || 0} verified stores
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-500 break-words">እቃዎች (Products)</span>
                    <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{stats?.products.total_products || 0}</div>
                  <div className="text-[10px] text-gray-500 break-words">
                    {stats?.products.new_products || 0} አዲስ • {stats?.products.used_products || 0} ያገለገለ
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-500 break-words">ትዕዛዞች (Orders)</span>
                    <ShoppingCart className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{stats?.orders.total_orders || 0}</div>
                  <div className="text-[10px] text-amber-600 font-semibold break-words">
                    {stats?.orders.pending_orders || 0} pending fulfillment
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-500 break-words">ጠቅላላ ገቢ (Sales)</span>
                    <DollarSign className="w-4 h-4 text-emerald-700 shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 break-words">
                    {Number(stats?.orders.total_revenue || 0).toLocaleString()} <span className="text-xs">ETB</span>
                  </div>
                  <div className="text-[10px] text-gray-500">Gross marketplace volume</div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-500 break-words">ምድቦች (Categories)</span>
                    <FolderTree className="w-4 h-4 text-indigo-600 shrink-0" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{stats?.categories?.total_categories || 8}</div>
                  <div className="text-[10px] text-purple-600 font-semibold break-words">
                    {stats?.users.total_admins || 1} Admins • {stats?.users.total_staff || 0} Staff
                  </div>
                </div>
              </div>

              {/* Status Breakdown Strips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Orders Fulfillment Distribution */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3 min-w-0">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between gap-2">
                    <span className="break-words">የተጠቃሚዎች ትዕዛዝ ሁኔታ (Order Status Breakdown)</span>
                    <ShoppingCart className="w-4 h-4 text-gray-400 shrink-0" />
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 min-w-0">
                      <div className="text-lg font-black text-amber-700">{stats?.orders.pending_orders || 0}</div>
                      <div className="text-[10px] text-amber-800 font-bold break-words">በመጠባበቅ (Pending)</div>
                    </div>
                    <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 min-w-0">
                      <div className="text-lg font-black text-blue-700">{stats?.orders.processing_orders || 0}</div>
                      <div className="text-[10px] text-blue-800 font-bold break-words">በሂደት (Processing)</div>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 min-w-0">
                      <div className="text-lg font-black text-emerald-700">{stats?.orders.completed_orders || 0}</div>
                      <div className="text-[10px] text-emerald-800 font-bold break-words">የተጠናቀቀ (Delivered)</div>
                    </div>
                    <div className="bg-gray-100 p-2.5 rounded-xl border border-gray-200 min-w-0">
                      <div className="text-lg font-black text-gray-700">{stats?.orders.cancelled_orders || 0}</div>
                      <div className="text-[10px] text-gray-600 font-bold break-words">የተሰረዘ (Cancelled)</div>
                    </div>
                  </div>
                </div>

                {/* Products Moderation Status */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3 min-w-0">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between gap-2">
                    <span className="break-words">የእቃዎች ሁኔታ (Product Moderation Pipeline)</span>
                    <Package className="w-4 h-4 text-gray-400 shrink-0" />
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 min-w-0">
                      <div className="text-lg font-black text-emerald-700">{stats?.products.approved_products || stats?.products.total_products || 0}</div>
                      <div className="text-[10px] text-emerald-800 font-bold break-words">የጸደቀ (Active)</div>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 min-w-0">
                      <div className="text-lg font-black text-amber-700">{stats?.products.pending_moderation || 0}</div>
                      <div className="text-[10px] text-amber-800 font-bold break-words">ለማጽደቅ (Pending)</div>
                    </div>
                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-100 min-w-0">
                      <div className="text-lg font-black text-red-700">{stats?.products.suspended_products || 0}</div>
                      <div className="text-[10px] text-red-800 font-bold break-words">የታገደ (Suspended)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Admin Actions Row */}
              <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-purple-950 font-bold text-xs">
                  <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0" />
                  <span>ፈጣን የአስተዳዳሪ እርምጃዎች (Quick Admin Shortcuts)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => { setActiveTab('staff'); setIsCreateStaffOpen(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>አዲስ ሰራተኛ ጨምር (Add Staff)</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('products'); setProductStatusFilter('pending'); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>ያልጸደቁ እቃዎችን ተመልከት (Review Pending)</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('categories')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs shadow-xs active:scale-95 transition-all"
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>ምድብ ጨምር (Add Category)</span>
                  </button>
                </div>
              </div>

              {/* Recent Live Activity Stream */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>የቅርብ ጊዜ የአስተዳዳሪ እንቅስቃሴዎች (Recent Admin Activities)</span>
                  </h4>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className="text-xs font-bold text-purple-700 hover:underline shrink-0"
                  >
                    View All Logs &rarr;
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {(stats?.recentActivities || []).slice(0, 5).map((log) => (
                    <div key={log.id} className="py-2.5 flex items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1 sm:mt-0" />
                        <div className="min-w-0 break-words">
                          <span className="font-bold text-gray-900">{log.admin_name || 'Super Admin'}</span>
                          <span className="text-gray-500 ml-2">{log.details}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
                    <div className="py-4 text-center text-xs text-gray-400">
                      የቅርብ ጊዜ እንቅስቃሴ የለም (No recent activity recorded)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Filters & Search */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadInitialData()}
                    placeholder="በስም፣ ኢሜል ወይም ስልክ ፈልግ..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:bg-white focus:border-purple-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-gray-50 text-gray-700"
                  >
                    <option value="all">ሁሉም ሚና (All Roles)</option>
                    <option value="user">ተጠቃሚ (User)</option>
                    <option value="admin">አስተዳዳሪ (Admin)</option>
                    <option value="customer">ደንበኛ (Customer)</option>
                    <option value="seller">ሻጭ (Seller)</option>
                    <option value="staff">ሰራተኛ (Staff)</option>
                    <option value="superadmin">ሱፐር አድሚን (Super Admin)</option>
                  </select>
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-gray-50 text-gray-700"
                  >
                    <option value="all">ሁሉም ሁኔታ (All Status)</option>
                    <option value="active">ንቁ (Active)</option>
                    <option value="suspended">የታገደ (Suspended)</option>
                  </select>
                  <button
                    onClick={loadInitialData}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                  >
                    ፈልግ (Filter)
                  </button>
                </div>
              </div>

              {/* Users Mobile & Tablet Card View (all controls visible without horizontal clipping) */}
              <div className="lg:hidden space-y-3">
                {usersList.map((u) => (
                  <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-900 font-bold flex items-center justify-center shrink-0">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-xs break-words">{u.full_name}</div>
                          <div className="text-[11px] text-gray-500 break-all">{u.email || u.phone || 'No direct contact'}</div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={u.role_name || 'customer'}
                          onChange={(e) => changeUserRole(u.id, e.target.value)}
                          disabled={u.id === currentUser?.id}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                            u.role_name === 'superadmin'
                              ? 'bg-purple-100 border-purple-200 text-purple-900 font-black'
                              : u.role_name === 'admin'
                              ? 'bg-indigo-100 border-indigo-200 text-indigo-900'
                              : u.role_name === 'staff'
                              ? 'bg-blue-100 border-blue-200 text-blue-900'
                              : u.role_name === 'seller'
                              ? 'bg-amber-100 border-amber-200 text-amber-900'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          }`}
                        >
                          <option value="customer">Customer</option>
                          <option value="seller">Seller</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          (u.db_role || 'user') === 'admin'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          role: {u.db_role || 'user'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()} • {u.total_products || 0} products • {u.total_orders || 0} orders
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => viewUserDetails(u.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setResetPasswordUser(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Password</span>
                      </button>
                      <button
                        onClick={() => toggleUserStatus(u.id, u.is_active)}
                        disabled={u.id === currentUser?.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-colors disabled:opacity-40 ${
                          u.is_active
                            ? 'text-red-600 bg-red-50 hover:bg-red-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{u.is_active ? 'Suspend' : 'Activate'}</span>
                      </button>
                      <button
                        onClick={() => setConfirmDeleteUser(u)}
                        disabled={u.id === currentUser?.id || u.role_name === 'superadmin'}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
                {usersList.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-500">
                    የተገኘ ተጠቃሚ የለም (No users match current filters)
                  </div>
                )}
              </div>

              {/* Users Desktop Table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">ተጠቃሚ (User / Contact)</th>
                        <th className="p-3.5">ሚና (Role)</th>
                        <th className="p-3.5">ሁኔታ (Status)</th>
                        <th className="p-3.5">ምዝገባ (Registered)</th>
                        <th className="p-3.5">ስታቲስቲክስ (Stats)</th>
                        <th className="p-3.5 text-right">እርምጃዎች (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-900 font-bold flex items-center justify-center flex-shrink-0">
                                {u.full_name?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 break-words">{u.full_name}</div>
                                <div className="text-[11px] text-gray-500 break-all">{u.email || u.phone || 'No direct contact'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-col gap-1 items-start">
                              <select
                                value={u.role_name || 'customer'}
                                onChange={(e) => changeUserRole(u.id, e.target.value)}
                                disabled={u.id === currentUser?.id}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  u.role_name === 'superadmin'
                                    ? 'bg-purple-100 border-purple-200 text-purple-900 font-black'
                                    : u.role_name === 'admin'
                                    ? 'bg-indigo-100 border-indigo-200 text-indigo-900'
                                    : u.role_name === 'staff'
                                    ? 'bg-blue-100 border-blue-200 text-blue-900'
                                    : u.role_name === 'seller'
                                    ? 'bg-amber-100 border-amber-200 text-amber-900'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                }`}
                              >
                                <option value="customer">Customer</option>
                                <option value="seller">Seller</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                                <option value="superadmin">Super Admin</option>
                              </select>
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                (u.db_role || 'user') === 'admin'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                role: {u.db_role || 'user'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {u.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-500 text-[11px]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-gray-600 text-[11px]">
                            <div>{u.total_products || 0} products</div>
                            <div className="text-gray-400">{u.total_orders || 0} orders</div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => viewUserDetails(u.id)}
                                title="ዝርዝር ይመልከቱ (View details & history)"
                                className="p-1.5 text-gray-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingUser(u)}
                                title="መረጃ አርትዕ (Edit user information)"
                                className="p-1.5 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setResetPasswordUser(u)}
                                title="የይለፍ ቃል ቀይር (Reset password)"
                                className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleUserStatus(u.id, u.is_active)}
                                disabled={u.id === currentUser?.id}
                                title={u.is_active ? 'አግድ (Suspend account)' : 'አንቃ (Activate account)'}
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                                  u.is_active
                                    ? 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteUser(u)}
                                disabled={u.id === currentUser?.id || u.role_name === 'superadmin'}
                                title="መለያ ሰርዝ (Delete account safely)"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {usersList.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500">
                      የተገኘ ተጠቃሚ የለም (No users match current filters)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STAFF & ADMIN RBAC */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-gray-900">የአስተዳዳሪ እና የሰራተኞች ፈቃድ ቁጥጥር (Staff & Admin RBAC)</h3>
                  <p className="text-xs text-gray-500">
                    Delegate operational responsibilities with custom granular permissions.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateStaffOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>አዲስ ሰራተኛ / አድሚን ጨምር</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffList.map((st) => (
                  <div key={st.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 font-black flex items-center justify-center shrink-0">
                          {st.full_name?.charAt(0) || 'A'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-xs sm:text-sm break-words">{st.full_name}</div>
                          <div className="text-[11px] text-gray-500 break-all">{st.email || st.phone}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        st.role_name === 'superadmin'
                          ? 'bg-purple-100 text-purple-900 font-black'
                          : st.role_name === 'admin'
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}>
                        {st.role_name}
                      </span>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-1.5">የተሰጡ ፈቃዶች (Permissions):</div>
                      <div className="flex flex-wrap gap-1">
                        {st.role_name === 'superadmin' ? (
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            ⭐ All System Permissions Granted
                          </span>
                        ) : (st.permissions && st.permissions.length > 0) ? (
                          st.permissions.map((p: string) => (
                            <span key={p} className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                              {p.replace('manage_', '')}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-gray-400">No delegated permissions</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        st.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {st.is_active ? 'Active' : 'Suspended'}
                      </span>
                      {st.role_name !== 'superadmin' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setEditingStaffPermissions({ ...st, permissions: st.permissions || [] })}
                            className="text-xs font-bold text-purple-700 hover:underline"
                          >
                            Edit Permissions
                          </button>
                          <button
                            onClick={() => toggleUserStatus(st.id, st.is_active)}
                            className="text-xs font-bold text-red-600 hover:underline"
                          >
                            {st.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PRODUCT MANAGEMENT */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadInitialData()}
                    placeholder="የእቃውን ስም ፈልግ..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:bg-white focus:border-purple-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={productStatusFilter}
                    onChange={(e) => setProductStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-gray-50 text-gray-700"
                  >
                    <option value="all">ሁሉም ሁኔታ (All Statuses)</option>
                    <option value="pending">ለማጽደቅ የቀረበ (Pending)</option>
                    <option value="approved">የጸደቀ (Approved)</option>
                    <option value="rejected">ተቀባይነት ያላገኘ (Rejected)</option>
                    <option value="suspended">የታገደ (Suspended)</option>
                  </select>
                  <select
                    value={productConditionFilter}
                    onChange={(e) => setProductConditionFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-gray-50 text-gray-700"
                  >
                    <option value="all">ሁሉም እቃ (All Condition)</option>
                    <option value="new">አዲስ እቃ (New)</option>
                    <option value="used">ያገለገለ እቃ (Used)</option>
                  </select>
                  <button
                    onClick={loadInitialData}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                  >
                    ፈልግ (Filter)
                  </button>
                </div>
              </div>

              {/* Products Mobile & Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {productsList.map((p) => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={p.primary_image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=150&q=80'}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900 text-xs break-words">{p.title_amharic || p.title}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{p.category_name_amharic || p.category_name}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="font-bold text-emerald-800 text-xs">{Number(p.price).toLocaleString()} ETB</span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.condition === 'new' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.condition === 'new' ? 'አዲስ (New)' : 'ያገለገለ (Used)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-600 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                      <span className="font-semibold text-gray-800">{p.store_name || 'Individual Seller'}</span>
                      <span className="text-gray-400"> • {p.region}, {p.city}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                      <select
                        value={p.status}
                        onChange={(e) => updateProductStatus(p.id, e.target.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                          p.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : p.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                      </select>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleProductFeatured(p.id, p.is_featured)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                            p.is_featured ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-gray-600 bg-gray-100 hover:text-amber-600'
                          }`}
                        >
                          <span>⭐</span>
                          <span>{p.is_featured ? 'Featured' : 'Feature'}</span>
                        </button>
                        <button
                          onClick={() => setConfirmDeleteProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {productsList.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-500">
                    የተገኘ እቃ የለም (No products match current filters)
                  </div>
                )}
              </div>

              {/* Products Desktop Table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">እቃ (Product Title)</th>
                        <th className="p-3.5">ዋጋ (Price)</th>
                        <th className="p-3.5">ሁኔታ (Condition)</th>
                        <th className="p-3.5">ሻጭ / ቦታ (Seller / Location)</th>
                        <th className="p-3.5">የማጽደቅ ሁኔታ (Status)</th>
                        <th className="p-3.5 text-right">እርምጃዎች (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {productsList.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.primary_image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=150&q=80'}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover border border-gray-100 flex-shrink-0"
                              />
                              <div>
                                <div className="font-bold text-gray-900 line-clamp-1 max-w-[240px]">
                                  {p.title_amharic || p.title}
                                </div>
                                <div className="text-[10px] text-gray-500">{p.category_name_amharic || p.category_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-emerald-800">
                            {Number(p.price).toLocaleString()} ETB
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.condition === 'new' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.condition === 'new' ? 'አዲስ (New)' : 'ያገለገለ (Used)'}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-600">
                            <div className="font-semibold text-gray-800 line-clamp-1">{p.store_name || 'Individual Seller'}</div>
                            <div className="text-[10px] text-gray-400">{p.region}, {p.city}</div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={p.status}
                              onChange={(e) => updateProductStatus(p.id, e.target.value)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                p.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : p.status === 'pending'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-red-50 text-red-800 border-red-200'
                              }`}
                            >
                              <option value="approved">Approved</option>
                              <option value="pending">Pending</option>
                              <option value="rejected">Rejected</option>
                              <option value="suspended">Suspended</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => toggleProductFeatured(p.id, p.is_featured)}
                                title={p.is_featured ? 'ልዩ እቃ አንሳ' : 'ልዩ እቃ አድርግ'}
                                className={`p-1.5 rounded-lg text-xs font-bold ${
                                  p.is_featured ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-amber-600'
                                }`}
                              >
                                ⭐
                              </button>
                              <button
                                onClick={() => setConfirmDeleteProduct(p)}
                                title="Delete product permanently"
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {productsList.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500">
                      የተገኘ እቃ የለም (No products match current filters)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ORDERS, PAYMENTS & DELIVERY */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadInitialData()}
                    placeholder="የትእዛዝ ቁጥር ወይም የደንበኛ ስም..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:bg-white focus:border-purple-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-gray-50 text-gray-700"
                  >
                    <option value="all">ሁሉም ትዕዛዝ (All Orders)</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={orderPaymentFilter}
                    onChange={(e) => setOrderPaymentFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-gray-50 text-gray-700"
                  >
                    <option value="all">ሁሉም ክፍያ (All Payments)</option>
                    <option value="pending">Pending Payment</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <button
                    onClick={loadInitialData}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                  >
                    ፈልግ (Filter)
                  </button>
                </div>
              </div>

              {/* Orders Mobile & Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {ordersList.map((ord) => (
                  <div key={ord.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-purple-950 text-xs">{ord.order_number}</span>
                        <div className="text-[10px] text-gray-400">{new Date(ord.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="font-bold text-gray-900 text-xs">{Number(ord.total_amount).toLocaleString()} ETB</div>
                    </div>

                    <div className="text-xs space-y-1 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                      <div className="font-bold text-gray-900">{ord.customer_name || 'Customer'} <span className="text-emerald-700 font-mono font-normal">({ord.phone})</span></div>
                      <div className="text-[11px] text-gray-600 break-words">{ord.shipping_address}, {ord.shipping_city || 'Ethiopia'}</div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setUpdatingPaymentOrder(ord);
                            setPaymentStatusInput(ord.payment_status || 'paid');
                            setPaymentNotesInput(ord.payment_notes || '');
                          }}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            ord.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : ord.payment_status === 'refunded'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {ord.payment_status || 'pending'} ({ord.payment_method}) ✏️
                        </button>
                        <select
                          value={ord.status}
                          onChange={(e) => updateOrderStatus(ord.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-200 bg-gray-50 text-gray-800"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Dispatched / Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {ord.payment_receipt && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptNotesInput(ord.payment_receipt?.admin_notes || '');
                              setSelectedOrderDetail(ord);
                            }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              ord.payment_receipt.verification_status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : ord.payment_receipt.verification_status === 'rejected'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            ደረሰኝ: {ord.payment_receipt.verification_status}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setReceiptNotesInput(ord.payment_receipt?.admin_notes || '');
                          setSelectedOrderDetail(ord);
                        }}
                        className="text-xs font-bold text-purple-700 hover:underline"
                      >
                        View Items ({ord.items?.length || 1})
                      </button>
                    </div>
                  </div>
                ))}
                {ordersList.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-500">
                    የተገኘ ትዕዛዝ የለም (No orders recorded)
                  </div>
                )}
              </div>

              {/* Orders Desktop Table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">ትዕዛዝ ቁጥር (Order #)</th>
                        <th className="p-3.5">ደንበኛ (Customer / Phone)</th>
                        <th className="p-3.5">መዳረሻ (Delivery Address)</th>
                        <th className="p-3.5">ጠቅላላ ሂሳብ (Total)</th>
                        <th className="p-3.5">ክፍያ (Payment)</th>
                        <th className="p-3.5">የትዕዛዝ ሁኔታ (Order Status)</th>
                        <th className="p-3.5 text-right">እርምጃዎች (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ordersList.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-purple-950">{ord.order_number}</span>
                            <div className="text-[10px] text-gray-400">
                              {new Date(ord.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-gray-900">{ord.customer_name || 'Customer'}</div>
                            <div className="text-[11px] text-emerald-700 font-mono">{ord.phone}</div>
                          </td>
                          <td className="p-3.5 max-w-[200px]">
                            <div className="text-gray-800 line-clamp-1">{ord.shipping_address}</div>
                            <div className="text-[10px] text-gray-400">{ord.shipping_city || 'Ethiopia'}</div>
                          </td>
                          <td className="p-3.5 font-bold text-gray-900">
                            {Number(ord.total_amount).toLocaleString()} ETB
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-col items-start gap-1">
                              <button
                                onClick={() => {
                                  setUpdatingPaymentOrder(ord);
                                  setPaymentStatusInput(ord.payment_status || 'paid');
                                  setPaymentNotesInput(ord.payment_notes || '');
                                }}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  ord.payment_status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : ord.payment_status === 'refunded'
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200'
                                }`}
                              >
                                {ord.payment_status || 'pending'} ({ord.payment_method}) ✏️
                              </button>
                              {ord.payment_receipt && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReceiptNotesInput(ord.payment_receipt?.admin_notes || '');
                                    setSelectedOrderDetail(ord);
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    ord.payment_receipt.verification_status === 'approved'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : ord.payment_receipt.verification_status === 'rejected'
                                      ? 'bg-red-50 text-red-800 border-red-200'
                                      : 'bg-purple-50 text-purple-800 border-purple-200'
                                  }`}
                                >
                                  Receipt: {ord.payment_receipt.verification_status}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={ord.status}
                              onChange={(e) => updateOrderStatus(ord.id, e.target.value)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-200 bg-gray-50 text-gray-800"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Dispatched / Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setReceiptNotesInput(ord.payment_receipt?.admin_notes || '');
                                setSelectedOrderDetail(ord);
                              }}
                              className="text-xs font-bold text-purple-700 hover:underline"
                            >
                              View Items ({ord.items?.length || 1})
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ordersList.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500">
                      የተገኘ ትዕዛዝ የለም (No orders recorded)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SELLERS HUB */}
          {activeTab === 'sellers' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-gray-900">የተመዘገቡ የንግድ መደብሮች (Registered Merchants & Stores)</h3>
                  <p className="text-xs text-gray-500">
                    Verify seller badges, view customer ratings, and track business metrics across Ethiopian regions.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellersList.map((sel) => (
                  <div key={sel.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 font-black flex items-center justify-center shrink-0">
                          <Store className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-xs sm:text-sm break-words">{sel.store_name}</div>
                          <div className="text-[11px] text-gray-500 break-words">{sel.owner_name} • {sel.business_phone || sel.owner_phone}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        sel.is_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {sel.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-100 text-center">
                      <div>
                        <div className="text-xs font-black text-gray-900">{sel.total_products || 0}</div>
                        <div className="text-[10px] text-gray-500">Products</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-700">{sel.rating || 5.0} ⭐</div>
                        <div className="text-[10px] text-gray-500">Rating</div>
                      </div>
                      <div>
                        <div className="text-xs font-black text-purple-950">{sel.total_sales || 0}</div>
                        <div className="text-[10px] text-gray-500">Sales</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => toggleSellerVerification(sel.id, sel.is_verified)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          sel.is_verified
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'bg-emerald-700 text-white hover:bg-emerald-800'
                        }`}
                      >
                        {sel.is_verified ? 'Remove Verification' : 'Grant Verified Badge'}
                      </button>
                      <button
                        onClick={() => toggleUserStatus(sel.user_id, sel.user_active)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        {sel.user_active ? 'Suspend Store' : 'Restore Store'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Add New Category Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-700" />
                  <span>አዲስ ምድብ ጨምር (Create New Category)</span>
                </h3>
                <form onSubmit={createCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">ስም (English Name)</label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Leather Crafts"
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:bg-white focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">ስም በአማርኛ (Amharic Name)</label>
                    <input
                      type="text"
                      value={newCategoryAmharic}
                      onChange={(e) => setNewCategoryAmharic(e.target.value)}
                      placeholder="ለምሳሌ፡ የቆዳ ውጤቶች"
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:bg-white focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Slug URL</label>
                    <input
                      type="text"
                      required
                      value={newCategorySlug}
                      onChange={(e) => setNewCategorySlug(e.target.value)}
                      placeholder="e.g. leather-crafts"
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:bg-white focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={newCategoryDisplayOrder}
                      onChange={(e) => setNewCategoryDisplayOrder(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 text-xs focus:bg-white focus:border-purple-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all"
                    >
                      ምድብ ፍጠር (Create)
                    </button>
                  </div>
                </form>
              </div>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoriesList.map((cat) => (
                  <div key={cat.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-2 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-xs sm:text-sm break-words">{cat.name_amharic || cat.name}</div>
                        <div className="text-[11px] text-gray-500 break-words">{cat.name} ({cat.slug})</div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 shrink-0">
                        {cat.product_count || 0} items
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400">Order #{cat.display_order}</span>
                      <button
                        onClick={() => deleteCategorySafe(cat.id)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: REPORTS & MODERATION */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-gray-900">የተጠቃሚዎች ቅሬታና ሪፖርቶች (Reports & Moderation)</h3>
                  <p className="text-xs text-gray-500">
                    Review reported listings, counterfeit complaints, and inappropriate content.
                  </p>
                </div>
              </div>

              {/* Reports Mobile & Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {reportsList.map((rep) => (
                  <div key={rep.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 text-xs break-words">{rep.target_title || `ID: ${rep.target_id}`}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-mono">{rep.target_type}</div>
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        rep.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rep.status === 'dismissed'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                    <div className="text-xs bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 space-y-1">
                      <div className="font-semibold text-gray-800 break-words">{rep.reason}</div>
                      {rep.description && <div className="text-[11px] text-gray-500 break-words">{rep.description}</div>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
                      <div className="text-[11px] text-gray-500">
                        {rep.reporter_name || 'Anonymous'} • {new Date(rep.created_at).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => {
                          setResolvingReport(rep);
                          setResolutionStatus(rep.status === 'pending' ? 'resolved' : rep.status);
                          setResolutionNotes(rep.resolution_notes || '');
                        }}
                        className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold"
                      >
                        Resolve / Act
                      </button>
                    </div>
                  </div>
                ))}
                {reportsList.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-500">
                    ምንም ቅሬታ አልተመዘገበም (No reports filed)
                  </div>
                )}
              </div>

              {/* Reports Desktop Table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">ሪፖርት የተደረገ (Target)</th>
                        <th className="p-3.5">ምክንያት (Reason)</th>
                        <th className="p-3.5">አመልካች (Reporter)</th>
                        <th className="p-3.5">ሁኔታ (Status)</th>
                        <th className="p-3.5">ቀን (Date)</th>
                        <th className="p-3.5 text-right">እርምጃዎች (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportsList.map((rep) => (
                        <tr key={rep.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <span className="font-bold text-gray-900">{rep.target_title || `ID: ${rep.target_id}`}</span>
                            <div className="text-[10px] text-gray-400 uppercase font-mono">{rep.target_type}</div>
                          </td>
                          <td className="p-3.5 max-w-[250px]">
                            <div className="font-semibold text-gray-800">{rep.reason}</div>
                            {rep.description && (
                              <div className="text-[11px] text-gray-500 line-clamp-1">{rep.description}</div>
                            )}
                          </td>
                          <td className="p-3.5 text-gray-600">
                            <div>{rep.reporter_name || 'Anonymous'}</div>
                            <div className="text-[10px] text-gray-400">{rep.reporter_contact || 'No contact'}</div>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              rep.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rep.status === 'dismissed'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {rep.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-400 text-[11px]">
                            {new Date(rep.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => {
                                setResolvingReport(rep);
                                setResolutionStatus(rep.status === 'pending' ? 'resolved' : rep.status);
                                setResolutionNotes(rep.resolution_notes || '');
                              }}
                              className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-xs font-bold"
                            >
                              Resolve / Act
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportsList.length === 0 && (
                    <div className="p-8 text-center text-xs text-gray-500">
                      ምንም ቅሬታ አልተመዘገበም (No reports filed)
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: MARKETPLACE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-xs w-full max-w-3xl space-y-5">
              <div>
                <h3 className="text-sm font-black text-gray-900">የመላ ማርኬት አጠቃላይ ቅንብሮች (Marketplace Configuration)</h3>
                <p className="text-xs text-gray-500">
                  Manage branding, announcements, and customer hotlines saved directly in Neon PostgreSQL.
                </p>
              </div>

              <form onSubmit={saveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">የገበያው ስም (Site Name)</label>
                  <input
                    type="text"
                    value={settingsMap.site_name || 'Mela Market | መላ ማርኬት'}
                    onChange={(e) => setSettingsMap({ ...settingsMap, site_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      የደንበኞች አገልግሎት ስልክ (Support Hotline)
                    </label>
                    <input
                      type="text"
                      value={settingsMap.contact_phone || '0904503245'}
                      onChange={(e) => setSettingsMap({ ...settingsMap, contact_phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      የዋትስአፕ ተጠቃሚ ስም (WhatsApp Handle)
                    </label>
                    <input
                      type="text"
                      value={settingsMap.contact_whatsapp || '@brmiki21'}
                      onChange={(e) => setSettingsMap({ ...settingsMap, contact_whatsapp: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">ኦፊሴላዊ ኢሜል (Official Email)</label>
                  <input
                    type="email"
                    value={settingsMap.contact_email || 'support@melamarket.et'}
                    onChange={(e) => setSettingsMap({ ...settingsMap, contact_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    የማስታወቂያ ሰሌዳ (Top Announcement Banner)
                  </label>
                  <textarea
                    rows={2}
                    value={settingsMap.announcement || ''}
                    onChange={(e) => setSettingsMap({ ...settingsMap, announcement: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-gray-900"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                  >
                    ቅንብሮችን አስቀምጥ (Save Settings in Neon)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 10: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-gray-900">የአስተዳዳሪ የስራ እንቅስቃሴ መዝገብ (Activity Audit Logs)</h3>
                  <p className="text-xs text-gray-500">
                    Immutable security audit trail recording administrative logins, role changes, and database operations.
                  </p>
                </div>
                <button
                  onClick={loadInitialData}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 shrink-0 self-start sm:self-auto"
                >
                  Refresh Logs
                </button>
              </div>

              {/* Audit Logs Mobile & Tablet Card View */}
              <div className="lg:hidden space-y-2.5">
                {logsList.map((log) => (
                  <div key={log.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-purple-950">{log.admin_name || 'System'}</span>
                      <span className="font-mono text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-bold break-all">
                        {log.action}
                      </span>
                    </div>
                    <div className="text-gray-700 break-words">{log.details}</div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-100">
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      <span>IP: {log.ip_address || 'local'}</span>
                    </div>
                  </div>
                ))}
                {logsList.length === 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-gray-500">
                    No activity logs recorded yet.
                  </div>
                )}
              </div>

              {/* Audit Logs Desktop Table */}
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black border-b border-gray-100">
                      <tr>
                        <th className="p-3.5">ቀን እና ሰዓት (Timestamp)</th>
                        <th className="p-3.5">አስተዳዳሪ (Admin)</th>
                        <th className="p-3.5">ድርጊት (Action)</th>
                        <th className="p-3.5">ዝርዝር (Details)</th>
                        <th className="p-3.5">የአይፒ አድራሻ (IP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logsList.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-mono text-gray-500 text-[11px] whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-bold text-purple-950">
                            {log.admin_name || 'System'}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-bold break-all">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5 text-gray-700 max-w-[320px] break-words">
                            {log.details}
                          </td>
                          <td className="p-3.5 text-gray-400 font-mono text-[11px] break-all">
                            {log.ip_address || 'local'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 11: NEON DATABASE STATUS */}
          {activeTab === 'database' && (
            <div className="space-y-6 w-full max-w-4xl">
              <div className={`p-4 sm:p-6 rounded-3xl border shadow-xs space-y-4 ${
                dbStatus?.connected
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-amber-50/70 border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full shrink-0 ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-gray-900">
                      {dbStatus?.connected ? 'Neon PostgreSQL: Connected & Synced' : 'Neon PostgreSQL: Awaiting Configuration'}
                    </h3>
                    <p className="text-xs text-gray-600">
                      Real-time database diagnostics for Mela Market.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-gray-200/60 min-w-0">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Host</div>
                    <div className="text-xs font-mono font-bold text-gray-800 truncate">{dbStatus?.host || 'ep-placeholder.neon.tech'}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200/60 min-w-0">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Database</div>
                    <div className="text-xs font-mono font-bold text-gray-800 truncate">{dbStatus?.database || 'neondb'}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200/60 min-w-0">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">SSL Mode</div>
                    <div className="text-xs font-mono font-bold text-emerald-700">require (SSL)</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200/60 min-w-0">
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Postgres Version</div>
                    <div className="text-xs font-mono font-bold text-gray-800 truncate">{dbStatus?.version ? 'PostgreSQL 16' : 'PostgreSQL'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-gray-200/60 text-[11px] min-w-0">
                    <span className="font-bold text-gray-700 block">DATABASE_URL:</span>
                    <span className="font-mono text-gray-600 block break-all">{dbStatus?.databaseUrlMasked || 'Awaiting connection string'}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-gray-200/60 text-[11px] min-w-0">
                    <span className="font-bold text-gray-700 block">DIRECT_URL:</span>
                    <span className="font-mono text-gray-600 block break-all">
                      {dbStatus?.directUrlMasked || (dbStatus?.directUrlConfigured ? 'Configured' : 'Using DATABASE_URL')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Connection String Input */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div>
                  <h4 className="text-sm font-black text-gray-900">Connect to Neon PostgreSQL Instance</h4>
                  <p className="text-xs text-gray-500">
                    Configure your Neon connection string. Neon access runs exclusively backend-only with SSL encryption.
                  </p>
                </div>

                <form onSubmit={configureNeonDb} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      DATABASE_URL (Pooled Connection)
                    </label>
                    <input
                      type="password"
                      value={neonInputUrl}
                      onChange={(e) => setNeonInputUrl(e.target.value)}
                      placeholder="postgres://user:password@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require"
                      className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:bg-white focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      DIRECT_URL (Direct / Unpooled Connection — Recommended for Migrations & DDL)
                    </label>
                    <input
                      type="password"
                      value={neonDirectUrl}
                      onChange={(e) => setNeonDirectUrl(e.target.value)}
                      placeholder="postgres://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require (optional)"
                      className="w-full px-3.5 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono text-gray-900 focus:bg-white focus:border-purple-500"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-gray-400">
                      Credentials are kept securely backend-only and persisted to .env.
                    </span>
                    <button
                      type="submit"
                      disabled={isConfiguringDb}
                      className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                    >
                      {isConfiguringDb ? 'Connecting & Migrating...' : 'Connect & Sync Neon'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ---------------- SUB-MODALS ---------------- */}

      {/* 1. User Detail Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl border border-purple-100 max-h-[90dvh] overflow-y-auto space-y-4 my-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 font-black text-lg flex items-center justify-center shrink-0">
                  {selectedUserDetail.user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-gray-900 break-words">{selectedUserDetail.user?.full_name}</h3>
                  <p className="text-xs text-gray-500 break-all">{selectedUserDetail.user?.email || selectedUserDetail.user?.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUserDetail(null)} className="p-2 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-2xl text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Role</span>
                <span className="font-bold uppercase text-purple-900">
                  {selectedUserDetail.user?.db_role || 'user'} ({selectedUserDetail.user?.role_name})
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Status</span>
                <span className={`font-bold ${selectedUserDetail.user?.is_active ? 'text-emerald-700' : 'text-red-700'}`}>
                  {selectedUserDetail.user?.is_active ? 'Active' : 'Suspended'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Joined</span>
                <span className="font-bold text-gray-700">{new Date(selectedUserDetail.user?.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* User's Listed Products */}
            {selectedUserDetail.products && selectedUserDetail.products.length > 0 && (
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
                  የተዘረዘሩ እቃዎች ({selectedUserDetail.products.length} Products)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedUserDetail.products.map((p: any) => (
                    <div key={p.id} className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between gap-2 text-xs">
                      <div className="font-bold text-gray-800 line-clamp-1 min-w-0">{p.title}</div>
                      <span className="font-bold text-emerald-800 shrink-0">{Number(p.price).toLocaleString()} ETB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User's Order History */}
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
                የትዕዛዝ ታሪክ ({selectedUserDetail.orders?.length || 0} Orders)
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedUserDetail.orders?.map((o: any) => (
                  <div key={o.id} className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-purple-950 font-mono">{o.order_number}</span>
                      <span className="text-gray-400 ml-2">({o.status})</span>
                    </div>
                    <span className="font-bold text-gray-900 shrink-0">{Number(o.total_amount).toLocaleString()} ETB</span>
                  </div>
                ))}
                {(!selectedUserDetail.orders || selectedUserDetail.orders.length === 0) && (
                  <div className="text-xs text-gray-400 italic">No orders placed yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-gray-900">የተጠቃሚ መረጃ አርትዕ (Edit User Info)</h3>
              <button onClick={() => setEditingUser(null)} className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveEditedUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">ሙሉ ስም (Full Name)</label>
                <input
                  type="text"
                  required
                  value={editingUser.full_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">ኢሜል (Email)</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">ስልክ (Phone)</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">ባዮ (Bio / Notes)</label>
                <textarea
                  rows={2}
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white"
                >
                  አስቀምጥ (Save in Neon)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Super Admin Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Key className="w-5 h-5 text-purple-700 shrink-0" />
                <h3 className="text-sm font-black text-gray-900">አዲስ የይለፍ ቃል ያስቀምጡ</h3>
              </div>
              <button onClick={() => setResetPasswordUser(null)} className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-600 break-words">
              Reset password for <strong>{resetPasswordUser.full_name}</strong> ({resetPasswordUser.email || resetPasswordUser.phone}).
            </p>
            <form onSubmit={handleAdminResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">አዲሱ የይለፍ ቃል (New Password)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="ቢያንስ 6 ፊደላት"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white"
                >
                  የይለፍ ቃል ቀይር (Reset)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Create Staff Modal */}
      {isCreateStaffOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-gray-900">አዲስ ሰራተኛ ወይም አስተዳዳሪ ፍጠር</h3>
              <button onClick={() => setIsCreateStaffOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">ሙሉ ስም (Full Name)</label>
                <input
                  type="text"
                  required
                  value={newStaffFullName}
                  onChange={(e) => setNewStaffFullName(e.target.value)}
                  placeholder="e.g. Almaz Bekele"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">ኢሜል (Email)</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@melamarket.et"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">ስልክ (Phone)</label>
                  <input
                    type="text"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="+2519..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">ሚና (Role)</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                  >
                    <option value="staff">Staff (የተወሰነ ፈቃድ ያለው ሰራተኛ)</option>
                    <option value="admin">Admin (አስተዳዳሪ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">የይለፍ ቃል (Password)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="ቢያንስ 6 ፊደላት"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-2">የተሰጡ ፈቃዶች (Assigned Permissions):</label>
                <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStaffPermissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStaffPermissions([...newStaffPermissions, perm.id]);
                          } else {
                            setNewStaffPermissions(newStaffPermissions.filter((p) => p !== perm.id));
                          }
                        }}
                        className="rounded text-purple-600"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateStaffOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white"
                >
                  ሰራተኛ ፍጠር (Create Staff)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Staff Permissions Modal */}
      {editingStaffPermissions && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-gray-900">የሰራተኛ ፈቃዶችን አርትዕ</h3>
              <button onClick={() => setEditingStaffPermissions(null)} className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Editing permissions for <strong>{editingStaffPermissions.full_name}</strong>
            </p>
            <form onSubmit={handleSaveStaffPermissions} className="space-y-3">
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                {AVAILABLE_PERMISSIONS.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStaffPermissions.permissions?.includes(perm.id)}
                      onChange={(e) => {
                        const current = editingStaffPermissions.permissions || [];
                        if (e.target.checked) {
                          setEditingStaffPermissions({ ...editingStaffPermissions, permissions: [...current, perm.id] });
                        } else {
                          setEditingStaffPermissions({ ...editingStaffPermissions, permissions: current.filter((p: string) => p !== perm.id) });
                        }
                      }}
                      className="rounded text-purple-600"
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaffPermissions(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white"
                >
                  ፈቃድ አዘምን (Update)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Order Detail & Items Modal */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-purple-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-gray-900">ትዕዛዝ {selectedOrderDetail.order_number}</h3>
                <p className="text-xs text-gray-500">Order Items & Delivery Information</p>
              </div>
              <button onClick={() => setSelectedOrderDetail(null)} className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl text-xs space-y-1 break-words">
              <div><strong>Customer:</strong> {selectedOrderDetail.customer_name} ({selectedOrderDetail.phone})</div>
              <div><strong>Address:</strong> {selectedOrderDetail.shipping_address}, {selectedOrderDetail.shipping_city}</div>
              <div><strong>Payment:</strong> {selectedOrderDetail.payment_method} • Status: {selectedOrderDetail.payment_status || 'pending'}</div>
              {selectedOrderDetail.notes && <div><strong>Notes:</strong> {selectedOrderDetail.notes}</div>}
            </div>

            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">የተታዘዙ እቃዎች (Items):</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedOrderDetail.items?.map((it) => (
                  <div key={it.id} className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-gray-900 break-words">{it.product_title}</div>
                      <div className="text-[10px] text-gray-400">Qty: {it.quantity} @ {Number(it.unit_price).toLocaleString()} ETB</div>
                    </div>
                    <div className="font-bold text-emerald-800 shrink-0">
                      {(it.quantity * Number(it.unit_price)).toLocaleString()} ETB
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500">ጠቅላላ ክፍያ (Total Amount):</span>
              <span className="text-base font-black text-emerald-800">
                {Number(selectedOrderDetail.total_amount).toLocaleString()} ETB
              </span>
            </div>

            {/* Uploaded Payment Receipt & Verification Section */}
            <div className="pt-3 border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase">
                  የክፍያ ደረሰኝ (Payment Receipt)
                </h4>
                {selectedOrderDetail.payment_receipt && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedOrderDetail.payment_receipt.verification_status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : selectedOrderDetail.payment_receipt.verification_status === 'rejected'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {selectedOrderDetail.payment_receipt.verification_status.toUpperCase()}
                  </span>
                )}
              </div>

              {selectedOrderDetail.payment_receipt ? (
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2.5">
                  <AuthorizedReceiptImage
                    receiptId={selectedOrderDetail.payment_receipt.id}
                    token={token}
                    refreshKey={selectedOrderDetail.payment_receipt.uploaded_at}
                    alt={`Receipt for ${selectedOrderDetail.order_number}`}
                    className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-white"
                  />
                  <div className="flex flex-wrap justify-between gap-2 text-[10px] text-gray-500">
                    <span>Uploaded: {new Date(selectedOrderDetail.payment_receipt.uploaded_at).toLocaleString()}</span>
                    <span>
                      {selectedOrderDetail.payment_receipt.original_filename || 'receipt'} (
                      {formatFileSize(selectedOrderDetail.payment_receipt.file_size)})
                    </span>
                  </div>
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={receiptNotesInput}
                      onChange={(e) => setReceiptNotesInput(e.target.value)}
                      placeholder="የማረጋገጫ ማስታወሻ ወይም ምክንያት (Optional verification/rejection note)"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isVerifyingReceipt}
                        onClick={() =>
                          verifyPaymentReceipt(selectedOrderDetail.payment_receipt!.id, 'approved', receiptNotesInput)
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>አጽድቅ (Approve Receipt)</span>
                      </button>
                      <button
                        type="button"
                        disabled={isVerifyingReceipt}
                        onClick={() =>
                          verifyPaymentReceipt(selectedOrderDetail.payment_receipt!.id, 'rejected', receiptNotesInput)
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>ውድቅ አድርግ (Reject Receipt)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-[11px] text-gray-500 text-center">
                  ምንም የክፍያ ደረሰኝ አልተጫነም (No payment receipt uploaded yet)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Update Payment Modal */}
      {updatingPaymentOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-gray-900">የትዕዛዝ ክፍያ ሁኔታ አዘምን (Update Payment Record)</h3>
              <button onClick={() => setUpdatingPaymentOrder(null)} className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            {updatingPaymentOrder.payment_receipt && (
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-gray-700">Uploaded Payment Receipt</span>
                  <span className="font-bold uppercase text-purple-800">
                    {updatingPaymentOrder.payment_receipt.verification_status}
                  </span>
                </div>
                <AuthorizedReceiptImage
                  receiptId={updatingPaymentOrder.payment_receipt.id}
                  token={token}
                  refreshKey={updatingPaymentOrder.payment_receipt.uploaded_at}
                  alt={`Receipt for ${updatingPaymentOrder.order_number}`}
                  className="w-full max-h-44 object-contain rounded-xl border border-gray-200 bg-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isVerifyingReceipt}
                    onClick={() =>
                      verifyPaymentReceipt(updatingPaymentOrder.payment_receipt!.id, 'approved', paymentNotesInput)
                    }
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                  >
                    Approve Receipt
                  </button>
                  <button
                    type="button"
                    disabled={isVerifyingReceipt}
                    onClick={() =>
                      verifyPaymentReceipt(updatingPaymentOrder.payment_receipt!.id, 'rejected', paymentNotesInput)
                    }
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold disabled:opacity-50"
                  >
                    Reject Receipt
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleUpdatePayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">የክፍያ ሁኔታ (Payment Status)</label>
                <select
                  value={paymentStatusInput}
                  onChange={(e) => setPaymentStatusInput(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                >
                  <option value="pending">Pending Payment (ክፍያ በመጠባበቅ ላይ)</option>
                  <option value="paid">Paid & Verified (ክፍያ ተፈጽሟል)</option>
                  <option value="refunded">Refunded (የተመለሰ)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">የግብይት ማስታወሻ (Transaction Reference / Notes)</label>
                <input
                  type="text"
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  placeholder="e.g. Telebirr Txn #TB2025098"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdatingPaymentOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white"
                >
                  ክፍያ መዝግብ (Record Payment)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Resolve Report Modal */}
      {resolvingReport && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-purple-100 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-gray-900">የቀረበውን ሪፖርት ማስተካከል (Resolve Report)</h3>
              <button onClick={() => setResolvingReport(null)} className="p-1.5 text-gray-400 hover:text-gray-700 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-600">
              Report against: <strong>{resolvingReport.target_title || resolvingReport.target_type}</strong>
            </p>
            <form onSubmit={handleResolveReport} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">ውሳኔ (Resolution Status)</label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold"
                >
                  <option value="resolved">Resolved (ተፈትቷል / እርምጃ ተወስዷል)</option>
                  <option value="dismissed">Dismissed (ተሰርዟል / ውድቅ ተደርጓል)</option>
                  <option value="pending">Pending Further Review (በመጠባበቅ ላይ)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">የውሳኔ ዝርዝር ማስታወሻ (Resolution Notes)</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Contacted seller and confirmed authenticity."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingReport(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  ይቅር
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white"
                >
                  ውሳኔ መዝግብ (Submit Resolution)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Safeguard User Delete Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-red-200 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-black text-gray-900">ይህንን ተጠቃሚ በቋሚነት መሰረዝ ይፈልጋሉ?</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed break-words">
              Are you sure you want to permanently delete <strong>{confirmDeleteUser.full_name}</strong> ({confirmDeleteUser.email || confirmDeleteUser.phone})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                ይቅር (Cancel)
              </button>
              <button
                onClick={handleDeleteUserSafeguard}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition-all"
              >
                በቋሚነት ሰርዝ (Confirm Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Safeguard Product Delete Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl border border-red-200 space-y-4 max-h-[90dvh] overflow-y-auto my-auto">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-black text-gray-900">እቃውን በቋሚነት መሰረዝ ይፈልጋሉ?</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed break-words">
              Permanently delete product listing: <strong>{confirmDeleteProduct.title}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                ይቅር (Cancel)
              </button>
              <button
                onClick={deleteProductConfirm}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95 transition-all"
              >
                እቃውን ሰርዝ (Delete Listing)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
