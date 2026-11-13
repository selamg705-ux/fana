import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { safeApiFetch, safeText } from '../utils/api.ts';

function sanitizePermissions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => safeText(item, '')).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((s) => s.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

export function sanitizeUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, any>;
  const rawRole = safeText(obj.role, 'customer') as User['role'];
  const validRole: User['role'] =
    rawRole === 'superadmin' || rawRole === 'admin' || rawRole === 'staff' || rawRole === 'seller' || rawRole === 'customer'
      ? rawRole
      : 'customer';
  const dbRoleRaw = safeText(obj.dbRole ?? obj.db_role, '');
  const dbRole: 'admin' | 'user' | undefined =
    dbRoleRaw === 'admin' ? 'admin' : dbRoleRaw === 'user' ? 'user' : undefined;

  const idNum = Number(obj.id);
  const sellerIdRaw = obj.sellerId ?? obj.seller_id;
  const sellerIdNum =
    sellerIdRaw !== null && sellerIdRaw !== undefined && sellerIdRaw !== ''
      ? Number(sellerIdRaw)
      : undefined;
  const storeNameRaw = obj.storeName ?? obj.store_name;
  const storeNameClean = storeNameRaw ? safeText(storeNameRaw, '') : '';

  return {
    id: Number.isFinite(idNum) ? idNum : 0,
    fullName: safeText(obj.fullName ?? obj.full_name ?? obj.email ?? obj.phone, 'User'),
    email: obj.email ? safeText(obj.email, '') || null : null,
    phone: obj.phone ? safeText(obj.phone, '') || null : null,
    role: validRole,
    dbRole,
    isActive: obj.isActive !== false && obj.is_active !== false,
    sellerId: sellerIdNum !== undefined && Number.isFinite(sellerIdNum) ? sellerIdNum : undefined,
    storeName: storeNameClean || undefined,
    permissions: sanitizePermissions(obj.permissions),
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      const savedToken = localStorage.getItem('mela_token');
      return typeof savedToken === 'string' && savedToken.trim() ? savedToken : null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('mela_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return sanitizeUser(parsed);
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearStoredAuth = () => {
    try {
      localStorage.removeItem('mela_token');
      localStorage.removeItem('mela_user');
    } catch {}
    setToken(null);
    setUser(null);
  };

  const fetchCurrentUser = async (currentToken: string) => {
    try {
      const result = await safeApiFetch<User>('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      });
      if (result.ok) {
        const normalized = sanitizeUser(result.data);
        if (!normalized) {
          clearStoredAuth();
          return;
        }
        setUser(normalized);
        try {
          localStorage.setItem('mela_user', JSON.stringify(normalized));
        } catch {}
      } else if (result.status === 401 || result.status === 403) {
        // Explicitly unauthorized or suspended - clear session
        clearStoredAuth();
      }
      // If network is offline or server returned transient 500, retain cached user from localStorage
    } catch (err) {
      console.warn('Failed to fetch user session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    if (!newToken || typeof newToken !== 'string') {
      return;
    }
    const normalizedUser = sanitizeUser(newUser);
    if (!normalizedUser) {
      return;
    }
    try {
      localStorage.setItem('mela_token', newToken);
      localStorage.setItem('mela_user', JSON.stringify(normalizedUser));
    } catch (e) {
      console.warn('Could not persist auth to localStorage:', e);
    }
    setToken(newToken);
    setUser(normalizedUser);
  };

  const logout = () => {
    clearStoredAuth();
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const merged = sanitizeUser({ ...user, ...updatedUser });
      if (!merged) return;
      setUser(merged);
      try {
        localStorage.setItem('mela_user', JSON.stringify(merged));
      } catch {}
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    }
  };

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.dbRole === 'admin' || user?.role === 'admin' || isSuperAdmin;
  const isSeller = user?.role === 'seller' || isSuperAdmin || !!user?.sellerId;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSuperAdmin,
        isAdmin,
        isSeller,
        login,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
