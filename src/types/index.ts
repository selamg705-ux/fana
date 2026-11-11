export type Language = 'am' | 'ti' | 'en';

export type ProductCondition = 'Brand New' | 'Used' | 'Like New' | 'Gently Used';

export interface MultilingualText {
  en: string;
  am: string;
  ti: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  isVerifiedPurchase: boolean;
}

export interface Product {
  id: string;
  title: MultilingualText;
  description: MultilingualText;
  categoryId: string;
  price: number;
  originalPrice?: number;
  condition: ProductCondition;
  quantity: number; // Actual available quantity
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerIsVerified: boolean;
  region: string;
  zone: string;
  woreda?: string;
  rating: number;
  reviewsCount: number;
  createdAt: string;
  featured?: boolean;
}

export interface Category {
  id: string;
  iconName: string;
  name: MultilingualText;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productTitle: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export type OrderStatus = 'Pending' | 'Delivered' | 'Completed' | 'Cancelled';

export interface PaymentReceipt {
  receiptUrl: string;
  uploadedAt: string;
  transactionRef?: string;
  paymentMethod?: string;
  verified: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  region: string;
  zone: string;
  woreda?: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string;
  status: OrderStatus;
  notes?: string;
  paymentReceipt?: PaymentReceipt;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'seller' | 'admin';
  createdAt: string;
  avatarUrl?: string;
}

export interface WoredaLocation {
  id: string;
  name: MultilingualText;
}

export interface ZoneLocation {
  id: string;
  name: MultilingualText;
  woredas?: WoredaLocation[];
}

export interface RegionLocation {
  id: string;
  name: MultilingualText;
  zones: ZoneLocation[];
}
