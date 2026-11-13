import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const { Pool } = pg;

// Helper to sanitize and validate PostgreSQL connection strings
export function sanitizeNeonUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  let clean = rawUrl.trim().replace(/^['"](.*)['"]$/, '$1').trim();
  if (!clean || clean === 'MY_DATABASE_URL' || clean === 'MY_DIRECT_URL') {
    return undefined;
  }
  if (!clean.startsWith('postgres://') && !clean.startsWith('postgresql://')) {
    return undefined;
  }
  return clean;
}

// Helper to get database connection string for runtime queries (pooled or direct)
export function getDatabaseUrl(): string | undefined {
  return sanitizeNeonUrl(process.env.DATABASE_URL) || sanitizeNeonUrl(process.env.DIRECT_URL);
}

// Helper to get direct connection string for DDL migrations (direct preferred over pooled)
export function getDirectUrl(): string | undefined {
  return sanitizeNeonUrl(process.env.DIRECT_URL) || sanitizeNeonUrl(process.env.DATABASE_URL);
}

// Check if we have active Neon pool
let pool: pg.Pool | null = null;
let isConnectedToNeon = false;
let lastDbError: string | null = null;

export function toCleanDbError(err: unknown, fallback = 'Database operation failed.'): string {
  let msg = '';
  if (typeof err === 'string') {
    msg = err;
  } else if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string' && e.message.trim()) msg = e.message;
    else if (typeof e.detail === 'string' && e.detail.trim()) msg = e.detail;
    else if (typeof e.error === 'string' && e.error.trim()) msg = e.error;
  }
  if (!msg.trim()) msg = fallback;
  return msg.replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, '[database-url-redacted]');
}

export function isNeonConnected(): boolean {
  return isConnectedToNeon;
}

export function getNeonError(): string | null {
  return lastDbError;
}

// Initial seed data for Ethiopian Marketplace
export const INITIAL_CATEGORIES = [
  { id: 1, name: 'Traditional & Habesha Wear', name_amharic: 'የሀገር ባህል ልብስ', slug: 'traditional-wear', icon: 'Sparkles', is_active: true, display_order: 1 },
  { id: 2, name: 'Phones & Electronics', name_amharic: 'ስልኮች እና ኤሌክትሮኒክስ', slug: 'electronics', icon: 'Smartphone', is_active: true, display_order: 2 },
  { id: 3, name: 'Ethiopian Coffee & Spices', name_amharic: 'የኢትዮጵያ ቡና እና ቅመማ ቅመም', slug: 'coffee-spices', icon: 'Coffee', is_active: true, display_order: 3 },
  { id: 4, name: 'Habesha Jewelry & Crafts', name_amharic: 'ጌጣጌጥ እና ባህላዊ እቃዎች', slug: 'jewelry-crafts', icon: 'Gem', is_active: true, display_order: 4 },
  { id: 5, name: 'Home & Furniture', name_amharic: 'የቤት እቃዎች እና ፈርኒቸር', slug: 'home-furniture', icon: 'Home', is_active: true, display_order: 5 },
  { id: 6, name: 'Vehicles & Auto Parts', name_amharic: 'ተሽከርካሪዎች እና መለዋወጫ', slug: 'vehicles', icon: 'Car', is_active: true, display_order: 6 },
  { id: 7, name: 'Laptops & Computers', name_amharic: 'ላፕቶፖች እና ኮምፒውተሮች', slug: 'computers', icon: 'Laptop', display_order: 7 },
  { id: 8, name: 'Fashion & Shoes', name_amharic: 'ፋሽን እና ጫማዎች', slug: 'fashion-shoes', icon: 'Shirt', display_order: 8 }
];

export const INITIAL_ROLES = [
  { id: 1, name: 'superadmin', description: 'Super Administrator with complete marketplace control' },
  { id: 2, name: 'admin', description: 'Marketplace Administrator with operational permissions' },
  { id: 3, name: 'staff', description: 'Marketplace Staff with delegated operational permissions' },
  { id: 4, name: 'seller', description: 'Verified Seller with product and order management permissions' },
  { id: 5, name: 'customer', description: 'Standard Customer with purchasing and review permissions' }
];

export const INITIAL_ORDER_STATUSES = [
  { id: 1, code: 'pending', name: 'Pending Payment / Processing', description: 'Order created, awaiting seller confirmation' },
  { id: 2, code: 'confirmed', name: 'Confirmed', description: 'Seller confirmed the order' },
  { id: 3, code: 'processing', name: 'Processing / Packing', description: 'Goods being prepared for shipping' },
  { id: 4, code: 'shipped', name: 'Dispatched / On the Way', description: 'Package handed to courier or driver' },
  { id: 5, code: 'delivered', name: 'Delivered', description: 'Customer safely received package' },
  { id: 6, code: 'cancelled', name: 'Cancelled', description: 'Order was cancelled' }
];

