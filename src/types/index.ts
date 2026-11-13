export type UserRole = 'superadmin' | 'admin' | 'staff' | 'seller' | 'customer';

export interface User {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  dbRole?: 'admin' | 'user';
  isActive: boolean;
  permissions?: string[];
  createdAt?: string;
  avatarUrl?: string;
  bio?: string;
  sellerId?: number;
  storeName?: string;
  sellerVerified?: boolean;
  sellerRating?: number;
  totalProducts?: number;
  totalOrders?: number;
}

export interface Category {
  id: number;
  name: string;
  name_amharic: string | null;
  slug: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  product_count?: number;
}

export type ProductCondition = 'new' | 'used';
export type ProductStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Product {
  id: number;
  title: string;
  title_amharic?: string;
  description: string;
  price: number;
  original_price?: number;
  condition: ProductCondition; // 'new' (አዲስ እቃ) or 'used' (ያገለገሉ እቃ)
  stock: number;
  region: string;
  woreda: string;
  city: string;
  status: ProductStatus;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  category_name?: string;
  category_name_amharic?: string;
  category_slug?: string;
  seller_id?: number;
  store_name?: string;
  seller_verified?: boolean;
  seller_rating?: number;
  primary_image?: string;
  images?: { id: number; image_url: string; is_primary: boolean }[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  seller_id?: number;
  product_title: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  id: number;
  order_number: string;
  buyer_id?: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: string;
  payment_status?: 'pending' | 'paid' | 'refunded';
  payment_notes?: string;
  shipping_address: string;
  shipping_city?: string;
  phone: string;
  customer_name: string;
  notes?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface MarketplaceReport {
  id: number;
  reporter_name?: string;
  reporter_contact?: string;
  target_type: 'product' | 'seller' | 'user';
  target_id: number;
  target_title?: string;
  reason: string;
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolved_by?: number;
  resolution_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminStats {
  users: {
    total_users: number;
    suspended_users: number;
    total_customers: number;
    total_admins: number;
    total_staff: number;
  };
  sellers: {
    total_sellers: number;
    verified_sellers: number;
  };
  products: {
    total_products: number;
    new_products: number;
    used_products: number;
    pending_moderation: number;
    approved_products: number;
    suspended_products: number;
  };
  orders: {
    total_orders: number;
    pending_orders: number;
    processing_orders: number;
    completed_orders: number;
    cancelled_orders: number;
    total_revenue: number;
  };
  categories: {
    total_categories: number;
  };
  reports?: {
    pending_reports: number;
    total_reports: number;
  };
  recentUsers: any[];
  recentProducts: any[];
  recentActivities: AdminActivityLog[];
}

export interface AdminActivityLog {
  id: number;
  admin_id?: number;
  admin_name?: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  ip_address?: string;
  created_at: string;
}

export interface DatabaseStatusReport {
  connected: boolean;
  configured: boolean;
  databaseUrlMasked?: string | null;
  directUrlConfigured?: boolean;
  directUrlMasked?: string | null;
  host?: string | null;
  database?: string | null;
  user?: string | null;
  serverTime?: string;
  version?: string;
  counts?: Record<string, number>;
  error?: string | null;
  instructions?: string;
}
