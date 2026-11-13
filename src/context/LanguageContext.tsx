import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'am' | 'en' | 'ti';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  getCategoryName: (cat: { name: string; name_amharic?: string | null }) => string;
  getProductTitle: (prod: { title: string; title_amharic?: string | null }) => string;
  getLocationName: (name: string, amharic?: string, tigrinya?: string) => string;
}

// Complete 3-language dictionary
const TRANSLATIONS: Record<string, Record<Language, string>> = {
  // Navigation & Brand
  'brand.subtitle': {
    am: 'መላ ማርኬት • የኢትዮጵያ የገበያ ቦታ',
    en: 'Mela Market • Ethiopian Marketplace',
    ti: 'መላ ማርኬት • ናይ ኢትዮጵያ ዕዳጋ',
  },
  'nav.phone': {
    am: 'ስልክ:',
    en: 'Phone:',
    ti: 'ተሌፎን:',
  },
  'nav.callOrder': {
    am: 'ደውለው ይዘዙ',
    en: 'Call to order',
    ti: 'ደዊልኩም እዘዙ',
  },
  'nav.whatsapp': {
    am: 'በዋትስአፕ ያነጋግሩን',
    en: 'WhatsApp Support',
    ti: 'ብዋትስኣፕ ርኸቡና',
  },
  'nav.locationBar': {
    am: 'አዲስ አበባ • ኢትዮጵያ (ETB / ብር)',
    en: 'Addis Ababa • Ethiopia (ETB)',
    ti: 'ኣዲስ ኣበባ • ኢትዮጵያ (ETB / ቅርሺ)',
  },
  'nav.searchPlaceholder': {
    am: 'ምን ይፈልጋሉ? ስልክ፣ ባህል ልብስ፣ ላፕቶፕ፣ መኪና... (Search products)',
    en: 'What are you looking for? Phones, clothes, laptops, cars...',
    ti: 'እንታይ ትደልዩ? ስልኪ፣ ባህላዊ ክዳን፣ ላፕቶፕ፣ መኪና...',
  },
  'nav.searchMobilePlaceholder': {
    am: 'ምን ይፈልጋሉ? (Search Mela Market...)',
    en: 'Search Mela Market...',
    ti: 'እንታይ ትደልዩ? (Mela Market ድለዩ...)',
  },
  'nav.sellProduct': {
    am: 'እቃ ይሽጡ',
    en: 'Sell Product',
    ti: 'ዕቃ ሽጡ',
  },
  'nav.sellProductSlash': {
    am: '/ Sell',
    en: '',
    ti: '',
  },
  'nav.cart': {
    am: 'የግዢ ጋሪ',
    en: 'Shopping Cart',
    ti: 'ናይ ዕዳጋ ጋሪ',
  },
  'nav.signIn': {
    am: 'ግባ',
    en: 'Sign In',
    ti: 'እቶ',
  },
  'nav.register': {
    am: 'መለያ ክፈት',
    en: 'Register',
    ti: 'ተመዝገብ',
  },
  'nav.signedInAs': {
    am: 'ተጠቃሚ / Signed in as',
    en: 'Signed in as',
    ti: 'ተጠቃሚ / Signed in as',
  },
  'nav.superAdmin': {
    am: 'Super Admin Dashboard',
    en: 'Super Admin Dashboard',
    ti: 'ናይ ሱፐር ኣድሚን ዳሽቦርድ',
  },
  'nav.sellerHub': {
    am: 'የሻጭ ዳሽቦርድ (Seller Hub)',
    en: 'Seller Hub & Dashboard',
    ti: 'ናይ ሸያጢ ዳሽቦርድ (Seller Hub)',
  },
  'nav.myOrders': {
    am: 'የትእዛዝ ሁኔታ (My Orders)',
    en: 'My Order History',
    ti: 'ኩነታት ትእዛዝ (My Orders)',
  },
  'nav.changePassword': {
    am: 'የይለፍ ቃል ቀይር (Change Password)',
    en: 'Change Password',
    ti: 'ፓስዎርድ ቀይር (Change Password)',
  },
  'nav.logout': {
    am: 'ውጣ (Log Out)',
    en: 'Log Out',
    ti: 'ውጻእ (Log Out)',
  },
  'nav.menu': {
    am: 'ምናሌ',
    en: 'Menu',
    ti: 'ማውጫ',
  },
  'nav.clear': {
    am: 'አጽዳ',
    en: 'Clear',
    ti: 'ኣጽሪ',
  },
  'nav.openAccountOrSignIn': {
    am: 'መለያ ይክፈቱ ወይም ይግቡ (Sign In / Register)',
    en: 'Sign In or Create Account',
    ti: 'ኣካውንት ክፈቱ ወይ እተዉ (Sign In / Register)',
  },

  // Hero Banner
  'hero.title': {
    am: 'በመላው ኢትዮጵያ አዳዲስ እና ያገለገሉ እቃዎችን በአስተማማኝ ሁኔታ ይግዙ፣ ይሽጡ!',
    en: 'Buy and sell new & pre-owned items securely across Ethiopia!',
    ti: 'ኣብ ምሉእ ኢትዮጵያ ሓደሽትን ዝተጠቐምኩምሎም ንብረታትን ብውሕስነት ይግዝኡ፣ ይሽጡ!',
  },
  'hero.subtitle': {
    am: 'ስልኮች፣ ባህላዊ አልባሳት፣ ኮምፒውተሮች፣ መኪናዎች እና የቤት እቃዎች ከታመኑ ሻጮች ጋር በቀጥታ ይገበያዩ።',
    en: 'Direct trading with verified sellers for phones, cultural fashion, computers, cars, and home goods.',
    ti: 'ስልክታት፣ ባህላዊ ክዳውንቲ፣ ኮምፒዩተራት፣ መካይንን ናይ ገዛ ንብረታትን ምስ እሙናት ሸየጥቲ ብቐጥታ ተገበያዩ።',
  },
  'hero.startSelling': {
    am: 'እቃ መሸጥ ይጀምሩ',
    en: 'Start Selling Now',
    ti: 'ዕቃ ምሻጥ ጀምሩ',
  },
  'hero.browseNew': {
    am: 'አዳዲስ እቃዎች (New)',
    en: 'Browse New Items',
    ti: 'ሓደሽቲ ንብረታት (New)',
  },
  'hero.browseUsed': {
    am: 'ያገለገሉ እቃዎች (Used)',
    en: 'Browse Used Items',
    ti: 'ዝተጠቐምኩምሎም ንብረታት (Used)',
  },
  'hero.badgeTrusted': {
    am: '100% የታመነ ግብይት',
    en: '100% Verified Sellers',
    ti: '100% ዝተኣመነ ንግዲ',
  },
  'hero.badgePayment': {
    am: 'በቴሌብር እና በባንክ',
    en: 'Telebirr & Bank Payments',
    ti: 'ብቴሌብርን ብባንክን',
  },
  'hero.badgeDelivery': {
    am: 'በመላው ኢትዮጵያ ማድረሻ',
    en: 'Nationwide Delivery',
    ti: 'ኣብ ምሉእ ኢትዮጵያ ምብጻሕ',
  },

  // Categories & Filtering
  'categories.all': {
    am: 'ሁሉም ምድቦች',
    en: 'All Categories',
    ti: 'ኩሎም ምድባት',
  },
  'filter.region': {
    am: 'በክልል አጣራ',
    en: 'Filter by Region',
    ti: 'ብክልል ምረጽ',
  },
  'filter.allRegions': {
    am: 'ሁሉም ክልሎች',
    en: 'All Regions',
    ti: 'ኩሎም ክልላት',
  },
  'filter.sortBy': {
    am: 'ቅደም ተከተል',
    en: 'Sort By',
    ti: 'ቅደም ሰዓብ',
  },
  'filter.sortNewest': {
    am: 'አዳዲስ የተጨመሩ',
    en: 'Newest First',
    ti: 'ሓደሽቲ ዝተወሰኹ',
  },
  'filter.sortPriceLow': {
    am: 'ዋጋ፡ ከዝቅተኛ ወደ ከፍተኛ',
    en: 'Price: Low to High',
    ti: 'ዋጋ፡ ካብ ትሑት ናብ ላዕሊ',
  },
  'filter.sortPriceHigh': {
    am: 'ዋጋ፡ ከከፍተኛ ወደ ዝቅተኛ',
    en: 'Price: High to Low',
    ti: 'ዋጋ፡ ካብ ላዕሊ ናብ ትሑት',
  },

  // Products Sections
  'products.newTitle': {
    am: 'አዳዲስ እቃዎች',
    en: 'Brand New Products',
    ti: 'ሓደሽቲ ንብረታት',
  },
  'products.newBadge': {
    am: 'ፋብሪካ ያልተከፈተ',
    en: 'Factory Sealed',
    ti: 'ካብ ፋብሪካ ዘይተኸፍተ',
  },
  'products.newSubtitle': {
    am: 'በፋብሪካ የታሸጉ፣ ዋስትና ያላቸው ጥራት ያላቸው አዳዲስ ምርቶች',
    en: 'Factory sealed, guaranteed authentic quality new items with warranty',
    ti: 'ብፋብሪካ ዝተዓሸጉ፣ ውሕስነት ዘለዎም ፅሩያት ሓደሽቲ ፍርያት',
  },
  'products.usedTitle': {
    am: 'ያገለገሉ እቃዎች (ሰከንድ ሃንድ)',
    en: 'Pre-Owned & Used Items',
    ti: 'ዝተጠቐምኩምሎም ንብረታት (ሰከንድ ሃንድ)',
  },
  'products.usedBadge': {
    am: 'ጥራት የተረጋገጠ',
    en: 'Inspected Quality',
    ti: 'ፅሬቱ ዝተረጋገፀ',
  },
  'products.usedSubtitle': {
    am: 'በጥሩ ሁኔታ ላይ ያሉ፣ የተፈተሹ አስተማማኝ ያገለገሉ እቃዎች በተመጣጣኝ ዋጋ',
    en: 'Gently used, certified and reliable pre-owned goods at affordable prices',
    ti: 'ብጽቡቕ ኩነታት ዘለዉ፣ ዝተፈተሹ እሙናት ዝተጠቐምኩምሎም ንብረታት',
  },
  'products.viewDetails': {
    am: 'ዝርዝር ይመልከቱ',
    en: 'View Details',
    ti: 'ዝርዝር ርኣዩ',
  },
  'products.addToCart': {
    am: 'ወደ ጋሪ ጨምር',
    en: 'Add to Cart',
    ti: 'ናብ ጋሪ ወስኽ',
  },
  'products.addedToCart': {
    am: 'ጋሪ ውስጥ ተጨምሯል',
    en: 'Added to Cart',
    ti: 'ኣብ ጋሪ ተወሲኹ',
  },
  'products.outOfStock': {
    am: 'አልቋል',
    en: 'Out of Stock',
    ti: 'ተወዲኡ',
  },
  'products.verifiedSeller': {
    am: 'የተረጋገጠ ሻጭ',
    en: 'Verified Seller',
    ti: 'ዝተረጋገፀ ሸያጢ',
  },
  'products.noProductsFound': {
    am: 'ምንም አይነት እቃ አልተገኘም',
    en: 'No products found',
    ti: 'ምንም ዓይነት ዕቃ ኣይተረኸበን',
  },
  'products.noProductsDesc': {
    am: 'እባክዎ ፍለጋዎን ወይም የተመረጠውን ማጣሪያ ይቀይሩ',
    en: 'Please adjust your search terms or filters',
    ti: 'በጃኹም ፍለጋኹም ወይ ዝተመረፀ ምድብ ቀይሩ',
  },
  'products.condition': {
    am: 'ሁኔታ',
    en: 'Condition',
    ti: 'ኩነታት',
  },
  'products.conditionNew': {
    am: 'አዲስ',
    en: 'Brand New',
    ti: 'ሓዱሽ',
  },
  'products.conditionUsed': {
    am: 'ያገለገለ',
    en: 'Pre-Owned',
    ti: 'ዝተጠቐመሉ',
  },
  'products.currency': {
    am: 'ብር',
    en: 'ETB',
    ti: 'ቅርሺ',
  },

  // Product Details Modal
  'detail.title': {
    am: 'የእቃው ዝርዝር መረጃ',
    en: 'Product Details',
    ti: 'ዝርዝር ሓበሬታ ዕቃ',
  },
  'detail.sellerInfo': {
    am: 'የሻጭ መረጃ',
    en: 'Seller Information',
    ti: 'ናይ ሸያጢ ሓበሬታ',
  },
  'detail.callSeller': {
    am: 'ለሻጩ ይደውሉ',
    en: 'Call Seller',
    ti: 'ናብቲ ሸያጢ ደውሉ',
  },
  'detail.whatsappSeller': {
    am: 'በዋትስአፕ ያነጋግሩ',
    en: 'WhatsApp Seller',
    ti: 'ብዋትስኣፕ ርኸቡ',
  },
  'detail.storeName': {
    am: 'መደብር',
    en: 'Store',
    ti: 'ዱካን',
  },
  'detail.location': {
    am: 'የሚገኝበት ቦታ',
    en: 'Item Location',
    ti: 'ዝርከበሉ ቦታ',
  },
  'detail.stock': {
    am: 'የቀረ ብዛት',
    en: 'Available Stock',
    ti: 'ዝተረፈ ብዝሒ',
  },
  'detail.inStock': {
    am: 'እቃዎች ቀርተዋል',
    en: 'items in stock',
    ti: 'ንብረታት ተሪፎም',
  },
  'detail.description': {
    am: 'የእቃው ዝርዝር መግለጫ',
    en: 'Product Description',
    ti: 'ናይቲ ዕቃ መግለፂ',
  },
  'detail.quantity': {
    am: 'ብዛት',
    en: 'Quantity',
    ti: 'ብዝሒ',
  },
  'detail.totalPrice': {
    am: 'ጠቅላላ ዋጋ',
    en: 'Total Price',
    ti: 'ጠቕላላ ዋጋ',
  },
  'detail.close': {
    am: 'ዝጋ',
    en: 'Close',
    ti: 'ዕጸው',
  },
  'detail.share': {
    am: 'አጋራ',
    en: 'Share',
    ti: 'ኣካፍል',
  },
  'detail.report': {
    am: 'እቃውን ሪፖርት አድርግ',
    en: 'Report Listing',
    ti: 'ነዚ ዕቃ ሪፖርት ግበሩ',
  },

  // Cart & Checkout
  'cart.title': {
    am: 'የግዢ ጋሪዎ',
    en: 'Your Shopping Cart',
    ti: 'ናይ ዕዳጋ ጋሪኹም',
  },
  'cart.empty': {
    am: 'ጋሪዎ ባዶ ነው',
    en: 'Your cart is empty',
    ti: 'ጋሪኹም ጥራዩ እዩ',
  },
  'cart.emptyDesc': {
    am: 'በገበያችን ውስጥ እቃዎችን መርጠው ሲጨምሩ እዚህ ዝርዝሩ ይታያል።',
    en: 'Items you add while browsing will appear here.',
    ti: 'ኣብ ዕዳጋና ዕቃታት መሪጽኩም ምስ ወሰኽኩም ኣብዚ ክረአ እዩ።',
  },
  'cart.subtotal': {
    am: 'ንዑስ ድምር',
    en: 'Subtotal',
    ti: 'ንኡስ ድምር',
  },
  'cart.deliveryFee': {
    am: 'የማድረሻ ክፍያ',
    en: 'Delivery Fee',
    ti: 'ናይ ምብጻሕ ክፍሊት',
  },
  'cart.freeDelivery': {
    am: 'ነፃ ማድረሻ',
    en: 'Free Delivery',
    ti: 'ናጻ ምብጻሕ',
  },
  'cart.total': {
    am: 'ጠቅላላ ክፍያ',
    en: 'Total Amount',
    ti: 'ጠቕላላ ክፍሊት',
  },
  'cart.checkout': {
    am: 'ክፍያ ፈጽም (Checkout)',
    en: 'Proceed to Checkout',
    ti: 'ክፍሊት ፈጽሙ (Checkout)',
  },
  'cart.continueShopping': {
    am: 'ግብይት ይቀጥሉ',
    en: 'Continue Shopping',
    ti: 'ዕዳጋ ይቐጽሉ',
  },
  'cart.remove': {
    am: 'አስወግድ',
    en: 'Remove',
    ti: 'ኣውጽእ',
  },

  // Checkout Modal
  'checkout.title': {
    am: 'የትእዛዝ ማጠቃለያ እና ክፍያ',
    en: 'Order Checkout & Payment',
    ti: 'ናይ ትእዛዝ መደምደምታን ክፍሊትን',
  },
  'checkout.customerInfo': {
    am: 'የደንበኛ መረጃ',
    en: 'Customer Information',
    ti: 'ናይ ዓሚል ሓበሬታ',
  },
  'checkout.fullName': {
    am: 'ሙሉ ስም',
    en: 'Full Name',
    ti: 'ምሉእ ሽም',
  },
  'checkout.phone': {
    am: 'ስልክ ቁጥር',
    en: 'Phone Number',
    ti: 'ቁጽሪ ስልኪ',
  },
  'checkout.address': {
    am: 'የማድረሻ አድራሻ (ከተማ፣ አካባቢ፣ የቤት ቁጥር)',
    en: 'Delivery Address (City, Area, House #)',
    ti: 'ናይ ምብጻሕ ኣድራሻ (ከተማ፣ ከባቢ፣ ቁጽሪ ገዛ)',
  },
  'checkout.paymentMethod': {
    am: 'የክፍያ ዘዴ',
    en: 'Payment Method',
    ti: 'ናይ ክፍሊት ኣገባብ',
  },
  'checkout.telebirr': {
    am: 'ቴሌብር (Telebirr)',
    en: 'Telebirr',
    ti: 'ቴሌብር',
  },
  'checkout.cbe': {
    am: 'ሲቢኢ ብር / የኢትዮጵያ ንግድ ባንክ',
    en: 'CBE / Commercial Bank of Ethiopia',
    ti: 'ናይ ኢትዮጵያ ንግዲ ባንኪ',
  },
  'checkout.cash': {
    am: 'እቃው ሲደርስ የሚከፈል (Cash on Delivery)',
    en: 'Cash on Delivery',
    ti: 'ዕቃ ምስ በጽሐ ዝኽፈል',
  },
  'checkout.notes': {
    am: 'ተጨማሪ ማስታወሻ (አማራጭ)',
    en: 'Order Notes (Optional)',
    ti: 'ተወሳኺ መዘክር (ኣማራጺ)',
  },
  'checkout.placeOrder': {
    am: 'ትእዛዝ ይላኩ',
    en: 'Place Order Now',
    ti: 'ትእዛዝ ስደዱ',
  },
  'checkout.placing': {
    am: 'ትእዛዝ እየተላከ ነው...',
    en: 'Placing Order...',
    ti: 'ትእዛዝ ይስደድ ኣሎ...',
  },
  'checkout.successTitle': {
    am: 'ትእዛዝዎ በተሳካ ሁኔታ ተልኳል!',
    en: 'Order Placed Successfully!',
    ti: 'ትእዛዝኩም ብዓወት ተላኢኹ ኣሎ!',
  },
  'checkout.successDesc': {
    am: 'ሻጩ ትእዛዝዎን ተቀብሎ በአጭር ጊዜ ውስጥ በስልክ ያነጋግርዎታል።',
    en: 'The seller will review your order and contact you shortly.',
    ti: 'እቲ ሸያጢ ትእዛዝኩም ተቐቢሉ ኣብ ሓጺር ግዜ ብስልኪ ክረኽበኩም እዩ።',
  },
  'checkout.orderNumber': {
    am: 'የትእዛዝ መለያ ቁጥር:',
    en: 'Order Tracking #:',
    ti: 'ቁጽሪ መለለዪ ትእዛዝ:',
  },

  // Auth Modal
  'auth.signInTitle': {
    am: 'ወደ መላ ማርኬት ይግቡ',
    en: 'Sign In to Mela Market',
    ti: 'ናብ መላ ማርኬት እተዉ',
  },
  'auth.registerTitle': {
    am: 'አዲስ መለያ ይክፈቱ',
    en: 'Create a New Account',
    ti: 'ሓዱሽ ኣካውንት ክፈቱ',
  },
  'auth.emailOrPhone': {
    am: 'ኢሜይል ወይም ስልክ ቁጥር',
    en: 'Email or Phone Number',
    ti: 'ኢመይል ወይ ቁጽሪ ስልኪ',
  },
  'auth.password': {
    am: 'የይለፍ ቃል',
    en: 'Password',
    ti: 'ፓስዎርድ',
  },
  'auth.confirmPassword': {
    am: 'የይለፍ ቃል ያረጋግጡ',
    en: 'Confirm Password',
    ti: 'ፓስዎርድ ኣረጋግጹ',
  },
  'auth.fullName': {
    am: 'ሙሉ ስም',
    en: 'Full Name',
    ti: 'ምሉእ ሽም',
  },
  'auth.sellerCheckbox': {
    am: 'እንደ ሻጭ መመዝገብ እፈልጋለሁ (የእቃ መደብር)',
    en: 'I want to register as a Seller (Store Owner)',
    ti: 'ከም ሸያጢ ክምዝገብ ይደሊ (ናይ ዕቃ ዱካን)',
  },
  'auth.storeName': {
    am: 'የመደብር / የንግድ ስም',
    en: 'Store / Business Name',
    ti: 'ናይ ዱካን / ንግዲ ሽም',
  },
  'auth.loginBtn': {
    am: 'ግባ',
    en: 'Sign In',
    ti: 'እቶ',
  },
  'auth.loggingIn': {
    am: 'በመግባት ላይ...',
    en: 'Signing in...',
    ti: 'ይኣቱ ኣሎ...',
  },
  'auth.registerBtn': {
    am: 'መለያ ክፈት',
    en: 'Create Account',
    ti: 'ኣካውንት ክፈት',
  },
  'auth.registering': {
    am: 'በመመዝገብ ላይ...',
    en: 'Creating account...',
    ti: 'ይምዝገብ ኣሎ...',
  },
  'auth.noAccount': {
    am: 'መለያ የለዎትም?',
    en: "Don't have an account?",
    ti: 'ኣካውንት የብልኩምን?',
  },
  'auth.registerLink': {
    am: 'አዲስ ይክፈቱ',
    en: 'Sign Up',
    ti: 'ሓዱሽ ክፈቱ',
  },
  'auth.hasAccount': {
    am: 'መለያ አለዎት?',
    en: 'Already have an account?',
    ti: 'ኣካውንት ኣለኩም ድዩ?',
  },
  'auth.loginLink': {
    am: 'እዚህ ይግቡ',
    en: 'Sign In',
    ti: 'ኣብዚ እተዉ',
  },

  // Sell Product Modal
  'sell.title': {
    am: 'እቃ ለመሸጥ ይለጥፉ',
    en: 'Post an Item for Sale',
    ti: 'ዕቃ ንምሻጥ ለጥፉ',
  },
  'sell.subtitle': {
    am: 'አዲስ ወይም ያገለገለ እቃዎን በመላው ኢትዮጵያ ላሉ ገዢዎች ያቅርቡ',
    en: 'List your new or pre-owned product to buyers across Ethiopia',
    ti: 'ሓዱሽ ወይ ዝተጠቐምኩምሉ ዕቃ ንዓደግቲ ኣቕርቡ',
  },
  'sell.productTitle': {
    am: 'የእቃው መጠሪያ (ስም)',
    en: 'Product Title',
    ti: 'ናይቲ ዕቃ ሽም',
  },
  'sell.category': {
    am: 'የእቃው ምድብ',
    en: 'Category',
    ti: 'ምድብ ዕቃ',
  },
  'sell.selectCategory': {
    am: 'ምድብ ይምረጡ...',
    en: 'Select Category...',
    ti: 'ምድብ ምረጹ...',
  },
  'sell.condition': {
    am: 'የእቃው ሁኔታ',
    en: 'Item Condition',
    ti: 'ኩነታት ዕቃ',
  },
  'sell.newOption': {
    am: 'አዲስ እቃ (Brand New)',
    en: 'Brand New',
    ti: 'ሓዱሽ ዕቃ (Brand New)',
  },
  'sell.usedOption': {
    am: 'ያገለገለ እቃ (Pre-Owned / Used)',
    en: 'Pre-Owned / Used',
    ti: 'ዝተጠቐመሉ ዕቃ (Pre-Owned)',
  },
  'sell.price': {
    am: 'ዋጋ (በብር)',
    en: 'Price (in ETB)',
    ti: 'ዋጋ (ብብር)',
  },
  'sell.originalPrice': {
    am: 'የቀድሞ ዋጋ (አማራጭ)',
    en: 'Original Price (Optional)',
    ti: 'ናይ ቀደም ዋጋ (ኣማራጺ)',
  },
  'sell.region': {
    am: 'ክልል / ከተማ አስተዳደር',
    en: 'Region / Administrative City',
    ti: 'ክልል / ከተማ ምምሕዳር',
  },
  'sell.selectRegion': {
    am: 'ክልል ይምረጡ...',
    en: 'Select Region...',
    ti: 'ክልል ምረጹ...',
  },
  'sell.woreda': {
    am: 'ዞን / ወረዳ',
    en: 'Zone / Woreda',
    ti: 'ዞባ / ወረዳ',
  },
  'sell.selectWoreda': {
    am: 'ወረዳ ይምረጡ...',
    en: 'Select Woreda...',
    ti: 'ወረዳ ምረጹ...',
  },
  'sell.city': {
    am: 'ከተማ / አካባቢ',
    en: 'City / Neighborhood',
    ti: 'ከተማ / ከባቢ',
  },
  'sell.description': {
    am: 'የእቃው ዝርዝር መግለጫ',
    en: 'Detailed Description',
    ti: 'ናይቲ ዕቃ ዝርዝር መግለፂ',
  },
  'sell.stock': {
    am: 'ያለው ብዛት (ስቶክ)',
    en: 'Available Stock',
    ti: 'ዘሎ ብዝሒ (ስቶክ)',
  },
  'sell.photos': {
    am: 'የእቃው ፎቶዎች (ከካሜራ ወይም ፋይል)',
    en: 'Product Photos (Camera or Upload)',
    ti: 'ናይቲ ዕቃ ፎቶታት (ካብ ካሜራ ወይ ፋይል)',
  },
  'sell.publish': {
    am: 'እቃውን ለጥፍ',
    en: 'Publish Listing',
    ti: 'ዕቃ ለጥፍ',
  },
  'sell.publishing': {
    am: 'እየተለጠፈ ነው...',
    en: 'Publishing...',
    ti: 'ይለጠፍ ኣሎ...',
  },

  // Seller Dashboard
  'dashboard.sellerTitle': {
    am: 'የሻጭ መቆጣጠሪያ ዳሽቦርድ',
    en: 'Seller Hub & Dashboard',
    ti: 'ናይ ሸያጢ መቆፃፀሪ ዳሽቦርድ',
  },
  'dashboard.tabProducts': {
    am: 'ምርቶቼ',
    en: 'My Products',
    ti: 'ፍርያተይ',
  },
  'dashboard.tabOrders': {
    am: 'የገቡ ትእዛዞች',
    en: 'Received Orders',
    ti: 'ዝኣተዉ ትእዛዛት',
  },
  'dashboard.totalSales': {
    am: 'ጠቅላላ ሽያጭ',
    en: 'Total Sales',
    ti: 'ጠቕላላ ሽያጥ',
  },
  'dashboard.activeListings': {
    am: 'ንቁ ምርቶች',
    en: 'Active Listings',
    ti: 'ንጡፋት ፍርያት',
  },
  'dashboard.addNew': {
    am: 'አዲስ እቃ ጨምር',
    en: 'Add New Product',
    ti: 'ሓዱሽ ዕቃ ወስኽ',
  },

  // My Orders Modal
  'orders.title': {
    am: 'የትእዛዝ ታሪኬ (My Orders)',
    en: 'My Orders History',
    ti: 'ኩነታት ትእዛዛተይ (My Orders)',
  },
  'orders.orderNumber': {
    am: 'የትእዛዝ ቁጥር',
    en: 'Order Number',
    ti: 'ቁጽሪ ትእዛዝ',
  },
  'orders.status': {
    am: 'ሁኔታ',
    en: 'Status',
    ti: 'ኩነታት',
  },
  'orders.date': {
    am: 'ቀን',
    en: 'Date',
    ti: 'ዕለት',
  },
  'orders.total': {
    am: 'ጠቅላላ ዋጋ',
    en: 'Total Amount',
    ti: 'ጠቕላላ ዋጋ',
  },
  'orders.close': {
    am: 'ዝጋ',
    en: 'Close',
    ti: 'ዕጸው',
  },
  'orders.empty': {
    am: 'እስካሁን ያዘዙት እቃ የለም',
    en: 'No orders placed yet',
    ti: 'ክሳብ ሕዚ ዝኣዘዝክምዎ ዕቃ የለን',
  },

  // Super Admin Portal
  'admin.portalTitle': {
    am: 'የመላ ማርኬት ሱፐር አድሚን ፖርታል',
    en: 'Mela Market Super Admin Portal',
    ti: 'ናይ መላ ማርኬት ሱፐር ኣድሚን ፖርታል',
  },
  'admin.overview': {
    am: 'ጠቅላላ እይታ',
    en: 'Overview',
    ti: 'ሓፈሻዊ ትዕዝብቲ',
  },
  'admin.users': {
    am: 'ተጠቃሚዎች',
    en: 'Users',
    ti: 'ተጠቀምቲ',
  },
  'admin.sellers': {
    am: 'ሻጮች',
    en: 'Sellers Hub',
    ti: 'ሸየጥቲ',
  },
  'admin.products': {
    am: 'ምርቶች',
    en: 'Products',
    ti: 'ፍርያት',
  },
  'admin.categories': {
    am: 'ምድቦች',
    en: 'Categories',
    ti: 'ምድባት',
  },
  'admin.orders': {
    am: 'ትእዛዞች',
    en: 'Orders',
    ti: 'ትእዛዛት',
  },
  'admin.reports': {
    am: 'ሪፖርቶች',
    en: 'Reports & Flagged',
    ti: 'ሪፖርትታት',
  },
  'admin.settings': {
    am: 'የገበያ ቅንብሮች',
    en: 'Marketplace Settings',
    ti: 'ናይ ዕዳጋ ቅንጅታት',
  },
  'admin.logs': {
    am: 'የስርዓት መዝገብ',
    en: 'Audit Activity Logs',
    ti: 'ናይ ስርዓት መዝገብ',
  },
  'admin.neonDb': {
    am: 'Neon ዳታቤዝ ሁኔታ',
    en: 'Neon Database Status',
    ti: 'ኩነታት Neon ዳታቤዝ',
  },

  // Footer
  'footer.aboutTitle': {
    am: 'ስለ መላ ማርኬት',
    en: 'About Mela Market',
    ti: 'ብዛዕባ መላ ማርኬት',
  },
  'footer.aboutDesc': {
    am: 'በመላው ኢትዮጵያ አስተማማኝ እና ዘመናዊ የኢኮሜርስ የገበያ ቦታ። አዳዲስ እና ያገለገሉ እቃዎችን በቀላሉ ይገበያዩ።',
    en: "Ethiopia's trusted full-stack e-commerce marketplace for buying and selling new and pre-owned goods.",
    ti: 'ኣብ ምሉእ ኢትዮጵያ ውሑስን ዘመናውን ናይ ዕዳጋ ቦታ። ሓደሽትን ዝተጠቐምኩምሎምን ንብረታት ብቐሊሉ ተገበያዩ።',
  },
  'footer.quickLinks': {
    am: 'ፈጣን አገናኞች',
    en: 'Quick Links',
    ti: 'ቅልጡፋት መላግቦታት',
  },
  'footer.customerService': {
    am: 'የደንበኞች አገልግሎት',
    en: 'Customer Support',
    ti: 'ናይ ዓማዊል ኣገልግሎት',
  },
  'footer.securePayment': {
    am: 'አስተማማኝ ክፍያ',
    en: 'Secure Payments',
    ti: 'ውሑስ ክፍሊት',
  },
  'footer.copyright': {
    am: 'መብቱ በህግ የተጠበቀ ነው።',
    en: 'All rights reserved.',
    ti: 'መሰሉ ብሕጊ ዝተሓለወ እዩ።',
  },
};

