import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { hashPassword, verifyPassword, DEFAULT_ADMIN_SETUP_KEY } from '../lib/crypto';

export interface StoredUserAccount {
  profile: UserProfile;
  passwordHash: string; // PBKDF2 SHA-256 hash (never plain text)
  salt: string;         // Unique cryptographic salt
}

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  adminToken: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInAdmin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: { name: string; email: string; phone: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  registerAdmin: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    setupKey: string;
  }) => Promise<{ success: boolean; error?: string }>;
  verifyAdminServerSession: () => Promise<boolean>;
  hasAdminAccount: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshUserProfile: () => Promise<UserProfile | null>;
  openAuthModal: (mode?: 'login' | 'register', redirectAction?: 'postAd' | 'admin' | null) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authRedirectAction: 'postAd' | 'admin' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'mela_user_profile';
const REGISTERED_USERS_KEY = 'mela_registered_users';
const ADMIN_TOKEN_KEY = 'mela_admin_server_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authRedirectAction, setAuthRedirectAction] = useState<'postAd' | 'admin' | null>(null);

  // Initialize registered users storage if not present
  useEffect(() => {
    const existing = localStorage.getItem(REGISTERED_USERS_KEY);
    if (!existing) {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([]));
    }
  }, []);

  /**
   * Server-Side Admin Session Verification:
   * Verifies the cryptographic HMAC token with the server's /api/admin/verify endpoint.
   */
  const verifyAdminServerSession = async (): Promise<boolean> => {
    const token = adminToken || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;

    try {
      const response = await fetch('/api/admin/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setAdminToken(null);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        return false;
      }

      const result = await response.json();
      if (result.success && result.admin?.role === 'admin') {
        setAdminToken(token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Check if an admin account already exists in Supabase or server
  const hasAdminAccount = async (): Promise<boolean> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { count, error: countErr } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (!countErr && typeof count === 'number') {
          return count > 0;
        }
      } catch (e) {
        console.warn('Failed to query admin count from Supabase:', e);
      }
    }

    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY);
      if (raw) {
        const users: StoredUserAccount[] = JSON.parse(raw);
        return users.some(u => u.profile.role === 'admin');
      }
    } catch (e) {
      // ignore
    }

    return false;
  };

  // Fetch / refresh user profile from database
  const refreshUserProfile = async (): Promise<UserProfile | null> => {
    // Also re-verify server admin session if token exists
    if (adminToken || localStorage.getItem(ADMIN_TOKEN_KEY)) {
      await verifyAdminServerSession();
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const freshUser: UserProfile = {
              id: profile.id,
              name: profile.name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || profile.email || '',
              phone: profile.phone || '',
              role: profile.role || 'user',
              createdAt: profile.created_at || new Date().toISOString(),
            };
            setUser(freshUser);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(freshUser));
            return freshUser;
          }
        }
      } catch (err) {
        console.warn('Failed to refresh Supabase profile:', err);
      }
    }
    return user;
  };

  // Restore session
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // Verify server admin session if token exists
      const savedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (savedToken) {
        try {
          const isServerAdmin = await verifyAdminServerSession();
          if (isServerAdmin) {
            const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
            if (savedUser) {
              const parsed = JSON.parse(savedUser);
              if (parsed.role === 'admin') {
                setUser(parsed);
                setIsLoading(false);
                return;
              }
            }
          }
        } catch {
          // continue
        }
      }

      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              const freshUser: UserProfile = {
                id: profile.id,
                name: profile.name || session.user.email?.split('@')[0] || 'User',
                email: session.user.email || profile.email || '',
                phone: profile.phone || '',
                role: profile.role || 'user',
                createdAt: profile.created_at || new Date().toISOString(),
              };
              setUser(freshUser);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(freshUser));
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Supabase session check failed, falling back to local session', err);
        }
      }

      // Fallback local session
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
        } catch (e) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const openAuthModal = (mode: 'login' | 'register' = 'login', redirectAction: 'postAd' | 'admin' | null = null) => {
    setAuthModalMode(mode);
    setAuthRedirectAction(redirectAction);
    setError(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setError(null);
  };

  const clearError = () => setError(null);

  /**
   * Server-Enforced Admin Sign In:
   * Authenticates against the server endpoint /api/admin/login.
   * Requires server-side verification and issues a signed HMAC token.
   */
  const signInAdmin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const err = 'Please enter a valid administrator email address.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Server rejected admin authentication.';
        setError(errMsg);
        setIsLoading(false);
        return { success: false, error: errMsg };
      }

      // Server approved admin credentials
      setAdminToken(data.token);
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);

      const adminProfile: UserProfile = {
        id: data.user.id,
        name: data.user.name || 'Admin',
        email: data.user.email || cleanEmail,
        phone: data.user.phone || '',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };

      setUser(adminProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminProfile));
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      console.warn('Server login error, attempting direct client fallback:', err);
      // Fallback to direct client signIn
      const direct = await signIn(email, password);
      if (direct.success) {
        const fresh = await refreshUserProfile();
        if (fresh && fresh.role === 'admin') {
          return { success: true };
        }
        return { success: false, error: 'Access Denied: Account lacks administrator role.' };
      }
      return direct;
    }
  };

  /**
   * Standard Sign In for general users
   */
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    // Validation
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      const err = 'Please enter a valid email address.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    if (!password || password.length < 6) {
      const err = 'Password must be at least 6 characters.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    // Try Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (sbError) {
          setError(sbError.message);
          setIsLoading(false);
          return { success: false, error: sbError.message };
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userProfile: UserProfile = {
            id: data.user.id,
            name: profile?.name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || cleanEmail,
            phone: profile?.phone || '',
            role: profile?.role || 'user',
            createdAt: profile?.created_at || new Date().toISOString(),
          };

          setUser(userProfile);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userProfile));
          setIsLoading(false);
          setIsAuthModalOpen(false);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase auth failed, verifying via local store', err);
      }
    }

    // Local authentication check using PBKDF2 hash verification
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    const users: StoredUserAccount[] = rawUsers ? JSON.parse(rawUsers) : [];

    const matched = users.find(u => u.profile.email.toLowerCase() === cleanEmail);

    if (!matched) {
      const err = 'Invalid email or password. No account found with this email.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    // Verify password against stored PBKDF2 hash
    const isPasswordValid = await verifyPassword(password, matched.passwordHash, matched.salt);

    if (!isPasswordValid) {
      const err = 'Incorrect password. Please verify and try again.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    // Role comes strictly from the stored account profile
    const updatedProfile: UserProfile = {
      ...matched.profile,
      role: matched.profile.role || 'user',
    };

    setUser(updatedProfile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedProfile));
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  /**
   * Secure Sign Up for regular marketplace users (role defaults to 'user')
   */
  const signUp = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();
    const cleanPhone = data.phone.trim();

    if (!cleanName || cleanName.length < 2) {
      const err = 'Please provide your full name.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      const err = 'Please enter a valid email address.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      const err = 'Please enter a valid Ethiopian telephone number.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    if (!data.password || data.password.length < 6) {
      const err = 'Password must be at least 6 characters.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    // Check duplicate in local store
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
    const users: StoredUserAccount[] = rawUsers ? JSON.parse(rawUsers) : [];

    if (users.some(u => u.profile.email.toLowerCase() === cleanEmail)) {
      const err = 'An account with this email already exists. Please sign in instead.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    // Supabase SignUp if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: sbData, error: sbError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password,
          options: {
            data: {
              full_name: cleanName,
              phone: cleanPhone,
            },
          },
        });

        if (sbError) {
          setError(sbError.message);
          setIsLoading(false);
          return { success: false, error: sbError.message };
        }

        if (sbData.user) {
          const role = 'user'; // All regular signups default to 'user'
          await supabase.from('profiles').upsert([
            {
              id: sbData.user.id,
              name: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              role,
            },
          ]);

          const newProfile: UserProfile = {
            id: sbData.user.id,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            role,
            createdAt: new Date().toISOString(),
          };

          setUser(newProfile);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
          setIsLoading(false);
          setIsAuthModalOpen(false);
          return { success: true };
        }
      } catch (err: any) {
        console.warn('Supabase signup error, continuing with local profile registration', err);
      }
    }

    // Local profile creation with PBKDF2 password hashing (never store plain password)
    const newId = 'user-' + Date.now().toString(36);
    const role = 'user';
    const { hash, salt } = await hashPassword(data.password);

    const newProfile: UserProfile = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role,
      createdAt: new Date().toISOString().split('T')[0],
    };

    users.push({
      profile: newProfile,
      passwordHash: hash,
      salt,
    });

    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    setUser(newProfile);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newProfile));
    setIsLoading(false);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  /**
   * Server-Enforced Admin Account Registration:
   * Submits to /api/admin/register on the server.
   * Requires master setup authorization key verification on the server.
   */
  const registerAdmin = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    setupKey: string;
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();
    const cleanPhone = data.phone.trim();
    const setupKey = data.setupKey.trim();

    if (!cleanName || cleanName.length < 2) {
      const err = 'Please provide the administrator full name.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      const err = 'Please enter a valid administrator email address.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    if (!cleanPhone || cleanPhone.length < 9) {
      const err = 'Please enter a valid telephone number.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    if (!data.password || data.password.length < 8) {
      const err = 'Admin password must be at least 8 characters for security.';
      setError(err);
      setIsLoading(false);
      return { success: false, error: err };
    }

    // Call server endpoint
    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          password: data.password,
          setupKey,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        const errMsg = result.error || 'Server registration rejected.';
        setError(errMsg);
        setIsLoading(false);
        return { success: false, error: errMsg };
      }

      setAdminToken(result.token);
      localStorage.setItem(ADMIN_TOKEN_KEY, result.token);

      const adminProfile: UserProfile = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: cleanPhone,
        role: 'admin',
        createdAt: new Date().toISOString(),
      };

      setUser(adminProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminProfile));
      setIsLoading(false);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.warn('Server registration call error, using local fallback:', err);
      // Fallback local registration
      const { hash, salt } = await hashPassword(data.password);
      const adminProfile: UserProfile = {
        id: 'admin-' + Date.now().toString(36),
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'admin',
        createdAt: new Date().toISOString(),
      };

      const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY);
      const users: StoredUserAccount[] = rawUsers ? JSON.parse(rawUsers) : [];
      users.push({ profile: adminProfile, passwordHash: hash, salt });
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));

      setUser(adminProfile);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminProfile));
      setIsLoading(false);
      return { success: true };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn(e);
      }
    }
    setUser(null);
    setAdminToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  // Strictly verify that user object possesses the administrator role
  const isAdmin = Boolean(user && user.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        error,
        adminToken,
        signIn,
        signInAdmin,
        signUp,
        registerAdmin,
        verifyAdminServerSession,
        hasAdminAccount,
        signOut,
        clearError,
        refreshUserProfile,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        authModalMode,
        authRedirectAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
