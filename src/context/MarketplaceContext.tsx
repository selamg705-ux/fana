import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Order, Review, OrderStatus, Category, RegionLocation } from '../types';
import { sampleProducts, initialReviews } from '../data/sampleProducts';
import { productCategories } from '../data/categories';
import { ethiopianLocations } from '../data/locations';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface MarketplaceContextType {
  products: Product[];
  categories: Category[];
  categoryCounts: Record<string, number>;
  selectedCategory: string;
  setSelectedCategory: (catId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedRegion: string;
  setSelectedRegion: (regionId: string) => void;
  selectedZone: string;
  setSelectedZone: (zoneId: string) => void;
  resetFilters: () => void;
  filteredProducts: Product[];
  availableZones: { id: string; name: { en: string; am: string; ti: string } }[];

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;

  // Modals & Navigation
  viewingProduct: Product | null;
  openProductModal: (product: Product) => void;
  closeProductModal: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSellModalOpen: boolean;
  setIsSellModalOpen: (open: boolean) => void;
  isAdminModalOpen: boolean;
  setIsAdminModalOpen: (open: boolean) => void;
  isAboutModalOpen: boolean;
  setIsAboutModalOpen: (open: boolean) => void;
  isHelpModalOpen: boolean;
  setIsHelpModalOpen: (open: boolean) => void;

  // Product Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<boolean>;
  updateProductQuantity: (productId: string, newQuantity: number) => Promise<void>;

  // Order & Payment Actions
  orders: Order[];
  placeOrder: (orderInfo: {
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    region: string;
    zone: string;
    woreda?: string;
    notes?: string;
  }, userId?: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  uploadPaymentReceipt: (orderId: string, receiptData: {
    receiptUrl: string;
    transactionRef?: string;
    paymentMethod?: string;
  }) => Promise<void>;
  verifyPaymentReceipt: (orderId: string, verified: boolean) => Promise<void>;
  lastCreatedOrder: Order | null;
  clearLastCreatedOrder: () => void;
  refetchSupabaseData: () => Promise<void>;

  // Reviews
  reviews: Review[];
  getProductReviews: (productId: string) => Review[];
  addReview: (review: {
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
  }) => Promise<Review>;
  canUserReview: (productId: string, userId?: string) => boolean;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

const PRODUCTS_STORAGE_KEY = 'mela_marketplace_products_v2';
const CART_STORAGE_KEY = 'mela_marketplace_cart_v2';
const ORDERS_STORAGE_KEY = 'mela_marketplace_orders_v2';
const REVIEWS_STORAGE_KEY = 'mela_marketplace_reviews_v2';

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Products
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return sampleProducts;
  });

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Orders
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [
      {
        id: 'ORD-2026-9041',
        customerId: 'user-sample-1',
        customerName: 'Alemayehu Teklu',
        customerPhone: '+251911223344',
        deliveryAddress: 'Bole Medhanialem, Mall Rd, Apt 4B',
        region: 'addis_ababa',
        zone: 'bole',
        woreda: 'bole_01',
        items: [
          {
            productId: 'prod-1',
            productTitle: 'Specialty Grade 1 Yirgacheffe Washed Coffee Beans (1kg)',
            price: 1850,
            quantity: 2,
            imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80',
          },
        ],
        totalAmount: 3700,
        orderDate: '2026-10-31',
        status: 'Delivered',
        notes: 'Please call before arrival.',
      },
    ];
  });

  // Reviews
  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialReviews;
      }
    }
    return initialReviews;
  });

  // Modals & Navigation
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegion, setSelectedRegionState] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');

  // Fetch products and orders from Supabase
  const refetchSupabaseData = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // Fetch products
      const { data: dbProducts } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbProducts && dbProducts.length > 0) {
        const mappedProducts: Product[] = dbProducts.map((p) => ({
          id: p.id,
          title: {
            en: p.title_en || '',
            am: p.title_am || '',
            ti: p.title_ti || '',
          },
          description: {
            en: p.description_en || '',
            am: p.description_am || '',
            ti: p.description_ti || '',
          },
          categoryId: p.category_id,
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : undefined,
          condition: p.condition,
          quantity: p.quantity ?? 1,
          images: p.images || [],
          sellerId: p.seller_id,
          sellerName: p.seller_name,
          sellerPhone: p.seller_phone,
          sellerIsVerified: p.seller_is_verified,
          region: p.region,
          zone: p.zone,
          woreda: p.woreda,
          rating: Number(p.rating || 5.0),
          reviewsCount: Number(p.reviews_count || 0),
          createdAt: p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        }));
        setProducts(mappedProducts);
      }

      // Fetch orders
      const { data: dbOrders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (dbOrders && dbOrders.length > 0) {
        const mappedOrders: Order[] = dbOrders.map((o) => ({
          id: o.id,
          customerId: o.customer_id || 'guest',
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          deliveryAddress: o.delivery_address,
          region: o.region,
          zone: o.zone,
          woreda: o.woreda,
          items: (o.order_items || []).map((it: any) => ({
            productId: it.product_id,
            productTitle: it.product_title,
            price: Number(it.price),
            quantity: it.quantity,
            imageUrl: it.image_url || '',
          })),
          totalAmount: Number(o.total_amount),
          orderDate: o.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: o.status || 'Pending',
          notes: o.notes,
          paymentReceipt: o.receipt_url
            ? {
                receiptUrl: o.receipt_url,
                uploadedAt: o.receipt_uploaded_at || o.created_at,
                transactionRef: o.transaction_ref,
                paymentMethod: o.payment_method,
                verified: Boolean(o.payment_verified),
              }
            : undefined,
        }));
        setOrders(mappedOrders);
      }
    } catch (err) {
      console.warn('Supabase fetch notice:', err);
    }
  };

  useEffect(() => {
    refetchSupabaseData();
  }, []);

  // Persist products
  useEffect(() => {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  // Persist cart
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  // Persist orders
  useEffect(() => {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  // Persist reviews
  useEffect(() => {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  }, [reviews]);

  // When region changes, reset zone
  const setSelectedRegion = (regionId: string) => {
    setSelectedRegionState(regionId);
    setSelectedZone('');
  };

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSelectedRegionState('');
    setSelectedZone('');
  };

  // Available dependent zones
  const availableZones = useMemo(() => {
    if (!selectedRegion) return [];
    const found = ethiopianLocations.find((loc) => loc.id === selectedRegion);
    return found ? found.zones : [];
  }, [selectedRegion]);

  // Dynamic Category Counts based on active products
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
    };
    productCategories.forEach((cat) => {
      counts[cat.id] = 0;
    });
    products.forEach((prod) => {
      if (counts[prod.categoryId] !== undefined) {
        counts[prod.categoryId] += 1;
      }
    });
    return counts;
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category match
      if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) {
        return false;
      }

      // Region match
      if (selectedRegion && product.region !== selectedRegion) {
        return false;
      }

      // Zone match
      if (selectedZone && product.zone !== selectedZone) {
        return false;
      }

      // Search match across English, Amharic, and Tigrinya titles, descriptions, categories, and locations
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleEn = product.title.en.toLowerCase();
        const titleAm = product.title.am.toLowerCase();
        const titleTi = product.title.ti.toLowerCase();
        const descEn = product.description.en.toLowerCase();
        const descAm = product.description.am.toLowerCase();
        const descTi = product.description.ti.toLowerCase();
        const seller = product.sellerName.toLowerCase();
        const reg = product.region.toLowerCase();
        const zn = product.zone.toLowerCase();
        const wr = (product.woreda || '').toLowerCase();

        const match =
          titleEn.includes(query) ||
          titleAm.includes(query) ||
          titleTi.includes(query) ||
          descEn.includes(query) ||
          descAm.includes(query) ||
          descTi.includes(query) ||
          seller.includes(query) ||
          reg.includes(query) ||
          zn.includes(query) ||
          wr.includes(query);

        if (!match) return false;
      }

      return true;
    });
  }, [products, selectedCategory, selectedRegion, selectedZone, searchQuery]);

  // Cart operations
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const maxStock = product.quantity ?? 1;
        const newQty = Math.min(maxStock, existing.quantity + quantity);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.quantity ?? 1;
          return { ...item, quantity: Math.min(maxStock, quantity) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Product Modal
  const openProductModal = (product: Product) => setViewingProduct(product);
  const closeProductModal = () => setViewingProduct(null);

  // Add Product
  const addProduct = async (
    data: Omit<Product, 'id' | 'createdAt' | 'rating' | 'reviewsCount'>
  ): Promise<Product> => {
    const newProduct: Product = {
      ...data,
      id: 'prod-' + Date.now().toString(36),
      rating: 5.0,
      reviewsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setProducts((prev) => [newProduct, ...prev]);

    const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    if (isSupabaseConfigured && supabase) {
      try {
        const payload: any = {
          title_en: newProduct.title.en,
          title_am: newProduct.title.am,
          title_ti: newProduct.title.ti,
          description_en: newProduct.description.en,
          description_am: newProduct.description.am,
          description_ti: newProduct.description.ti,
          category_id: newProduct.categoryId,
          price: newProduct.price,
          original_price: newProduct.originalPrice,
          condition: newProduct.condition,
          quantity: newProduct.quantity,
          images: newProduct.images,
          seller_name: newProduct.sellerName,
          seller_phone: newProduct.sellerPhone,
          seller_is_verified: newProduct.sellerIsVerified,
          region: newProduct.region,
          zone: newProduct.zone,
          woreda: newProduct.woreda,
        };

        if (isUUID(newProduct.sellerId)) {
          payload.seller_id = newProduct.sellerId;
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('products')
          .insert([payload])
          .select()
          .single();

        if (inserted) {
          const originalTempId = newProduct.id;
          newProduct.id = inserted.id;
          setProducts((prev) => prev.map((p) => (p.id === originalTempId ? { ...p, id: inserted.id } : p)));
        } else if (insertErr) {
          console.warn('Supabase product insert error:', insertErr);
        }
      } catch (err) {
        console.warn('Supabase product insert sync error:', err);
      }
    }

    return newProduct;
  };

  // Update Product Quantity
  const updateProductQuantity = async (productId: string, newQuantity: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: Math.max(0, newQuantity) } : p))
    );
    if (viewingProduct?.id === productId) {
      setViewingProduct((prev) => (prev ? { ...prev, quantity: Math.max(0, newQuantity) } : null));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('products')
          .update({ quantity: Math.max(0, newQuantity) })
          .eq('id', productId);
      } catch (err) {
        console.warn('Supabase update product quantity error:', err);
      }
    }
  };

  // Delete Product
  const deleteProduct = async (productId: string): Promise<boolean> => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (viewingProduct?.id === productId) {
      setViewingProduct(null);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('products').delete().eq('id', productId);
      } catch (err) {
        console.warn('Supabase delete error:', err);
      }
    }
    return true;
  };

  // Place Order (decrements product stock)
  const placeOrder = async (
    orderInfo: {
      customerName: string;
      customerPhone: string;
      deliveryAddress: string;
      region: string;
      zone: string;
      woreda?: string;
      notes?: string;
    },
    userId?: string
  ): Promise<Order> => {
    const isUUID = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      productTitle: item.product.title.en,
      price: item.product.price,
      quantity: item.quantity,
      imageUrl: item.product.images[0] || '',
    }));

    const newOrder: Order = {
      id: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: userId || 'guest-' + Date.now().toString(36),
      customerName: orderInfo.customerName,
      customerPhone: orderInfo.customerPhone,
      deliveryAddress: orderInfo.deliveryAddress,
      region: orderInfo.region,
      zone: orderInfo.zone,
      woreda: orderInfo.woreda,
      items: orderItems,
      totalAmount: cartTotal,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      notes: orderInfo.notes,
    };

    // Decrement stock for ordered items
    setProducts((prev) =>
      prev.map((prod) => {
        const itemInCart = cart.find((it) => it.product.id === prod.id);
        if (itemInCart) {
          const updatedStock = Math.max(0, (prod.quantity ?? 1) - itemInCart.quantity);
          return { ...prod, quantity: updatedStock };
        }
        return prod;
      })
    );

    setOrders((prev) => [newOrder, ...prev]);
    setLastCreatedOrder(newOrder);
    clearCart();

    if (isSupabaseConfigured && supabase) {
      try {
        const orderPayload: any = {
          customer_name: newOrder.customerName,
          customer_phone: newOrder.customerPhone,
          delivery_address: newOrder.deliveryAddress,
          region: newOrder.region,
          zone: newOrder.zone,
          woreda: newOrder.woreda,
          total_amount: newOrder.totalAmount,
          status: newOrder.status,
          notes: newOrder.notes,
        };

        if (isUUID(newOrder.customerId)) {
          orderPayload.customer_id = newOrder.customerId;
        }

        const { data: created, error: ordErr } = await supabase
          .from('orders')
          .insert([orderPayload])
          .select()
          .single();

        if (created) {
          const originalTempId = newOrder.id;
          newOrder.id = created.id;
          setOrders((prev) => prev.map((o) => (o.id === originalTempId ? { ...o, id: created.id } : o)));
          setLastCreatedOrder((prev) => (prev ? { ...prev, id: created.id } : null));

          const itemsToInsert = orderItems.map((item) => ({
            order_id: created.id,
            product_id: isUUID(item.productId) ? item.productId : null,
            product_title: item.productTitle,
            price: item.price,
            quantity: item.quantity,
            image_url: item.imageUrl,
          }));
          await supabase.from('order_items').insert(itemsToInsert);

          // Update product stock in DB
          for (const item of cart) {
            if (isUUID(item.product.id)) {
              const p = products.find((pr) => pr.id === item.product.id);
              if (p) {
                const newStock = Math.max(0, (p.quantity ?? 1) - item.quantity);
                await supabase.from('products').update({ quantity: newStock }).eq('id', p.id);
              }
            }
          }
        } else if (ordErr) {
          console.warn('Supabase order insert error:', ordErr);
        }
      } catch (err) {
        console.warn('Supabase order insert sync error:', err);
      }
    }

    return newOrder;
  };

  // Upload Payment Receipt Screenshot
  const uploadPaymentReceipt = async (
    orderId: string,
    receiptData: {
      receiptUrl: string;
      transactionRef?: string;
      paymentMethod?: string;
    }
  ) => {
    const updatedReceipt = {
      receiptUrl: receiptData.receiptUrl,
      uploadedAt: new Date().toISOString(),
      transactionRef: receiptData.transactionRef,
      paymentMethod: receiptData.paymentMethod || 'Telebirr',
      verified: false, // Never verified merely because it was uploaded
    };

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId ? { ...ord, paymentReceipt: updatedReceipt } : ord
      )
    );

    if (lastCreatedOrder && lastCreatedOrder.id === orderId) {
      setLastCreatedOrder((prev) =>
        prev ? { ...prev, paymentReceipt: updatedReceipt } : null
      );
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            receipt_url: updatedReceipt.receiptUrl,
            transaction_ref: updatedReceipt.transactionRef,
            payment_method: updatedReceipt.paymentMethod,
            receipt_uploaded_at: updatedReceipt.uploadedAt,
            payment_verified: false,
          })
          .eq('id', orderId);
      } catch (err) {
        console.warn('Supabase receipt update error:', err);
      }
    }
  };

  // Verify Payment Receipt (Admin only)
  const verifyPaymentReceipt = async (orderId: string, verified: boolean) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId && ord.paymentReceipt) {
          return {
            ...ord,
            paymentReceipt: { ...ord.paymentReceipt, verified },
          };
        }
        return ord;
      })
    );

    if (lastCreatedOrder && lastCreatedOrder.id === orderId && lastCreatedOrder.paymentReceipt) {
      setLastCreatedOrder((prev) =>
        prev
          ? {
              ...prev,
              paymentReceipt: { ...prev.paymentReceipt!, verified },
            }
          : null
      );
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({ payment_verified: verified })
          .eq('id', orderId);
      } catch (err) {
        console.warn('Supabase verify payment error:', err);
      }
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status } : ord))
    );

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('orders').update({ status }).eq('id', orderId);
      } catch (err) {
        console.warn('Supabase status update error:', err);
      }
    }
  };

  const clearLastCreatedOrder = () => setLastCreatedOrder(null);

  // Reviews
  const getProductReviews = (productId: string) => {
    return reviews.filter((r) => r.productId === productId);
  };

  const canUserReview = (productId: string, userId?: string) => {
    if (!userId) return false;
    const alreadyReviewed = reviews.some(
      (r) => r.productId === productId && r.userId === userId
    );
    if (alreadyReviewed) return false;
    return true;
  };

  const addReview = async (reviewData: {
    productId: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
  }): Promise<Review> => {
    const hasOrdered = orders.some(
      (ord) =>
        ord.customerId === reviewData.userId &&
        ord.items.some((item) => item.productId === reviewData.productId)
    );

    const newRev: Review = {
      id: 'rev-' + Date.now().toString(36),
      productId: reviewData.productId,
      userId: reviewData.userId,
      userName: reviewData.userName,
      rating: Math.max(1, Math.min(5, reviewData.rating)),
      comment: reviewData.comment,
      date: new Date().toISOString().split('T')[0],
      isVerifiedPurchase: hasOrdered || true,
    };

    setReviews((prev) => [newRev, ...prev]);

    // Recalculate average rating for the product
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id === reviewData.productId) {
          const productReviews = [newRev, ...reviews.filter((r) => r.productId === prod.id)];
          const totalRating = productReviews.reduce((sum, r) => sum + r.rating, 0);
          const avg = Number((totalRating / productReviews.length).toFixed(1));
          return {
            ...prod,
            rating: avg,
            reviewsCount: productReviews.length,
          };
        }
        return prod;
      })
    );

    if (viewingProduct && viewingProduct.id === reviewData.productId) {
      const currentReviews = [newRev, ...reviews.filter((r) => r.productId === viewingProduct.id)];
      const totalRating = currentReviews.reduce((sum, r) => sum + r.rating, 0);
      const avg = Number((totalRating / currentReviews.length).toFixed(1));
      setViewingProduct({
        ...viewingProduct,
        rating: avg,
        reviewsCount: currentReviews.length,
      });
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('reviews').insert([
          {
            product_id: newRev.productId,
            user_id: newRev.userId,
            user_name: newRev.userName,
            rating: newRev.rating,
            comment: newRev.comment,
            is_verified_purchase: newRev.isVerifiedPurchase,
          },
        ]);
      } catch (err) {
        console.warn('Supabase review insert sync error:', err);
      }
    }

    return newRev;
  };

  return (
    <MarketplaceContext.Provider
      value={{
        products,
        categories: productCategories,
        categoryCounts,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        selectedRegion,
        setSelectedRegion,
        selectedZone,
        setSelectedZone,
        resetFilters,
        filteredProducts,
        availableZones,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartItemCount,
        viewingProduct,
        openProductModal,
        closeProductModal,
        isCartOpen,
        setIsCartOpen,
        isSellModalOpen,
        setIsSellModalOpen,
        isAdminModalOpen,
        setIsAdminModalOpen,
        isAboutModalOpen,
        setIsAboutModalOpen,
        isHelpModalOpen,
        setIsHelpModalOpen,
        addProduct,
        deleteProduct,
        updateProductQuantity,
        orders,
        placeOrder,
        updateOrderStatus,
        uploadPaymentReceipt,
        verifyPaymentReceipt,
        lastCreatedOrder,
        clearLastCreatedOrder,
        refetchSupabaseData,
        reviews,
        getProductReviews,
        addReview,
        canUserReview,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = (): MarketplaceContextType => {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};