// Specialized translations for Category names
const CATEGORY_TRANSLATIONS: Record<string, { am: string; en: string; ti: string }> = {
  'traditional-wear': {
    am: 'የሀገር ባህል ልብስ',
    en: 'Traditional & Habesha Wear',
    ti: 'ናይ ባህሊ ክዳን',
  },
  'electronics': {
    am: 'ስልኮች እና ኤሌክትሮኒክስ',
    en: 'Phones & Electronics',
    ti: 'ስልክታትን ኤሌክትሮኒክስን',
  },
  'coffee-spices': {
    am: 'የኢትዮጵያ ቡና እና ቅመማ ቅመም',
    en: 'Ethiopian Coffee & Spices',
    ti: 'ናይ ኢትዮጵያ ቡንን ቅመማቕመምን',
  },
  'jewelry-crafts': {
    am: 'ጌጣጌጥ እና ባህላዊ እቃዎች',
    en: 'Habesha Jewelry & Crafts',
    ti: 'ስልማትን ባህላዊ ንብረታትን',
  },
  'home-furniture': {
    am: 'የቤት እቃዎች እና ፈርኒቸር',
    en: 'Home & Furniture',
    ti: 'ናይ ገዛ ንብረታትን ፈርኒቸርን',
  },
  'vehicles': {
    am: 'ተሽከርካሪዎች እና መለዋወጫ',
    en: 'Vehicles & Auto Parts',
    ti: 'ተሽከርከርትን መለዋወጥን',
  },
  'computers': {
    am: 'ላፕቶፖች እና ኮምፒውተሮች',
    en: 'Laptops & Computers',
    ti: 'ላፕቶፓትን ኮምፒዩተራትን',
  },
  'fashion-shoes': {
    am: 'ፋሽን እና ጫማዎች',
    en: 'Fashion & Shoes',
    ti: 'ፋሽንን ጫማታትን',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('mela_market_lang');
      if (saved === 'am' || saved === 'en' || saved === 'ti') {
        return saved;
      }
    } catch {}
    return 'am'; // Default language: Amharic
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mela_market_lang', lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const entry = TRANSLATIONS[key];
    if (entry && entry[language]) {
      return entry[language];
    }
    if (entry && entry['am']) {
      return entry['am'];
    }
    return fallback || key;
  };

  const getCategoryName = (cat: { name: string; name_amharic?: string | null; slug?: string }): string => {
    if (cat.slug && CATEGORY_TRANSLATIONS[cat.slug]) {
      return CATEGORY_TRANSLATIONS[cat.slug][language] || cat.name;
    }
    if (language === 'am') {
      return cat.name_amharic || cat.name;
    }
    if (language === 'ti') {
      // Find matching slug
      const found = Object.values(CATEGORY_TRANSLATIONS).find(
        (c) => c.en.toLowerCase() === cat.name.toLowerCase() || (cat.name_amharic && c.am === cat.name_amharic)
      );
      if (found) return found.ti;
      return cat.name_amharic || cat.name;
    }
    return cat.name;
  };

  const getProductTitle = (prod: { title: string; title_amharic?: string | null }): string => {
    if (language === 'am') {
      return prod.title_amharic || prod.title;
    }
    if (language === 'ti') {
      // Return Amharic title if available (since both share Ethiopic script and market terms) or fallback to English title
      return prod.title_amharic || prod.title;
    }
    return prod.title;
  };

  const getLocationName = (name: string, amharic?: string, tigrinya?: string): string => {
    if (language === 'ti' && tigrinya) return tigrinya;
    if (language === 'am' && amharic) return amharic;
    return name;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        getCategoryName,
        getProductTitle,
        getLocationName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
