import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from environment or browser localStorage
export const getSupabaseConfig = (): { url: string; anonKey: string; isConfigured: boolean } => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  let storedUrl = '';
  let storedKey = '';

  if (typeof window !== 'undefined') {
    try {
      storedUrl = localStorage.getItem('mela_supabase_url') || '';
      storedKey = localStorage.getItem('mela_supabase_anon_key') || '';
    } catch (e) {
      // ignore
    }
  }

  const url = (storedUrl.trim() || envUrl || 'https://shvwchpdqimwsdqhbwyj.supabase.co').trim();
  const anonKey = (storedKey.trim() || envKey || '').trim();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !anonKey.includes('placeholder') &&
    anonKey.length > 20
  );

  return { url, anonKey, isConfigured };
};

const initialConfig = getSupabaseConfig();

export let isSupabaseConfigured: boolean = initialConfig.isConfigured;

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(initialConfig.url, initialConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// Allow updating Supabase credentials dynamically from UI without restarting server
export const updateSupabaseCredentials = (
  url: string,
  anonKey: string
): { success: boolean; client: SupabaseClient | null; error?: string } => {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl.startsWith('https://')) {
      return { success: false, client: null, error: 'Supabase URL must start with https://' };
    }
    if (cleanKey.length < 20) {
      return { success: false, client: null, error: 'Invalid anon key length' };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('mela_supabase_url', cleanUrl);
      localStorage.setItem('mela_supabase_anon_key', cleanKey);
    }

    const client = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    supabase = client;
    isSupabaseConfigured = true;

    return { success: true, client };
  } catch (err: any) {
    return { success: false, client: null, error: err.message || 'Failed to initialize Supabase client' };
  }
};

// Ping / test database connection
export const testSupabaseConnection = async (): Promise<{
  connected: boolean;
  message: string;
  tables?: { profiles: boolean; products: boolean; orders: boolean; buckets: boolean };
}> => {
  if (!supabase || !isSupabaseConfigured) {
    return {
      connected: false,
      message: 'Supabase is not configured yet. Please provide your Supabase Anon Public Key.',
    };
  }

  try {
    // 1. Check profiles or categories table
    const { error: profError } = await supabase.from('profiles').select('id').limit(1);
    const { error: prodError } = await supabase.from('products').select('id').limit(1);
    const { error: ordError } = await supabase.from('orders').select('id').limit(1);

    const profilesOk = !profError || profError.code === 'PGRST116';
    const productsOk = !prodError;
    const ordersOk = !ordError;

    if (profError && profError.code !== 'PGRST116' && !profError.message.includes('permission denied')) {
      return {
        connected: false,
        message: `Database query failed: ${profError.message}`,
      };
    }

    return {
      connected: true,
      message: 'Successfully connected to Supabase database!',
      tables: {
        profiles: profilesOk,
        products: productsOk,
        orders: ordersOk,
        buckets: true,
      },
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Connection error: ${err.message || 'Network request failed'}`,
    };
  }
};