// Fallback in-memory storage used ONLY when DATABASE_URL is not yet provided by the user
// As soon as DATABASE_URL is provided, all queries target Neon PostgreSQL directly.
const memStore: {
  roles: any[];
  users: any[];
  userProfiles: any[];
  sellers: any[];
  categories: any[];
  products: any[];
  productImages: any[];
  orders: any[];
  orderItems: any[];
  orderStatuses: any[];
  reports: any[];
  adminActivityLogs: any[];
  marketplaceSettings: Record<string, string>;
} = {
  roles: [...INITIAL_ROLES],
  reports: [
    {
      id: 1,
      reporter_name: 'Solomon Kebede',
      reporter_contact: 'solomon@example.com',
      target_type: 'product',
      target_id: 1,
      reason: 'Inquiry regarding product authenticity',
      description: 'Customer requested verification of the handspun cotton seal.',
      status: 'resolved',
      resolution_notes: 'Verified with Abyssinia store owner Dawit Tadesse.',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  users: [
    {
      id: 1,
      full_name: 'Mela Super Admin',
      email: 'admin@melamarket.et',
      phone: '+251911223344',
      password_hash: bcrypt.hashSync('MelaAdmin2025!', 10),
      role_id: 1,
      role: 'admin',
      permissions: ['manage_users', 'manage_products', 'manage_orders', 'manage_categories', 'manage_sellers', 'manage_settings', 'view_logs', 'manage_staff'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      full_name: 'Dawit Tadesse (ዳዊት)',
      email: 'dawit.seller@melamarket.et',
      phone: '+251912345678',
      password_hash: bcrypt.hashSync('SellerPass123!', 10),
      role_id: 4,
      role: 'user',
      permissions: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      full_name: 'Marketplace Operations Staff (ሰራተኛ)',
      email: 'staff@melamarket.et',
      phone: '+251922334455',
      password_hash: bcrypt.hashSync('StaffPass123!', 10),
      role_id: 3,
      role: 'user',
      permissions: ['manage_products', 'manage_orders', 'view_logs'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  userProfiles: [
    { id: 1, user_id: 1, bio: 'Chief Marketplace Administrator', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
    { id: 2, user_id: 2, bio: 'Verified Merchant from Addis Ababa', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' }
  ],
  sellers: [
    { id: 1, user_id: 2, store_name: 'Abyssinia Premium Goods (አቢሲኒያ የንግድ ቤት)', business_phone: '+251912345678', is_verified: true, rating: 4.9, total_sales: 34 }
  ],
  categories: [...INITIAL_CATEGORIES],
  products: [
    // NEW PRODUCTS (አዲስ እቃ)
    {
      id: 1,
      seller_id: 1,
      category_id: 1,
      title: 'Handcrafted Men\'s Ethiopian Traditional Kemis & Netela (የወንዶች ባህል ልብስ)',
      title_amharic: 'የወንዶች ባህላዊ የጥበብ ልብስ ከነጠላ ጋር',
      description: 'Authentic 100% pure Ethiopian handspun cotton (እጅ ጥልፍ የሸማ ልብስ) with royal green and golden tilet design. Perfect for weddings, holidays, and cultural events. Brand new, tailor-made in Addis Ababa.',
      price: 8500.00,
      original_price: 10500.00,
      condition: 'new',
      stock: 8,
      region: 'Addis Ababa',
      woreda: 'Bole',
      city: 'Addis Ababa',
      status: 'approved',
      is_featured: true,
      views_count: 142,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      seller_id: 1,
      category_id: 3,
      title: 'Yirgacheffe Grade 1 Special Reserve Green Coffee Beans (ይርጋጨፌ ቡና 5KG)',
      title_amharic: 'ይርጋጨፌ አንደኛ ደረጃ ጥሬ ቡና 5 ኪሎ',
      description: 'Single-origin specialty washed Arabica green coffee beans from the highlands of Yirgacheffe, Sidama. Floral jasmine notes with bright bergamot and honey finish. Fresh harvest vacuum sealed.',
      price: 3800.00,
      original_price: 4200.00,
      condition: 'new',
      stock: 25,
      region: 'Sidama',
      woreda: 'Hawassa Zuria',
      city: 'Hawassa',
      status: 'approved',
      is_featured: true,
      views_count: 89,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 3,
      seller_id: 1,
      category_id: 2,
      title: 'Brand New Samsung Galaxy A55 5G (256GB Dual SIM, Official Warranty)',
      title_amharic: 'አዲስ ሳምሰንግ ጋላክሲ A55 5G በካርቶን ያልተከፈተ',
      description: 'Factory sealed brand new Samsung Galaxy A55 5G in Awesome Iceblue. 8GB RAM, 256GB Storage, Super AMOLED 120Hz display, 50MP OIS camera, 5000mAh battery. 1 year local Ethiopian warranty included.',
      price: 46000.00,
      original_price: 49500.00,
      condition: 'new',
      stock: 12,
      region: 'Addis Ababa',
      woreda: 'Kirkos',
      city: 'Addis Ababa',
      status: 'approved',
      is_featured: true,
      views_count: 310,
      created_at: new Date(Date.now() - 10800000).toISOString(),
      image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 4,
      seller_id: 1,
      category_id: 5,
      title: 'Traditional Clay Jebena Coffee Ceremony Set (የሸክላ ጀበና እና የሲኒ ስብስብ)',
      title_amharic: 'የተሟላ የቡና ማፍያ ጀበና እና 12 የሲኒ ስብስብ',
      description: 'Complete ceremonial Ethiopian coffee brewing kit: 1 high-fired clay Jebena pot with wooden stand, charcoal stove (ማንቆርቆሪያ/ምድጃ), 12 porcelain cini cups, and Rekebot tray stand.',
      price: 2900.00,
      original_price: 3500.00,
      condition: 'new',
      stock: 15,
      region: 'Oromia',
      woreda: 'Adama Woreda',
      city: 'Adama',
      status: 'approved',
      is_featured: false,
      views_count: 67,
      created_at: new Date(Date.now() - 14400000).toISOString(),
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80'
    },

    // USED PRODUCTS (ያገለገሉ እቃ)
    {
      id: 5,
      seller_id: 1,
      category_id: 2,
      title: 'Apple iPhone 13 Pro 128GB Sierra Blue (Clean Condition, 89% Battery)',
      title_amharic: 'ያገለገለ አይፎን 13 ፕሮ 128 ጊጋባይት ንፁህ ይዞታ',
      description: 'Gently used iPhone 13 Pro. Factory unlocked, clean iCloud, 89% battery health. Never opened or repaired. Includes original box and fast charging cable. Tested and certified fully functional.',
      price: 68000.00,
      original_price: 85000.00,
      condition: 'used',
      stock: 2,
      region: 'Addis Ababa',
      woreda: 'Bole',
      city: 'Addis Ababa',
      status: 'approved',
      is_featured: true,
      views_count: 220,
      created_at: new Date(Date.now() - 18000000).toISOString(),
      image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 6,
      seller_id: 1,
      category_id: 6,
      title: 'Pre-Owned Toyota Vitz 2012 Automatic (Clean Body, Plate 3 Code B)',
      title_amharic: 'ያገለገለ ቶዮታ ቪትዝ 2012 ሞዴል በንፁህ ሁኔታ',
      description: 'Direct owner sale. 2012 Toyota Vitz, Automatic transmission, 1.3L fuel efficient engine, original paint, AC cold, power windows, all taxes and annual inspection cleared. Plate 3, 114,000 km.',
      price: 1850000.00,
      original_price: 1950000.00,
      condition: 'used',
      stock: 1,
      region: 'Addis Ababa',
      woreda: 'Yeka',
      city: 'Addis Ababa',
      status: 'approved',
      is_featured: true,
      views_count: 512,
      created_at: new Date(Date.now() - 21600000).toISOString(),
      image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 7,
      seller_id: 1,
      category_id: 7,
      title: 'Lenovo ThinkPad T480s Business Laptop (Core i7, 16GB RAM, 512GB SSD)',
      title_amharic: 'ያገለገለ ሌኖቮ ቲንክፓድ T480s ላፕቶፕ ኮር i7',
      description: 'Durable ThinkPad business laptop in excellent pre-owned condition. Intel Core i7 8th Gen, 16GB DDR4 RAM, 512GB NVMe SSD, backlit keyboard, dual batteries (6+ hours backup), FHD IPS screen.',
      price: 34000.00,
      original_price: 42000.00,
      condition: 'used',
      stock: 3,
      region: 'Amhara',
      woreda: 'Bahir Dar Zuria',
      city: 'Bahir Dar',
      status: 'approved',
      is_featured: false,
      views_count: 188,
      created_at: new Date(Date.now() - 25200000).toISOString(),
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 8,
      seller_id: 1,
      category_id: 5,
      title: 'Vintage Solid Wanza Wood Living Room Coffee Table & 4 Stools (የዋንዛ እንጨት ጠረጴዛ)',
      title_amharic: 'ያገለገለ የዋንዛ እንጨት ጠረጴዛ እና 4 በርጩማዎች',
      description: 'Carved authentic Ethiopian Wanza hardwood coffee table with 4 matching stools. Heavy, extremely solid and in great condition. Natural polished timber grain.',
      price: 14500.00,
      original_price: 21000.00,
      condition: 'used',
      stock: 1,
      region: 'Oromia',
      woreda: 'Bishoftu',
      city: 'Bishoftu',
      status: 'approved',
      is_featured: false,
      views_count: 94,
      created_at: new Date(Date.now() - 28800000).toISOString(),
      image: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=800&q=80'
    }
  ],
  productImages: [
    { id: 1, product_id: 1, image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80', is_primary: true },
    { id: 2, product_id: 2, image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', is_primary: true },
    { id: 3, product_id: 3, image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80', is_primary: true },
    { id: 4, product_id: 4, image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80', is_primary: true },
    { id: 5, product_id: 5, image_url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80', is_primary: true },
    { id: 6, product_id: 6, image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', is_primary: true },
    { id: 7, product_id: 7, image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80', is_primary: true },
    { id: 8, product_id: 8, image_url: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=800&q=80', is_primary: true },
  ],
  orders: [],
  orderItems: [],
  orderStatuses: [...INITIAL_ORDER_STATUSES],
  adminActivityLogs: [
    {
      id: 1,
      admin_id: 1,
      admin_name: 'Mela Super Admin',
      action: 'SYSTEM_BOOT',
      target_type: 'SYSTEM',
      target_id: '1',
      details: 'Mela Market initialized. Neon PostgreSQL integration ready.',
      created_at: new Date().toISOString()
    }
  ],
  marketplaceSettings: {
    site_name: 'Mela Market | መላ ማርኬት',
    contact_phone: '0904503245',
    contact_whatsapp: '@brmiki21',
    contact_email: 'support@melamarket.et',
    announcement: 'እንኳን ወደ መላ ማርኬት በደህና መጡ! በመላው ኢትዮጵያ አስተማማኝ ግብይት ያካሂዱ። (Welcome to Mela Market - Buy & sell securely across Ethiopia)',
    require_product_approval: 'false'
  }
};

let autoIdCounter = 100;

let activePoolUrl: string | null = null;

export function getPool(forceNew = false): pg.Pool | null {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    if (pool) {
      try { pool.end().catch(() => {}); } catch {}
      pool = null;
      activePoolUrl = null;
    }
    return null;
  }

  if (!pool || forceNew || activePoolUrl !== dbUrl) {
    if (pool) {
      try { pool.end().catch(() => {}); } catch {}
    }
    activePoolUrl = dbUrl;
    // Neon PostgreSQL requires SSL
    const sslConfig = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false };

    pool = new Pool({
      connectionString: dbUrl,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      const cleanMsg = toCleanDbError(err, 'Idle database client error');
      console.error('Unexpected error on idle Neon PostgreSQL client:', cleanMsg);
      lastDbError = cleanMsg;
    });
  }

  return pool;
}

// Execute query: if Neon is connected, runs directly on Neon PostgreSQL;
// Otherwise handles queries via memStore and logs status.
export async function query(text: string, params: any[] = []): Promise<pg.QueryResult<any>> {
  const currentPool = getPool();
  if (currentPool && isConnectedToNeon) {
    try {
      return await currentPool.query(text, params);
    } catch (e: any) {
      console.error('Neon query execution error:', toCleanDbError(e));
      throw e;
    }
  }

  // Fallback simulator when DATABASE_URL is missing or Neon is temporarily unavailable
  return executeFallbackQuery(text, params);
}

// Fallback in-memory query handler
function executeFallbackQuery(text: string, params: any[] = []): pg.QueryResult<any> {
  const cleanSql = text.trim();
  const upper = cleanSql.toUpperCase();

  // 1. Categories
  if (upper.includes('FROM CATEGORIES')) {
    if (upper.includes('COUNT(*) AS TOTAL_CATEGORIES')) {
      return { rows: [{ total_categories: memStore.categories.length }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }
    const rows = memStore.categories.map((c) => ({
      ...c,
      product_count: memStore.products.filter((p) => p.category_id === c.id).length
    }));
    return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
  }

  // 2. Select User by id, email/phone, stats, or list
  if (upper.includes('FROM USERS')) {
    if (upper.includes('COUNT(*) AS TOTAL_USERS')) {
      const staffRoleId = memStore.roles.find((r) => r.name === 'staff')?.id;
      return {
        rows: [{
          total_users: memStore.users.length,
          suspended_users: memStore.users.filter((u) => !u.is_active).length,
          total_customers: memStore.users.filter((u) => u.role !== 'admin').length,
          total_admins: memStore.users.filter((u) => u.role === 'admin').length,
          total_staff: memStore.users.filter((u) => u.role_id === staffRoleId).length
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    }

    if (upper.includes('WHERE U.ID = $1') || upper.includes('WHERE ID = $1')) {
      const u = memStore.users.find((user) => user.id === params[0]);
      if (u) {
        const role = memStore.roles.find((r) => r.id === u.role_id)?.name || 'customer';
        const seller = memStore.sellers.find((s) => s.user_id === u.id);
        const profile = memStore.userProfiles.find((up) => up.user_id === u.id);
        const row = {
          ...u,
          db_role: u.role === 'admin' ? 'admin' : 'user',
          role_name: role,
          permissions: Array.isArray(u.permissions) ? u.permissions : [],
          seller_id: seller?.id,
          store_name: seller?.store_name,
          seller_verified: seller?.is_verified,
          seller_rating: seller?.rating,
          bio: profile?.bio,
          avatar_url: profile?.avatar_url
        };
        return { rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    if (params.length >= 1 && (upper.includes('WHERE LOWER(U.EMAIL)') || upper.includes('WHERE LOWER(EMAIL)') || upper.includes('WHERE PHONE = $1'))) {
      const pLower = params.map(p => String(p ?? '').toLowerCase().trim()).filter(Boolean);
      const pPhoneDigits = params
        .filter(p => typeof p === 'string' && p.trim() !== '' && !p.includes('@'))
        .map(p => p.replace(/\D/g, ''))
        .filter(d => d.length >= 7);
      const u = memStore.users.find((user) => {
        const uEmail = (user.email || '').toLowerCase().trim();
        const uPhone = (user.phone || '').trim();
        const uPhoneDigits = uPhone.replace(/\D/g, '');
        return (uEmail && pLower.includes(uEmail)) ||
               (uPhone && pLower.includes(uPhone.toLowerCase())) ||
               (uPhoneDigits && pPhoneDigits.some(d => uPhoneDigits === d || (d.length >= 9 && uPhoneDigits.slice(-9) === d.slice(-9))));
      });
      if (u) {
        const role = memStore.roles.find((r) => r.id === u.role_id)?.name || 'customer';
        const seller = memStore.sellers.find((s) => s.user_id === u.id);
        const row = {
          ...u,
          db_role: u.role === 'admin' ? 'admin' : 'user',
          role_name: role,
          permissions: Array.isArray(u.permissions) ? u.permissions : [],
          seller_id: seller?.id,
          store_name: seller?.store_name,
          seller_verified: seller?.is_verified
        };
        return { rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    if (upper.includes('WHERE EMAIL = $1')) {
      const u = memStore.users.filter((user) => user.email && user.email.toLowerCase() === params[0]?.toLowerCase());
      return { rows: u, rowCount: u.length, command: 'SELECT', oid: 0, fields: [] };
    }

    // List users (optionally filtered to staff/admin)
    let sourceUsers = memStore.users;
    if (upper.includes("IN ('ADMIN', 'STAFF', 'SUPERADMIN')")) {
      sourceUsers = sourceUsers.filter((u) => {
        const role = memStore.roles.find((r) => r.id === u.role_id)?.name || 'customer';
        return u.role === 'admin' || role === 'admin' || role === 'staff' || role === 'superadmin';
      });
    }

    const allUsers = sourceUsers.map((u) => {
      const role = memStore.roles.find((r) => r.id === u.role_id)?.name || 'customer';
      const seller = memStore.sellers.find((s) => s.user_id === u.id);
      return {
        ...u,
        db_role: u.role === 'admin' ? 'admin' : 'user',
        role_name: role,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        seller_id: seller?.id,
        store_name: seller?.store_name,
        seller_verified: seller?.is_verified,
        total_products: seller ? memStore.products.filter((p) => p.seller_id === seller.id).length : 0,
        total_orders: memStore.orders.filter((o) => o.buyer_id === u.id).length
      };
    });
    return { rows: allUsers, rowCount: allUsers.length, command: 'SELECT', oid: 0, fields: [] };
  }

  // 3. Insert User
  if (upper.startsWith('INSERT INTO USERS')) {
    const id = ++autoIdCounter;
    const newUser = {
      id,
      full_name: params[0],
      email: params[1],
      phone: params[2],
      password_hash: params[3],
      role_id: params[4],
      role: params[5] === 'admin' ? 'admin' : 'user',
      permissions: Array.isArray(params[6]) ? params[6] : [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  // 3b. User Profiles
  if (upper.startsWith('INSERT INTO USER_PROFILES')) {
    const id = ++autoIdCounter;
    const newProfile = { id, user_id: params[0], bio: params[1], avatar_url: params[2] };
    const existingIdx = memStore.userProfiles.findIndex((p) => p.user_id === params[0]);
    if (existingIdx !== -1) {
      memStore.userProfiles[existingIdx] = { ...memStore.userProfiles[existingIdx], ...newProfile };
    } else {
      memStore.userProfiles.push(newProfile);
    }
    return { rows: [newProfile], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  // 4. Products Query
  if (upper.includes('FROM PRODUCTS')) {
    if (upper.includes('COUNT(*) AS TOTAL_PRODUCTS')) {
      const source = upper.includes('WHERE SELLER_ID = $1') && params[0] !== undefined
        ? memStore.products.filter((p) => p.seller_id === params[0])
        : memStore.products;
      return {
        rows: [{
          total_products: source.length,
          new_products: source.filter((p) => p.condition === 'new').length,
          used_products: source.filter((p) => p.condition === 'used').length,
          pending_moderation: source.filter((p) => p.status === 'pending').length,
          approved_products: source.filter((p) => p.status === 'approved').length,
          active_products: source.filter((p) => p.status === 'approved').length,
          suspended_products: source.filter((p) => p.status === 'suspended').length,
          total_views: source.reduce((acc, p) => acc + (Number(p.views_count) || 0), 0)
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    }

    if (upper.includes('WHERE P.ID = $1') || upper.includes('WHERE ID = $1')) {
      const p = memStore.products.find((prod) => prod.id === params[0]);
      if (p) {
        const cat = memStore.categories.find((c) => c.id === p.category_id);
        const seller = memStore.sellers.find((s) => s.id === p.seller_id);
        const user = memStore.users.find((u) => u.id === seller?.user_id);
        const img = memStore.productImages.find((pi) => pi.product_id === p.id)?.image_url || p.image;
        const row = {
          ...p,
          primary_image: img,
          category_name: cat?.name,
          category_name_amharic: cat?.name_amharic,
          category_slug: cat?.slug,
          store_name: seller?.store_name,
          business_phone: seller?.business_phone,
          seller_verified: seller?.is_verified,
          seller_rating: seller?.rating,
          seller_owner_name: user?.full_name,
          seller_email: user?.email
        };
        return { rows: [row], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
      }
      return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
    }

    // List products
    let list = memStore.products.map((p) => {
      const cat = memStore.categories.find((c) => c.id === p.category_id);
      const seller = memStore.sellers.find((s) => s.id === p.seller_id);
      const img = memStore.productImages.find((pi) => pi.product_id === p.id)?.image_url || p.image;
      return {
        ...p,
        category_name: cat?.name,
        category_name_amharic: cat?.name_amharic,
        category_slug: cat?.slug,
        store_name: seller?.store_name,
        seller_verified: seller?.is_verified,
        seller_rating: seller?.rating,
        primary_image: img
      };
    });

    if (upper.includes("WHERE P.STATUS = 'APPROVED'")) {
      list = list.filter((p) => p.status === 'approved');
    }

    if (upper.includes('WHERE P.SELLER_ID = $1') && params[0] !== undefined) {
      list = list.filter((p) => p.seller_id === params[0]);
    }

    if (params.includes('new')) {
      list = list.filter((p) => p.condition === 'new');
    } else if (params.includes('used')) {
      list = list.filter((p) => p.condition === 'used');
    }

    return { rows: list, rowCount: list.length, command: 'SELECT', oid: 0, fields: [] };
  }

  // 5. Insert Product
  if (upper.startsWith('INSERT INTO PRODUCTS')) {
    const id = ++autoIdCounter;
    const newProd = {
      id,
      seller_id: params[0],
      category_id: params[1],
      title: params[2],
      title_amharic: params[3],
      description: params[4],
      price: params[5],
      original_price: params[6],
      condition: params[7],
      stock: params[8],
      region: params[9],
      woreda: params[10],
      city: params[11],
      status: params[12] || 'approved',
      is_featured: false,
      views_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    memStore.products.unshift(newProd);
    return { rows: [newProd], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  // 6. Product Images
  if (upper.includes('FROM PRODUCT_IMAGES')) {
    const imgs = memStore.productImages.filter((pi) => pi.product_id === params[0]);
    return { rows: imgs, rowCount: imgs.length, command: 'SELECT', oid: 0, fields: [] };
  }

  if (upper.startsWith('INSERT INTO PRODUCT_IMAGES')) {
    const id = ++autoIdCounter;
    const newImg = { id, product_id: params[0], image_url: params[1], is_primary: params[2] };
    memStore.productImages.push(newImg);
    return { rows: [newImg], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  // 7. Orders & Order Items
  if (upper.includes('FROM ORDER_ITEMS OI') && upper.includes('TOTAL_SALES_VOLUME')) {
    const sellerItems = memStore.orderItems.filter((oi) => oi.seller_id === params[0]);
    const orderIds = new Set(sellerItems.map((oi) => oi.order_id));
    const pendingCount = memStore.orders.filter((o) => orderIds.has(o.id) && o.status === 'pending').length;
    const totalSales = sellerItems.reduce((sum, oi) => sum + (Number(oi.quantity) || 0) * (Number(oi.unit_price) || 0), 0);
    return {
      rows: [{
        total_orders: orderIds.size,
        pending_orders: pendingCount,
        total_sales_volume: totalSales
      }],
      rowCount: 1,
      command: 'SELECT',
      oid: 0,
      fields: []
    };
  }

  if (upper.startsWith('INSERT INTO ORDERS')) {
    const id = ++autoIdCounter;
    const newOrder = {
      id,
      order_number: params[0],
      buyer_id: params[1],
      total_amount: params[2],
      status: 'pending',
      payment_status: 'pending',
      payment_method: params[3],
      shipping_address: params[4],
      shipping_city: params[5],
      phone: params[6],
      customer_name: params[7],
      notes: params[8],
      created_at: new Date().toISOString()
    };
    memStore.orders.unshift(newOrder);
    return { rows: [newOrder], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  if (upper.includes('FROM ORDERS')) {
    if (upper.includes('COUNT(*) AS TOTAL_ORDERS')) {
      return {
        rows: [{
          total_orders: memStore.orders.length,
          pending_orders: memStore.orders.filter((o) => o.status === 'pending').length,
          processing_orders: memStore.orders.filter((o) => o.status === 'processing').length,
          completed_orders: memStore.orders.filter((o) => o.status === 'delivered').length,
          cancelled_orders: memStore.orders.filter((o) => o.status === 'cancelled').length,
          total_revenue: memStore.orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    }

    let sourceOrders = memStore.orders;
    if (upper.includes('WHERE O.BUYER_ID = $1') && params[0] !== undefined) {
      const userObj = memStore.users.find((u) => u.id === params[0]);
      sourceOrders = sourceOrders.filter((o) => o.buyer_id === params[0] || (userObj?.phone && o.phone === userObj.phone));
    } else if (upper.includes('WHERE OI.SELLER_ID = $1') && params[0] !== undefined) {
      const sellerOrderIds = new Set(memStore.orderItems.filter((oi) => oi.seller_id === params[0]).map((oi) => oi.order_id));
      sourceOrders = sourceOrders.filter((o) => sellerOrderIds.has(o.id));
    }
    const ords = sourceOrders.map((o) => {
      const items = memStore.orderItems.filter((oi) => oi.order_id === o.id);
      return { ...o, items };
    });
    return { rows: ords, rowCount: ords.length, command: 'SELECT', oid: 0, fields: [] };
  }

  if (upper.startsWith('INSERT INTO ORDER_ITEMS')) {
    const id = ++autoIdCounter;
    const newItem = {
      id,
      order_id: params[0],
      product_id: params[1],
      seller_id: params[2],
      product_title: params[3],
      quantity: params[4],
      unit_price: params[5]
    };
    memStore.orderItems.push(newItem);
    return { rows: [newItem], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  // 8. Sellers
  if (upper.includes('FROM SELLERS')) {
    if (upper.includes('COUNT(*) AS TOTAL_SELLERS')) {
      return {
        rows: [{
          total_sellers: memStore.sellers.length,
          verified_sellers: memStore.sellers.filter((s) => s.is_verified).length
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    }
    if (upper.includes('WHERE USER_ID = $1')) {
      const s = memStore.sellers.filter((seller) => seller.user_id === params[0]);
      return { rows: s, rowCount: s.length, command: 'SELECT', oid: 0, fields: [] };
    }
    const sellers = memStore.sellers.map((s) => {
      const u = memStore.users.find((user) => user.id === s.user_id);
      return {
        ...s,
        owner_name: u?.full_name,
        owner_email: u?.email,
        owner_phone: u?.phone,
        total_products: memStore.products.filter((p) => p.seller_id === s.id).length
      };
    });
    return { rows: sellers, rowCount: sellers.length, command: 'SELECT', oid: 0, fields: [] };
  }

  if (upper.startsWith('INSERT INTO SELLERS')) {
    const id = ++autoIdCounter;
    const newSeller = {
      id,
      user_id: params[0],
      store_name: params[1],
      business_phone: params[2],
      is_verified: false,
      rating: 5.0
    };
    memStore.sellers.push(newSeller);
    return { rows: [newSeller], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  // 9. Roles
  if (upper.includes('FROM ROLES')) {
    if (upper.includes('WHERE NAME = $1')) {
      const r = memStore.roles.filter((role) => role.name === params[0]);
      return { rows: r, rowCount: r.length, command: 'SELECT', oid: 0, fields: [] };
    }
    return { rows: memStore.roles, rowCount: memStore.roles.length, command: 'SELECT', oid: 0, fields: [] };
  }

  // 10. Admin Activity Logs
  if (upper.includes('FROM ADMIN_ACTIVITY_LOGS')) {
    return { rows: memStore.adminActivityLogs, rowCount: memStore.adminActivityLogs.length, command: 'SELECT', oid: 0, fields: [] };
  }

  if (upper.startsWith('INSERT INTO ADMIN_ACTIVITY_LOGS')) {
    const id = ++autoIdCounter;
    const log = {
      id,
      admin_id: params[0],
      admin_name: params[1],
      action: params[2],
      target_type: params[3],
      target_id: params[4],
      details: params[5],
      ip_address: params[6],
      created_at: new Date().toISOString()
    };
    memStore.adminActivityLogs.unshift(log);
    return { rows: [log], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  // 11. Marketplace Settings
  if (upper.startsWith('INSERT INTO MARKETPLACE_SETTINGS')) {
    if (params[0] && params[1] !== undefined) {
      memStore.marketplaceSettings[String(params[0])] = String(params[1]);
    }
    return { rows: [], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  if (upper.includes('FROM MARKETPLACE_SETTINGS')) {
    if (upper.includes("WHERE KEY = 'REQUIRE_PRODUCT_APPROVAL'")) {
      const val = memStore.marketplaceSettings.require_product_approval ?? 'false';
      return { rows: [{ value: val }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] };
    }
    const rows = Object.entries(memStore.marketplaceSettings).map(([key, value]) => ({ key, value }));
    return { rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] };
  }

  // 12. Updates and Deletes
  if (upper.startsWith('UPDATE USERS')) {
    if (upper.includes('PASSWORD_HASH = $1')) {
      const u = memStore.users.find((user) => user.id === params[1]);
      if (u) {
        u.password_hash = params[0];
        u.updated_at = new Date().toISOString();
      }
    } else if (upper.includes('IS_ACTIVE = $1')) {
      const u = memStore.users.find((user) => user.id === params[1]);
      if (u) u.is_active = params[0];
    } else if (upper.includes('ROLE_ID = $1')) {
      const targetId = params.length >= 3 ? params[2] : params[1];
      const u = memStore.users.find((user) => user.id === targetId);
      if (u) {
        u.role_id = params[0];
        if (params.length >= 3 && (params[1] === 'admin' || params[1] === 'user')) {
          u.role = params[1];
        }
      }
    } else if (upper.includes('PERMISSIONS = $1')) {
      const u = memStore.users.find((user) => user.id === params[1]);
      if (u) u.permissions = params[0];
    } else if (upper.includes('FULL_NAME = $1')) {
      const u = memStore.users.find((user) => user.id === params[3] || user.id === params[1]);
      if (u) {
        u.full_name = params[0];
        if (params[1] && typeof params[1] === 'string' && params[1].includes('@')) u.email = params[1];
        if (params[2]) u.phone = params[2];
      }
    }
    return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
  }

  if (upper.startsWith('DELETE FROM USERS')) {
    const targetId = params[0];
    memStore.users = memStore.users.filter((u) => u.id !== targetId);
    memStore.userProfiles = memStore.userProfiles.filter((up) => up.user_id !== targetId);
    memStore.sellers = memStore.sellers.filter((s) => s.user_id !== targetId);
    return { rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] };
  }

  if (upper.startsWith('UPDATE SELLERS')) {
    const s = memStore.sellers.find((seller) => seller.id === params[1]);
    if (s) s.is_verified = params[0];
    return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
  }

  if (upper.startsWith('UPDATE PRODUCTS')) {
    if (upper.includes('VIEWS_COUNT = VIEWS_COUNT + 1')) {
      const p = memStore.products.find((prod) => prod.id === params[0]);
      if (p) p.views_count = (Number(p.views_count) || 0) + 1;
    } else if (upper.includes('STOCK = GREATEST(0, STOCK - $1)')) {
      const p = memStore.products.find((prod) => prod.id === params[1]);
      if (p) p.stock = Math.max(0, (Number(p.stock) || 0) - Number(params[0] || 0));
    } else if (upper.includes('CATEGORY_ID = NULL WHERE CATEGORY_ID = $1')) {
      memStore.products.forEach((prod) => {
        if (prod.category_id === params[0]) prod.category_id = null;
      });
    } else if (upper.includes('TITLE = COALESCE($1, TITLE)')) {
      const p = memStore.products.find((prod) => prod.id === params[12]);
      if (p) {
        if (params[0] != null) p.title = params[0];
        if (params[1] != null) p.title_amharic = params[1];
        if (params[2] != null) p.description = params[2];
        if (params[3] != null) p.price = params[3];
        if (params[4] != null) p.original_price = params[4];
        if (params[5] != null) p.condition = params[5];
        if (params[6] != null) p.stock = params[6];
        if (params[7] != null) p.category_id = params[7];
        if (params[8] != null) p.region = params[8];
        if (params[9] != null) p.woreda = params[9];
        if (params[10] != null) p.city = params[10];
        if (params[11] != null) p.status = params[11];
        p.updated_at = new Date().toISOString();
      }
    } else if (upper.includes('STATUS = $1')) {
      const p = memStore.products.find((prod) => prod.id === params[1]);
      if (p) p.status = params[0];
    } else if (upper.includes('IS_FEATURED = $1')) {
      const p = memStore.products.find((prod) => prod.id === params[1]);
      if (p) p.is_featured = params[0];
    }
    return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
  }

  if (upper.startsWith('UPDATE ORDERS')) {
    if (upper.includes('PAYMENT_STATUS = $1')) {
      const o = memStore.orders.find((ord) => ord.id === params[2]);
      if (o) {
        o.payment_status = params[0];
        o.payment_notes = params[1];
      }
    } else if (upper.includes('STATUS = $1')) {
      const o = memStore.orders.find((ord) => ord.id === params[1]);
      if (o) o.status = params[0];
    }
    return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
  }

  // 13. Reports
  if (upper.includes('FROM REPORTS')) {
    if (upper.includes('COUNT(*) AS TOTAL_REPORTS')) {
      return {
        rows: [{
          total_reports: memStore.reports.length,
          pending_reports: memStore.reports.filter((r) => r.status === 'pending').length
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
    }
    const reports = memStore.reports.map((r) => {
      let target_title = 'Target Item';
      if (r.target_type === 'product') {
        const prod = memStore.products.find((p) => p.id === r.target_id);
        if (prod) target_title = prod.title;
      }
      return { ...r, target_title };
    });
    return { rows: reports, rowCount: reports.length, command: 'SELECT', oid: 0, fields: [] };
  }

  if (upper.startsWith('INSERT INTO REPORTS')) {
    const id = ++autoIdCounter;
    const newReport = {
      id,
      reporter_name: params[0],
      reporter_contact: params[1],
      target_type: params[2],
      target_id: params[3],
      reason: params[4],
      description: params[5],
      status: 'pending',
      created_at: new Date().toISOString()
    };
    memStore.reports.unshift(newReport);
    return { rows: [newReport], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
  }

  if (upper.startsWith('UPDATE REPORTS')) {
    const rep = memStore.reports.find((r) => r.id === params[2]);
    if (rep) {
      rep.status = params[0];
      rep.resolution_notes = params[1];
    }
    return { rows: [], rowCount: 1, command: 'UPDATE', oid: 0, fields: [] };
  }

  if (upper.startsWith('DELETE FROM PRODUCTS')) {
    memStore.products = memStore.products.filter((p) => p.id !== params[0]);
    return { rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] };
  }

  if (upper.startsWith('DELETE FROM CATEGORIES')) {
    memStore.categories = memStore.categories.filter((c) => c.id !== params[0]);
    return { rows: [], rowCount: 1, command: 'DELETE', oid: 0, fields: [] };
  }

  // Generic fallback
  return { rows: [], rowCount: 0, command: 'SELECT', oid: 0, fields: [] };
}

// Initialize tables and run migrations
export async function initializeDatabase(
  overrideUrl?: string,
  overrideDirectUrl?: string
): Promise<{ success: boolean; message: string; tablesCreated?: string[] }> {
  if (!overrideUrl && !process.env.DATABASE_URL) {
    dotenv.config();
  }
  if (overrideUrl) {
    process.env.DATABASE_URL = overrideUrl;
  }
  if (overrideDirectUrl) {
    process.env.DIRECT_URL = overrideDirectUrl;
  }
  const dbUrl = getDatabaseUrl();
  const directUrl = getDirectUrl();
  if (!dbUrl && !directUrl) {
    isConnectedToNeon = false;
    lastDbError = 'DATABASE_URL is not set';
    return {
      success: false,
      message: 'DATABASE_URL environment variable is not defined. Please provide a Neon PostgreSQL connection string.'
    };
  }

  const migrationUrl = directUrl || dbUrl!;
  const isLocalMigration = migrationUrl.includes('localhost') || migrationUrl.includes('127.0.0.1');
  const migrationPool = new Pool({
    connectionString: migrationUrl,
    ssl: isLocalMigration ? false : { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 15000,
  });

  try {
    const currentPool = migrationPool;
    // Test connection
    const checkRes = await currentPool.query('SELECT NOW() as current_time, current_database() as db_name, current_user as user_name');
    console.log(`Connected to Neon PostgreSQL: ${checkRes.rows[0].db_name} at ${checkRes.rows[0].current_time}`);
    isConnectedToNeon = true;
    lastDbError = null;

    // Begin table creations / migrations
    await currentPool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(50) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
        role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        permissions TEXT[] DEFAULT '{}',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_role_valid'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT chk_users_role_valid CHECK (role IN ('admin', 'user'));
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        avatar_url TEXT,
        bio TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sellers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        store_name VARCHAR(150) NOT NULL,
        business_phone VARCHAR(50),
        is_verified BOOLEAN DEFAULT FALSE,
        rating NUMERIC(3,2) DEFAULT 5.00,
        total_sales INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS business_phone VARCHAR(50);

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_amharic VARCHAR(100),
        slug VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER REFERENCES sellers(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        title_amharic VARCHAR(255),
        description TEXT NOT NULL,
        price NUMERIC(12,2) NOT NULL,
        original_price NUMERIC(12,2),
        condition VARCHAR(20) NOT NULL CHECK (condition IN ('new', 'used')),
        stock INTEGER NOT NULL DEFAULT 1,
        region VARCHAR(100) NOT NULL,
        woreda VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
        is_featured BOOLEAN DEFAULT FALSE,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_statuses (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE,
        buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        total_amount NUMERIC(12,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Telebirr',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_notes TEXT,
        shipping_address TEXT NOT NULL,
        shipping_city VARCHAR(100),
        phone VARCHAR(50) NOT NULL,
        customer_name VARCHAR(150),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_notes TEXT;

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        seller_id INTEGER REFERENCES sellers(id) ON DELETE SET NULL,
        product_title VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(12,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_name VARCHAR(150),
        reporter_contact VARCHAR(100),
        target_type VARCHAR(50) NOT NULL,
        target_id INTEGER NOT NULL,
        reason VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_name VARCHAR(150),
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(100),
        target_id VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketplace_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
      CREATE INDEX IF NOT EXISTS idx_products_region ON products(region);
      CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_seller ON order_items(seller_id);
    `);

    // Seed roles
    for (const r of INITIAL_ROLES) {
      await currentPool.query(`
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `, [r.name, r.description]);
    }

    // Backfill database-level users.role column ('admin' vs 'user') for all existing accounts without clobbering existing valid 'admin'/'user' assignments
    await currentPool.query(`
      UPDATE users u
      SET role = CASE
        WHEN r.name IN ('superadmin', 'admin') THEN 'admin'
        ELSE 'user'
      END
      FROM roles r
      WHERE u.role_id = r.id
        AND (
          u.role IS NULL
          OR u.role NOT IN ('admin', 'user')
          OR (r.name IN ('superadmin', 'admin') AND u.role <> 'admin')
        );

      UPDATE users
      SET role = 'user'
      WHERE role IS NULL OR role NOT IN ('admin', 'user');
    `);

    // Seed order statuses
    for (const os of INITIAL_ORDER_STATUSES) {
      await currentPool.query(`
        INSERT INTO order_statuses (code, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO NOTHING
      `, [os.code, os.name, os.description]);
    }

    // Seed categories
    for (const cat of INITIAL_CATEGORIES) {
      await currentPool.query(`
        INSERT INTO categories (name, name_amharic, slug, icon, display_order)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (slug) DO NOTHING
      `, [cat.name, cat.name_amharic, cat.slug, cat.icon, cat.display_order]);
    }

    // Seed marketplace settings
    const defaultSettings = [
      { key: 'site_name', value: 'Mela Market | መላ ማርኬት', description: 'Platform branding name' },
      { key: 'contact_phone', value: '0904503245', description: 'Customer support hotline' },
      { key: 'contact_whatsapp', value: '@brmiki21', description: 'WhatsApp support handle' },
      { key: 'contact_email', value: 'support@melamarket.et', description: 'Official contact email' },
      { key: 'announcement', value: 'እንኳን ወደ መላ ማርኬት በደህና መጡ! አዳዲስ እና ያገለገሉ እቃዎችን በአስተማማኝ ሁኔታ ይግዙ እና ይሽጡ። (Welcome to Mela Market - Buy & Sell across Ethiopia!)', description: 'Banner announcement' },
      { key: 'require_product_approval', value: 'false', description: 'Whether new product listings require admin approval' }
    ];

    for (const s of defaultSettings) {
      await currentPool.query(`
        INSERT INTO marketplace_settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO UPDATE SET updated_at = NOW()
      `, [s.key, s.value, s.description]);
    }

    // Clean up any temporary setup keys so only public marketplace settings remain
    await currentPool.query(`DELETE FROM marketplace_settings WHERE key LIKE 'admin_setup_%'`);

    // Seed Super Admin in Neon (only if none exists)
    await seedInitialSuperAdmin(currentPool);

    // Seed realistic products in Neon
    await seedInitialProducts(currentPool);

    // Refresh and warm up main query pool
    const mainPool = getPool(true);
    if (mainPool && mainPool !== migrationPool) {
      try {
        await mainPool.query('SELECT 1');
      } catch (poolWarmErr: any) {
        console.warn('Main query pool warm-up notice:', poolWarmErr.message);
      }
    }

    try {
      await migrationPool.end();
    } catch {}

    return {
      success: true,
      message: 'Neon PostgreSQL connected and schemas initialized successfully!',
      tablesCreated: [
        'roles', 'users', 'user_profiles', 'sellers', 'categories',
        'products', 'product_images', 'order_statuses', 'orders',
        'order_items', 'admin_activity_logs', 'marketplace_settings'
      ]
    };
  } catch (err: any) {
    try { await migrationPool.end(); } catch {}
    isConnectedToNeon = false;
    const cleanErr = toCleanDbError(err, 'Unable to connect to Neon PostgreSQL.');
    lastDbError = cleanErr;
    console.error('Failed to initialize Neon PostgreSQL database:', cleanErr);
    return {
      success: false,
      message: `Database connection / migration error: ${cleanErr}`
    };
  }
}

// Seed Super Admin in Neon (only if no administrator account exists yet)
async function seedInitialSuperAdmin(poolInstance: pg.Pool) {
  const existingAdminRes = await poolInstance.query(`
    SELECT u.id, u.full_name, u.email, u.password_hash, u.role as db_role, r.name as role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.role = 'admin' OR r.name IN ('superadmin', 'admin')
    ORDER BY (CASE WHEN r.name = 'superadmin' THEN 0 ELSE 1 END), u.id ASC
    LIMIT 1
  `);

  if (existingAdminRes.rows.length > 0) {
    const existingAdmin = existingAdminRes.rows[0];
    if (existingAdmin.db_role !== 'admin') {
      await poolInstance.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [existingAdmin.id]);
    }

    const ownerResetPw = process.env.OWNER_RESET_PASSWORD?.trim();
    const ownerResetEmail = process.env.OWNER_RESET_EMAIL?.trim().toLowerCase();
    if (
      ownerResetPw &&
      ownerResetPw.length >= 8 &&
      (!ownerResetEmail || (existingAdmin.email && existingAdmin.email.toLowerCase() === ownerResetEmail))
    ) {
      const alreadyMatches = existingAdmin.password_hash
        ? await bcrypt.compare(ownerResetPw, existingAdmin.password_hash)
        : false;
      if (!alreadyMatches) {
        const salt = await bcrypt.genSalt(12);
        const newHash = await bcrypt.hash(ownerResetPw, salt);
        await poolInstance.query(
          `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND role = 'admin'`,
          [newHash, existingAdmin.id]
        );
        await poolInstance.query(
          `INSERT INTO admin_activity_logs (admin_id, admin_name, action, target_type, target_id, details, ip_address)
           VALUES ($1, $2, 'OWNER_ENV_SUPERADMIN_PASSWORD_RESET', 'AUTH', $3, 'Owner reset Super Admin password via private server secret', 'server-env')`,
          [existingAdmin.id, existingAdmin.full_name || 'Mela Super Admin', String(existingAdmin.id)]
        );
      }
    }
    return;
  }

  const adminEmail = process.env.SUPERADMIN_EMAIL || 'admin@melamarket.et';
  const adminPassword = process.env.SUPERADMIN_PASSWORD || crypto.randomBytes(24).toString('hex');
  const adminName = process.env.SUPERADMIN_NAME || 'Mela Super Admin';
  const adminPhone = process.env.SUPERADMIN_PHONE || '+251911223344';

  const roleRes = await poolInstance.query("SELECT id FROM roles WHERE name = 'superadmin'");
  if (roleRes.rows.length === 0) return;
  const superadminRoleId = roleRes.rows[0].id;

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const userRes = await poolInstance.query(`
    INSERT INTO users (full_name, email, phone, password_hash, role_id, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 'admin', TRUE)
    RETURNING id
  `, [adminName, adminEmail, adminPhone, passwordHash, superadminRoleId]);

  const adminUserId = userRes.rows[0].id;

  await poolInstance.query(`
    INSERT INTO user_profiles (user_id, bio, avatar_url)
    VALUES ($1, 'Chief Marketplace Administrator', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80')
    ON CONFLICT (user_id) DO NOTHING
  `, [adminUserId]);

  await poolInstance.query(`
    INSERT INTO admin_activity_logs (admin_id, admin_name, action, target_type, target_id, details)
    VALUES ($1, $2, 'INITIAL_SUPERADMIN_SETUP', 'SYSTEM', '1', 'Initial Super Admin account automatically provisioned')
  `, [adminUserId, adminName]);

  console.log(`Initial Super Admin provisioned securely for email: ${adminEmail}`);
}

// Private owner-only Super Admin password reset (never creates a new admin account or exposes hashes)
export async function resetSuperAdminPasswordInDb(
  newPassword: string,
  expectedEmail?: string
): Promise<{ id: number; fullName: string; email: string; roleName: string; dbRole: string }> {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters long.');
  }

  if (!isNeonConnected() && getDatabaseUrl()) {
    await initializeDatabase();
  }

  const activePool = getPool();
  if (!activePool || !isNeonConnected()) {
    throw new Error('Neon PostgreSQL is not connected.');
  }

  const client = await activePool.connect();
  try {
    await client.query('BEGIN');

    const superAdminRes = await client.query(`
      SELECT u.id, u.full_name, u.email, u.role as db_role, u.is_active, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'superadmin' AND u.role = 'admin'
      ORDER BY u.id ASC
      LIMIT 1
    `);

    if (superAdminRes.rows.length === 0) {
      throw new Error('Existing Super Admin account was not found in Neon PostgreSQL.');
    }

    const admin = superAdminRes.rows[0];
    if (!admin.is_active) {
      throw new Error('Super Admin account is not active.');
    }

    if (expectedEmail && expectedEmail.trim()) {
      if (!admin.email || admin.email.toLowerCase() !== expectedEmail.trim().toLowerCase()) {
        throw new Error('Provided email does not match the existing Super Admin account.');
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND role = 'admin'`,
      [passwordHash, admin.id]
    );

    await client.query(
      `INSERT INTO admin_activity_logs (admin_id, admin_name, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, 'OWNER_SUPERADMIN_PASSWORD_RESET', 'AUTH', $3, 'Owner completed private CLI Super Admin password reset', 'local-owner-socket')`,
      [admin.id, admin.full_name, String(admin.id)]
    );

    await client.query('COMMIT');

    return {
      id: admin.id,
      fullName: admin.full_name,
      email: admin.email,
      roleName: admin.role_name || 'superadmin',
      dbRole: admin.db_role || 'admin'
    };
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function getExistingSuperAdminSummary(): Promise<{ id: number; fullName: string; email: string; roleName: string; dbRole: string } | null> {
  if (!isNeonConnected() && getDatabaseUrl()) {
    await initializeDatabase();
  }
  const activePool = getPool();
  if (!activePool || !isNeonConnected()) return null;

  const res = await activePool.query(`
    SELECT u.id, u.full_name, u.email, u.role as db_role, r.name as role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE r.name = 'superadmin' AND u.role = 'admin'
    ORDER BY u.id ASC
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    roleName: row.role_name || 'superadmin',
    dbRole: row.db_role || 'admin'
  };
}

// Seed initial Ethiopian products in Neon
async function seedInitialProducts(poolInstance: pg.Pool) {
  const prodCountRes = await poolInstance.query("SELECT COUNT(*) as count FROM products");
  if (parseInt(prodCountRes.rows[0].count, 10) > 0) {
    return;
  }

  const sellerRoleRes = await poolInstance.query("SELECT id FROM roles WHERE name = 'seller'");
  const sellerRoleId = sellerRoleRes.rows[0]?.id;

  const salt = await bcrypt.genSalt(10);
  const sellerHash = await bcrypt.hash('SellerPass123!', salt);

  const sellerUserRes = await poolInstance.query(`
    INSERT INTO users (full_name, email, phone, password_hash, role_id, role, is_active)
    VALUES ($1, $2, $3, $4, $5, 'user', TRUE)
    ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id
  `, ['Dawit Tadesse (ዳዊት)', 'dawit.seller@melamarket.et', '+251912345678', sellerHash, sellerRoleId]);

  const sellerUserId = sellerUserRes.rows[0].id;

  const sellerRes = await poolInstance.query(`
    INSERT INTO sellers (user_id, store_name, business_phone, is_verified, rating)
    VALUES ($1, 'Abyssinia Premium Goods (አቢሲኒያ የንግድ ቤት)', '+251912345678', TRUE, 4.9)
    ON CONFLICT (user_id) DO UPDATE SET store_name = EXCLUDED.store_name
    RETURNING id
  `, [sellerUserId]);

  const sellerId = sellerRes.rows[0].id;

  const catsRes = await poolInstance.query("SELECT id, slug FROM categories");
  const catMap: Record<string, number> = {};
  catsRes.rows.forEach((r: any) => { catMap[r.slug] = r.id; });

  for (const p of memStore.products) {
    const catId = p.category_id;
    const prodRes = await poolInstance.query(`
      INSERT INTO products (
        seller_id, category_id, title, title_amharic, description,
        price, original_price, condition, stock, region, woreda, city, status, is_featured
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'approved', TRUE)
      RETURNING id
    `, [
      sellerId, catId, p.title, p.title_amharic, p.description,
      p.price, p.original_price, p.condition, p.stock, p.region, p.woreda, p.city
    ]);

    const newProdId = prodRes.rows[0].id;
    await poolInstance.query(`
      INSERT INTO product_images (product_id, image_url, is_primary)
      VALUES ($1, $2, TRUE)
    `, [newProdId, p.image]);
  }

  console.log('Seeded initial Ethiopian products in Neon PostgreSQL.');
}

// Database Diagnostics for the Super Admin
export async function getDbStatusReport() {
  const dbUrl = getDatabaseUrl();
  const directUrl = getDirectUrl();

  if (!dbUrl && !directUrl) {
    return {
      connected: false,
      configured: false,
      databaseUrlMasked: null,
      directUrlConfigured: false,
      directUrlMasked: null,
      host: null,
      database: null,
      error: 'DATABASE_URL environment variable is not defined.',
      instructions: 'Please configure DATABASE_URL (and optional DIRECT_URL) with your Neon PostgreSQL connection string.'
    };
  }

  const maskUrl = (raw?: string) => {
    if (!raw) return null;
    try {
      const urlObj = new URL(raw);
      return `${urlObj.protocol}//${urlObj.username}:****@${urlObj.host}${urlObj.pathname}`;
    } catch {
      return raw.substring(0, 15) + '...masked...';
    }
  };

  try {
    const currentPool = getPool();
    if (!currentPool) throw new Error('Database pool could not be instantiated');

    const testRes = await currentPool.query(`
      SELECT
        NOW() as server_time,
        current_database() as database_name,
        current_user as user_name,
        version() as pg_version
    `);

    const counts: Record<string, number> = {};
    const tables = ['users', 'roles', 'sellers', 'categories', 'products', 'orders', 'admin_activity_logs'];

    for (const t of tables) {
      try {
        const cRes = await currentPool.query(`SELECT COUNT(*) as count FROM ${t}`);
        counts[t] = parseInt(cRes.rows[0].count, 10);
      } catch {
        counts[t] = 0;
      }
    }

    let hostName = 'Neon Cloud Serverless';
    if (dbUrl) {
      try {
        const urlObj = new URL(dbUrl);
        hostName = urlObj.host;
      } catch {}
    }

    isConnectedToNeon = true;
    lastDbError = null;

    return {
      connected: true,
      configured: true,
      databaseUrlMasked: maskUrl(dbUrl),
      directUrlConfigured: !!directUrl,
      directUrlMasked: maskUrl(directUrl),
      host: hostName,
      database: testRes.rows[0].database_name,
      user: testRes.rows[0].user_name,
      serverTime: testRes.rows[0].server_time,
      version: testRes.rows[0].pg_version,
      counts,
      lastError: null
    };
  } catch (err: any) {
    isConnectedToNeon = false;
    const cleanErr = toCleanDbError(err, 'Neon PostgreSQL connection test failed.');
    lastDbError = cleanErr;
    return {
      connected: false,
      configured: true,
      databaseUrlMasked: maskUrl(dbUrl),
      directUrlConfigured: !!directUrl,
      directUrlMasked: maskUrl(directUrl),
      error: cleanErr,
      instructions: 'Neon PostgreSQL connection test failed. Ensure your connection string includes sslmode=require and your credentials are valid.'
    };
  }
}
