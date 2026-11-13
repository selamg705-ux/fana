import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { query, getPool, getDbStatusReport, initializeDatabase, isNeonConnected, getDatabaseUrl, getNeonError } from './db.ts';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mela_market_super_secure_jwt_secret_et_2025';
const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
const RECEIPT_STORAGE_DIR = path.resolve(STORAGE_ROOT, 'payment-receipts');
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB max

const ALLOWED_RECEIPT_MIMES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function detectImageMagic(buf: Buffer): { mimeType: string; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: '.jpg' };
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mimeType: 'image/png', ext: '.png' };
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', ext: '.webp' };
  }
  return null;
}

function validateAndSaveReceiptFile(payload: any): {
  fileReference: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
} {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payment receipt payload.');
  }

  const rawData = typeof payload.dataBase64 === 'string' ? payload.dataBase64.trim() : '';
  const declaredMime = typeof payload.mimeType === 'string' ? payload.mimeType.trim().toLowerCase() : '';
  const rawFileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : 'receipt';

  if (!rawData) {
    throw new Error('Receipt image data is required.');
  }

  let base64Body = rawData;
  let dataUrlMime = '';
  const dataUrlMatch = rawData.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s);
  if (dataUrlMatch) {
    dataUrlMime = dataUrlMatch[1].toLowerCase();
    base64Body = dataUrlMatch[2];
  }

  const effectiveDeclaredMime = dataUrlMime || declaredMime;
  if (effectiveDeclaredMime && !ALLOWED_RECEIPT_MIMES[effectiveDeclaredMime]) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
  }

  const cleanedBase64 = base64Body.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/=]+$/.test(cleanedBase64)) {
    throw new Error('Corrupted or invalid image encoding.');
  }

  const buffer = Buffer.from(cleanedBase64, 'base64');
  if (!buffer.length) {
    throw new Error('Uploaded receipt file is empty.');
  }

  if (buffer.length > MAX_RECEIPT_BYTES) {
    throw new Error('Receipt file size exceeds the 5MB maximum limit.');
  }

  const detected = detectImageMagic(buffer);
  if (!detected) {
    throw new Error('Invalid image file content. Only real JPEG, PNG, or WebP images are accepted.');
  }

  if (effectiveDeclaredMime && ALLOWED_RECEIPT_MIMES[effectiveDeclaredMime] !== detected.ext) {
    throw new Error('File content does not match the declared image type.');
  }

  fs.mkdirSync(RECEIPT_STORAGE_DIR, { recursive: true });
  const safeStoredName = `${crypto.randomUUID()}${detected.ext}`;
  const fullPath = path.resolve(RECEIPT_STORAGE_DIR, safeStoredName);

  if (!fullPath.startsWith(RECEIPT_STORAGE_DIR + path.sep)) {
    throw new Error('Invalid receipt storage path.');
  }

  fs.writeFileSync(fullPath, buffer, { mode: 0o600 });

  const sanitizedOriginal = path.basename(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || `receipt${detected.ext}`;

  return {
    fileReference: `payment-receipts/${safeStoredName}`,
    originalFilename: sanitizedOriginal,
    mimeType: detected.mimeType,
    fileSize: buffer.length,
  };
}

function resolveReceiptAbsolutePath(fileReference: string): string | null {
  if (!fileReference || typeof fileReference !== 'string') return null;
  const resolved = path.resolve(STORAGE_ROOT, fileReference);
  if (!resolved.startsWith(RECEIPT_STORAGE_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function removeReceiptFileIfExists(fileReference?: string | null) {
  if (!fileReference) return;
  try {
    const absPath = resolveReceiptAbsolutePath(fileReference);
    if (absPath && fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (err) {
    console.warn('Could not clean up receipt file:', err);
  }
}

function tryAuthenticateOptional(req: Request): AuthenticatedRequest['user'] | null {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
  } catch {
    return null;
  }
}

// JWT Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    dbRole?: 'admin' | 'user';
    fullName: string;
    sellerId?: number;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Session expired or invalid token.' });
      return;
    }
    req.user = decoded;
    next();
  });
}

async function verifyAdminInDatabase(req: AuthenticatedRequest): Promise<{ ok: boolean; roleName?: string; dbRole?: 'admin' | 'user' }> {
  const activePool = getPool();
  if (activePool && isNeonConnected()) {
    const dbRes = await activePool.query(
      `SELECT u.id, u.role as db_role, u.is_active, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user?.id]
    );
    const dbUser = dbRes.rows[0];
    if (!dbUser || !dbUser.is_active || dbUser.db_role !== 'admin') {
      return { ok: false };
    }
    return { ok: true, roleName: dbUser.role_name || 'admin', dbRole: 'admin' };
  }
  const tokenIsAdmin = req.user?.role === 'superadmin' || req.user?.role === 'admin' || req.user?.dbRole === 'admin';
  return tokenIsAdmin ? { ok: true, roleName: req.user?.role, dbRole: 'admin' } : { ok: false };
}

// Middleware: Require Super Admin Role (verified against database users.role = 'admin')
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, async () => {
    try {
      const check = await verifyAdminInDatabase(req);
      if (!check.ok || check.roleName !== 'superadmin') {
        res.status(403).json({ error: 'Access denied: Super Admin privileges required.' });
        return;
      }
      if (req.user) {
        req.user.dbRole = 'admin';
        req.user.role = check.roleName;
      }
      next();
    } catch (err) {
      console.error('[Auth] Super Admin DB check failed:', err);
      res.status(500).json({ error: 'Authorization verification failed.' });
    }
  });
}

// Middleware: Require Admin or Super Admin Role (verified against database users.role = 'admin')
export function requireAdminOrSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, async () => {
    try {
      const check = await verifyAdminInDatabase(req);
      if (!check.ok || check.dbRole !== 'admin') {
        res.status(403).json({ error: 'Access denied: Administrative privileges required.' });
        return;
      }
      if (req.user) {
        req.user.dbRole = 'admin';
        if (check.roleName) req.user.role = check.roleName;
      }
      next();
    } catch (err) {
      console.error('[Auth] Admin DB check failed:', err);
      res.status(500).json({ error: 'Authorization verification failed.' });
    }
  });
}

// Middleware: Require Seller or Admin
export function requireSellerOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'seller' && req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: Seller or Admin privileges required.' });
      return;
    }
    next();
  });
}

// Helper: Log Admin Activity
async function logAdminActivity(adminId: number | undefined, adminName: string | undefined, action: string, targetType: string, targetId: string, details: string, req?: Request) {
  try {
    const ip = req?.headers['x-forwarded-for'] || req?.socket.remoteAddress || 'unknown';
    await query(`
      INSERT INTO admin_activity_logs (admin_id, admin_name, action, target_type, target_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [adminId || null, adminName || 'System', action, targetType, targetId, details, String(ip)]);
  } catch (e) {
    console.warn('Could not record admin activity log:', e);
  }
}

// -------------------------------------------------------------
// 1. DATABASE STATUS & DIAGNOSTICS ENDPOINTS
// -------------------------------------------------------------
router.get('/db/status', async (_req, res) => {
  try {
    const report = await getDbStatusReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

router.post('/db/configure', async (req, res) => {
  const { databaseUrl, directUrl } = req.body;
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    res.status(400).json({ error: 'Invalid connection string provided.' });
    return;
  }

  const cleanUrl = databaseUrl.trim().replace(/^['"](.*)['"]$/, '$1').trim();
  const cleanDirect = typeof directUrl === 'string' && directUrl.trim()
    ? directUrl.trim().replace(/^['"](.*)['"]$/, '$1').trim()
    : cleanUrl;

  try {
    process.env.DATABASE_URL = cleanUrl;
    process.env.DIRECT_URL = cleanDirect;

    // Persist to .env so restarts keep the new Neon PostgreSQL connection
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (/^DATABASE_URL=/m.test(envContent)) {
        envContent = envContent.replace(/^DATABASE_URL=.*$/gm, () => `DATABASE_URL="${cleanUrl}"`);
      } else {
        envContent += `\nDATABASE_URL="${cleanUrl}"\n`;
      }

      if (/^DIRECT_URL=/m.test(envContent)) {
        envContent = envContent.replace(/^DIRECT_URL=.*$/gm, () => `DIRECT_URL="${cleanDirect}"`);
      } else {
        envContent += `\nDIRECT_URL="${cleanDirect}"\n`;
      }

      fs.writeFileSync(envPath, envContent, 'utf8');
    } catch (fsErr) {
      console.warn('Could not persist DATABASE_URL to .env:', fsErr);
    }

    const initResult = await initializeDatabase(cleanUrl, cleanDirect);
    if (initResult.success) {
      res.json({
        success: true,
        message: 'Successfully connected and verified Neon PostgreSQL!',
        tablesCreated: initResult.tablesCreated
      });
    } else {
      res.status(400).json({ success: false, error: initResult.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. AUTHENTICATION & USER REGISTRATION
// NOTE: Region, Woreda and City MUST NOT appear in registration!
// -------------------------------------------------------------
router.post('/auth/register', async (req, res) => {
  const { fullName, email, phone, password, confirmPassword, isSeller, storeName } = req.body || {};

  // Validate inputs
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    res.status(400).json({ error: 'Please enter a valid full name (at least 2 characters).' });
    return;
  }

  if (fullName.trim().length > 150) {
    res.status(400).json({ error: 'Full name must be 150 characters or fewer.' });
    return;
  }

  const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;
  const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;

  if (!cleanEmail && !cleanPhone) {
    res.status(400).json({ error: 'Either email or phone number is required.' });
    return;
  }

  if (cleanEmail && (cleanEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const phoneDigits = cleanPhone ? cleanPhone.replace(/\D/g, '') : '';
  if (cleanPhone && (cleanPhone.length > 50 || phoneDigits.length < 7)) {
    res.status(400).json({ error: 'Please enter a valid phone number.' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }

  // Ensure a real Neon PostgreSQL connection is active (never fake success in memStore)
  if (!isNeonConnected() && getDatabaseUrl()) {
    await initializeDatabase();
  }

  const activePool = getPool();
  if (!activePool || !isNeonConnected()) {
    const reason = getNeonError() || 'DATABASE_URL is not configured';
    console.error('[Register] Registration blocked — Neon PostgreSQL is not connected:', reason);
    res.status(503).json({
      error: 'Registration is currently unavailable because the Neon PostgreSQL database is not connected.'
    });
    return;
  }

  const client = await activePool.connect();
  try {
    await client.query('BEGIN');

    // Check for duplicate email in Neon (case-insensitive)
    if (cleanEmail) {
      const emailCheck = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (emailCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }
    }

    // Check for duplicate phone in Neon (exact or normalized Ethiopian 9-digit suffix)
    if (cleanPhone) {
      const last9 = phoneDigits.slice(-9);
      const phoneCheck = await client.query(
        `SELECT id FROM users
         WHERE phone = $1
            OR ($2 <> '' AND REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') = $2)
            OR (LENGTH($3) >= 9 AND RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), 9) = $3)`,
        [cleanPhone, phoneDigits, last9]
      );
      if (phoneCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ error: 'An account with this phone number already exists.' });
        return;
      }
    }

    // Determine role (default to customer; or seller if opted) and ensure role row exists
    const targetRoleName = isSeller ? 'seller' : 'customer';
    let roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [targetRoleName]);
    if (roleRes.rows.length === 0) {
      await client.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [targetRoleName, targetRoleName === 'seller' ? 'Verified Seller with product and order management permissions' : 'Standard Customer with purchasing and review permissions']
      );
      roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [targetRoleName]);
    }
    const roleId = roleRes.rows[0]?.id;
    if (!roleId) {
      throw new Error(`Role '${targetRoleName}' could not be resolved in Neon database.`);
    }

    // Hash password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into Neon users table — newly registered accounts MUST ALWAYS receive database role 'user'
    const assignedDbRole = 'user';
    const userRes = await client.query(`
      INSERT INTO users (full_name, email, phone, password_hash, role_id, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING id, full_name, email, phone, role, is_active, created_at
    `, [fullName.trim(), cleanEmail, cleanPhone, passwordHash, roleId, assignedDbRole]);

    const newUser = userRes.rows[0];
    if (!newUser?.id) {
      throw new Error('User insert did not return a database ID.');
    }

    // Create user profile
    await client.query(`
      INSERT INTO user_profiles (user_id, bio, avatar_url)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
    `, [
      newUser.id,
      isSeller ? 'Seller on Mela Market' : 'Mela Market Customer',
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName.trim())}`
    ]);

    // If seller, register store
    const rawStoreName = isSeller
      ? (storeName && String(storeName).trim() ? String(storeName).trim() : `${fullName.trim()}'s Shop`)
      : null;
    const cleanStoreName = rawStoreName ? rawStoreName.slice(0, 150) : null;

    let sellerId: number | undefined;
    if (isSeller) {
      const storeRes = await client.query(`
        INSERT INTO sellers (user_id, store_name, business_phone, is_verified)
        VALUES ($1, $2, $3, FALSE)
        RETURNING id
      `, [newUser.id, cleanStoreName, cleanPhone]);
      sellerId = storeRes.rows[0]?.id;
    }

    // Verify user record and database-level role ('user') exist in Neon before committing
    const verifyRes = await client.query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.role as db_role, u.is_active,
             r.name as role_name, s.id as seller_id, s.store_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE u.id = $1
    `, [newUser.id]);

    const savedUser = verifyRes.rows[0];
    if (!savedUser || savedUser.db_role !== 'user') {
      throw new Error('Failed to verify saved user record and role in Neon PostgreSQL.');
    }

    await client.query('COMMIT');

    // Generate JWT token only after Neon commit is confirmed
    const safeFullName = savedUser.full_name || fullName.trim() || 'User';
    const token = jwt.sign(
      {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role_name,
        dbRole: 'user',
        fullName: safeFullName,
        sellerId: savedUser.seller_id ?? sellerId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created and verified in Neon PostgreSQL database!',
      token,
      user: {
        id: savedUser.id,
        fullName: safeFullName,
        full_name: safeFullName,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role_name,
        dbRole: 'user',
        isActive: savedUser.is_active,
        sellerId: savedUser.seller_id ?? sellerId,
        storeName: savedUser.store_name ?? cleanStoreName
      }
    });
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    console.error('[Register] Neon PostgreSQL registration error:', {
      code: err?.code,
      constraint: err?.constraint,
      message: err?.message
    });
    if (err?.code === '23505') {
      const detail = String(err?.detail || err?.constraint || '').toLowerCase();
      if (detail.includes('email')) {
        res.status(409).json({ error: 'An account with this email address already exists.' });
        return;
      }
      if (detail.includes('phone')) {
        res.status(409).json({ error: 'An account with this phone number already exists.' });
        return;
      }
      res.status(409).json({ error: 'An account with this email or phone number already exists.' });
      return;
    }

    res.status(500).json({ error: 'Registration failed due to a database error. Please try again.' });
  } finally {
    client.release();
  }
});

// Secure Login Endpoint with flexible phone and email matching
router.post('/auth/login', async (req, res) => {
  const { identifier, password } = req.body || {};

  if (!identifier || !password) {
    res.status(400).json({ error: 'Please enter both your email or phone and password.' });
    return;
  }

  const cleanId = String(identifier).trim().toLowerCase();
  const isEmailLogin = cleanId.includes('@');
  const digitsOnly = isEmailLogin ? '' : cleanId.replace(/\D/g, '');
  const altPhone = !isEmailLogin && digitsOnly
    ? (digitsOnly.startsWith('251')
        ? '0' + digitsOnly.slice(3)
        : digitsOnly.startsWith('0')
        ? '+251' + digitsOnly.slice(1)
        : '+251' + digitsOnly)
    : '';
  const last9Digits = !isEmailLogin && digitsOnly.length >= 9 ? digitsOnly.slice(-9) : '';

  try {
    // If DATABASE_URL is configured, ensure we query Neon directly (never stale memStore)
    if (getDatabaseUrl() && !isNeonConnected()) {
      await initializeDatabase();
    }

    if (getDatabaseUrl() && (!getPool() || !isNeonConnected())) {
      console.error('[Login] Neon PostgreSQL unavailable:', getNeonError());
      res.status(503).json({
        error: 'Database service is currently unavailable. Please try again shortly.'
      });
      return;
    }

    const activePool = getPool();
    const loginSql = `
      SELECT u.id, u.full_name, u.email, u.phone, u.password_hash, u.is_active, u.role_id,
             u.role as db_role,
             COALESCE(u.permissions, '{}') as permissions,
             r.name as role_name, s.id as seller_id, s.store_name, s.is_verified as seller_verified
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE LOWER(u.email) = $1
         OR LOWER(u.phone) = $1
         OR ($2 <> '' AND u.phone = $2)
         OR ($3 <> '' AND RIGHT(REGEXP_REPLACE(COALESCE(u.phone, ''), '[^0-9]', '', 'g'), 9) = $3)
    `;

    // Find user by email or phone in Neon (or memStore superadmin fallback only if DATABASE_URL is not configured yet)
    const userRes = activePool && isNeonConnected()
      ? await activePool.query(loginSql, [cleanId, altPhone, last9Digits])
      : await query(loginSql, [cleanId, altPhone, last9Digits]);

    if (userRes.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials. User account not found.' });
      return;
    }

    const user = userRes.rows[0];

    // Check account status
    if (!user.is_active) {
      res.status(403).json({ error: 'Your account has been suspended by the marketplace administrator.' });
      return;
    }

    // Verify password with bcrypt
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
      return;
    }

    const userRole = user.role_name || (user.db_role === 'admin' ? 'admin' : 'customer');
    const dbRole: 'admin' | 'user' = user.db_role === 'admin' || userRole === 'superadmin' || userRole === 'admin' ? 'admin' : 'user';
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const safeFullName = user.full_name || 'User';

    // Sign JWT session token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: userRole,
        dbRole,
        permissions: userPermissions,
        fullName: safeFullName,
        sellerId: user.seller_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // If admin or superadmin logged in, record in activity logs
    if (dbRole === 'admin' || userRole === 'staff') {
      await logAdminActivity(user.id, safeFullName, 'ADMIN_LOGIN', 'AUTH', String(user.id), `Admin/Staff logged in from IP`, req);
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: safeFullName,
        full_name: safeFullName,
        email: user.email,
        phone: user.phone,
        role: userRole,
        dbRole,
        permissions: userPermissions,
        isActive: user.is_active,
        sellerId: user.seller_id,
        storeName: user.store_name,
        sellerVerified: user.seller_verified
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: `Login failed: ${err.message}` });
  }
});

// Current User Profile
router.get('/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userRes = await query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.role as db_role, u.is_active, u.created_at,
             COALESCE(u.permissions, '{}') as permissions,
             r.name as role_name, up.avatar_url, up.bio,
             s.id as seller_id, s.store_name, s.is_verified as seller_verified, s.rating as seller_rating
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE u.id = $1
    `, [req.user?.id]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found in Neon.' });
      return;
    }

    const u = userRes.rows[0];
    const safeFullName = u.full_name || 'User';
    const roleName = u.role_name || (u.db_role === 'admin' ? 'admin' : 'customer');
    const dbRole: 'admin' | 'user' = u.db_role === 'admin' || roleName === 'superadmin' || roleName === 'admin' ? 'admin' : 'user';

    res.json({
      id: u.id,
      fullName: safeFullName,
      full_name: safeFullName,
      email: u.email,
      phone: u.phone,
      role: roleName,
      dbRole,
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      isActive: u.is_active,
      createdAt: u.created_at,
      avatarUrl: u.avatar_url,
      bio: u.bio,
      sellerId: u.seller_id,
      storeName: u.store_name,
      sellerVerified: u.seller_verified,
      sellerRating: u.seller_rating
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
router.put('/auth/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { fullName, phone, bio, avatarUrl } = req.body;
  const userId = req.user?.id;

  try {
    if (fullName) {
      await query('UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2', [fullName.trim(), userId]);
    }
    if (phone) {
      await query('UPDATE users SET phone = $1, updated_at = NOW() WHERE id = $2', [phone.trim(), userId]);
    }

    await query(`
      INSERT INTO user_profiles (user_id, bio, avatar_url, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO UPDATE SET bio = COALESCE($2, user_profiles.bio), avatar_url = COALESCE($3, user_profiles.avatar_url), updated_at = NOW()
    `, [userId, bio || null, avatarUrl || null]);

    res.json({ message: 'Profile updated successfully in Neon' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Allow Users To Change Their Own Password Securely
router.put('/auth/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Both current password and new password are required.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }

  try {
    const userRes = await query('SELECT password_hash, full_name, email FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    const currentHash = userRes.rows[0].password_hash;
    const match = await bcrypt.compare(currentPassword, currentHash);
    if (!match) {
      res.status(401).json({ error: 'Current password does not match.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    await logAdminActivity(
      userId,
      userRes.rows[0].full_name,
      'USER_CHANGE_PASSWORD',
      'USER',
      String(userId),
      'User changed their password securely',
      req
    );

    res.json({ message: 'Your password has been changed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 3. MARKETPLACE CATEGORIES & PUBLIC PRODUCTS
// Core Requirement: Separate New (አዲስ እቃ) and Used (ያገለገሉ እቃ) queries
// -------------------------------------------------------------
router.get('/categories', async (_req, res) => {
  try {
    const catsRes = await query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'approved'
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.name ASC
    `);
    res.json(catsRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Products with flexible filtering
router.get('/products', async (req, res) => {
  const { condition, category, search, region, minPrice, maxPrice, sort, limit = 50, offset = 0 } = req.query;

  try {
    let sql = `
      SELECT p.id, p.title, p.title_amharic, p.description, p.price, p.original_price,
             p.condition, p.stock, p.region, p.woreda, p.city, p.status, p.is_featured,
             p.views_count, p.created_at,
             c.name as category_name, c.name_amharic as category_name_amharic, c.slug as category_slug,
             s.id as seller_id, s.store_name, s.is_verified as seller_verified, s.rating as seller_rating,
             (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sellers s ON p.seller_id = s.id
      WHERE p.status = 'approved'
    `;

    const params: any[] = [];
    let pIdx = 1;

    // Condition filter: 'new' or 'used'
    if (condition && (condition === 'new' || condition === 'used')) {
      sql += ` AND p.condition = $${pIdx++}`;
      params.push(condition);
    }

    if (category) {
      sql += ` AND (c.slug = $${pIdx} OR c.id::text = $${pIdx})`;
      params.push(String(category));
      pIdx++;
    }

    if (region) {
      sql += ` AND p.region = $${pIdx++}`;
      params.push(String(region));
    }

    if (search) {
      sql += ` AND (LOWER(p.title) LIKE $${pIdx} OR LOWER(COALESCE(p.title_amharic, '')) LIKE $${pIdx} OR LOWER(p.description) LIKE $${pIdx})`;
      params.push(`%${String(search).toLowerCase()}%`);
      pIdx++;
    }

    if (minPrice) {
      sql += ` AND p.price >= $${pIdx++}`;
      params.push(parseFloat(String(minPrice)));
    }

    if (maxPrice) {
      sql += ` AND p.price <= $${pIdx++}`;
      params.push(parseFloat(String(maxPrice)));
    }

    // Sorting
    if (sort === 'price_asc') {
      sql += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY p.price DESC`;
    } else {
      sql += ` ORDER BY p.is_featured DESC, p.created_at DESC`;
    }

    sql += ` LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    params.push(parseInt(String(limit), 10), parseInt(String(offset), 10));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single Product Details
router.get('/products/:id', async (req, res) => {
  const prodId = parseInt(req.params.id, 10);
  if (isNaN(prodId)) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  try {
    // Increment view count
    await query('UPDATE products SET views_count = views_count + 1 WHERE id = $1', [prodId]);

    const prodRes = await query(`
      SELECT p.*,
             c.name as category_name, c.name_amharic as category_name_amharic, c.slug as category_slug,
             s.id as seller_id, s.store_name, s.business_phone, s.is_verified as seller_verified, s.rating as seller_rating,
             u.full_name as seller_owner_name, u.email as seller_email
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sellers s ON p.seller_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE p.id = $1
    `, [prodId]);

    if (prodRes.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Fetch all images
    const imagesRes = await query(`
      SELECT id, image_url, is_primary FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, id ASC
    `, [prodId]);

    const product = prodRes.rows[0];
    product.images = imagesRes.rows;

    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. SELLING FORM & ETHIOPIAN LOCATION SYSTEM
// Ethiopian Location (Region, Woreda, City) ONLY in selling form!
// -------------------------------------------------------------
router.post('/products', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const {
    title, titleAmharic, description, price, originalPrice,
    condition, stock, categoryId, region, woreda, city, images
  } = req.body;

  // Validation
  if (!title || String(title).trim().length < 3) {
    res.status(400).json({ error: 'Product title is required (minimum 3 characters).' });
    return;
  }

  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    res.status(400).json({ error: 'A valid product price in ETB is required.' });
    return;
  }

  if (condition !== 'new' && condition !== 'used') {
    res.status(400).json({ error: 'Product condition must be either "new" (አዲስ እቃ) or "used" (ያገለገሉ እቃ).' });
    return;
  }

  // Location validation (MANDATORY IN SELLING FORM ONLY)
  if (!region || !woreda || !city) {
    res.status(400).json({ error: 'Ethiopian location details (Region/ክልል, Woreda/ወረዳ, and City/ከተማ) are required.' });
    return;
  }

  try {
    const userId = req.user?.id;
    let sellerId = req.user?.sellerId;

    // If user is not yet registered as a seller, auto-register as seller
    if (!sellerId) {
      const sellerRes = await query(`
        INSERT INTO sellers (user_id, store_name, is_verified)
        VALUES ($1, $2, FALSE)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `, [userId, `${req.user?.fullName}'s Shop`]);
      sellerId = sellerRes.rows[0].id;

      // Update role if customer (database role remains 'user', never elevated to 'admin')
      if (req.user?.role === 'customer') {
        const selRoleRes = await query("SELECT id FROM roles WHERE name = 'seller'");
        if (selRoleRes.rows.length > 0) {
          await query("UPDATE users SET role_id = $1, role = 'user' WHERE id = $2 AND role <> 'admin'", [selRoleRes.rows[0].id, userId]);
        }
      }
    }

    // Check marketplace setting if approval required
    const setRes = await query("SELECT value FROM marketplace_settings WHERE key = 'require_product_approval'");
    const requireApproval = setRes.rows[0]?.value === 'true';
    const initialStatus = requireApproval && req.user?.role !== 'superadmin' && req.user?.role !== 'admin'
      ? 'pending'
      : 'approved';

    // Insert Product into Neon
    const insertRes = await query(`
      INSERT INTO products (
        seller_id, category_id, title, title_amharic, description,
        price, original_price, condition, stock, region, woreda, city, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      sellerId,
      categoryId || null,
      title.trim(),
      titleAmharic ? titleAmharic.trim() : null,
      description ? description.trim() : title.trim(),
      parseFloat(price),
      originalPrice ? parseFloat(originalPrice) : null,
      condition,
      parseInt(stock || 1, 10),
      region.trim(),
      woreda.trim(),
      city.trim(),
      initialStatus
    ]);

    const createdProduct = insertRes.rows[0];

    // Insert Product Images
    const imageList: string[] = Array.isArray(images) && images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];

    for (let i = 0; i < imageList.length; i++) {
      await query(`
        INSERT INTO product_images (product_id, image_url, is_primary)
        VALUES ($1, $2, $3)
      `, [createdProduct.id, imageList[i], i === 0]);
    }

    res.status(201).json({
      message: 'Product listed successfully in Neon PostgreSQL!',
      product: createdProduct
    });
  } catch (err: any) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: `Failed to create product: ${err.message}` });
  }
});

// Update Product
router.put('/products/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const prodId = parseInt(req.params.id, 10);
  const { title, titleAmharic, description, price, originalPrice, condition, stock, categoryId, region, woreda, city, status } = req.body;

  try {
    // Verify ownership or admin privileges
    const checkRes = await query('SELECT seller_id FROM products WHERE id = $1', [prodId]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const isAuthorized = req.user?.role === 'superadmin' ||
                         req.user?.role === 'admin' ||
                         checkRes.rows[0].seller_id === req.user?.sellerId;

    if (!isAuthorized) {
      res.status(403).json({ error: 'You do not have permission to edit this product.' });
      return;
    }

    await query(`
      UPDATE products
      SET title = COALESCE($1, title),
          title_amharic = COALESCE($2, title_amharic),
          description = COALESCE($3, description),
          price = COALESCE($4, price),
          original_price = COALESCE($5, original_price),
          condition = COALESCE($6, condition),
          stock = COALESCE($7, stock),
          category_id = COALESCE($8, category_id),
          region = COALESCE($9, region),
          woreda = COALESCE($10, woreda),
          city = COALESCE($11, city),
          status = COALESCE($12, status),
          updated_at = NOW()
      WHERE id = $13
    `, [
      title ? title.trim() : null,
      titleAmharic ? titleAmharic.trim() : null,
      description ? description.trim() : null,
      price ? parseFloat(price) : null,
      originalPrice !== undefined ? parseFloat(originalPrice) : null,
      condition || null,
      stock !== undefined ? parseInt(stock, 10) : null,
      categoryId || null,
      region || null,
      woreda || null,
      city || null,
      status || null,
      prodId
    ]);

    res.json({ message: 'Product updated successfully in Neon' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Product
router.delete('/products/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const prodId = parseInt(req.params.id, 10);

  try {
    const checkRes = await query('SELECT title, seller_id FROM products WHERE id = $1', [prodId]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const prod = checkRes.rows[0];
    const isAuthorized = req.user?.role === 'superadmin' ||
                         req.user?.role === 'admin' ||
                         prod.seller_id === req.user?.sellerId;

    if (!isAuthorized) {
      res.status(403).json({ error: 'You do not have permission to delete this product.' });
      return;
    }

    await query('DELETE FROM products WHERE id = $1', [prodId]);

    if (req.user?.role === 'superadmin' || req.user?.role === 'admin') {
      await logAdminActivity(req.user.id, req.user.fullName, 'DELETE_PRODUCT', 'PRODUCT', String(prodId), `Deleted product: "${prod.title}"`, req);
    }

    res.json({ message: 'Product removed from marketplace' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. SELLER DASHBOARD ENDPOINTS
// -------------------------------------------------------------
router.get('/seller/dashboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const sellerId = req.user?.sellerId;
  if (!sellerId) {
    res.status(400).json({ error: 'User is not a registered seller' });
    return;
  }

  try {
    // Stats for seller
    const prodStats = await query(`
      SELECT
        COUNT(*) as total_products,
        COUNT(CASE WHEN condition = 'new' THEN 1 END) as new_products,
        COUNT(CASE WHEN condition = 'used' THEN 1 END) as used_products,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_products,
        COALESCE(SUM(views_count), 0) as total_views
      FROM products WHERE seller_id = $1
    `, [sellerId]);

    const orderStats = await query(`
      SELECT
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END) as pending_orders,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_sales_volume
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.seller_id = $1
    `, [sellerId]);

    res.json({
      products: prodStats.rows[0],
      orders: orderStats.rows[0]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seller/products', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const sellerId = req.user?.sellerId;
  if (!sellerId) {
    res.status(400).json({ error: 'Not a seller' });
    return;
  }

  try {
    const listRes = await query(`
      SELECT p.*, c.name as category_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = $1
      ORDER BY p.created_at DESC
    `, [sellerId]);

    res.json(listRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/seller/orders', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const sellerId = req.user?.sellerId;
  if (!sellerId) {
    res.status(400).json({ error: 'Not a seller' });
    return;
  }

  try {
    const ordersRes = await query(`
      SELECT o.id, o.order_number, o.status, o.total_amount, o.payment_method,
             o.shipping_address, o.phone, o.customer_name, o.created_at,
             json_agg(json_build_object(
               'id', oi.id,
               'product_title', oi.product_title,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price,
               'product_id', oi.product_id
             )) as items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [sellerId]);

    res.json(ordersRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status by seller (permitted transitions)
router.put('/seller/orders/:id/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { status } = req.body;
  const sellerId = req.user?.sellerId;

  try {
    // Check seller has items in this order
    const checkRes = await query('SELECT id FROM order_items WHERE order_id = $1 AND seller_id = $2', [orderId, sellerId]);
    if (checkRes.rows.length === 0 && req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Order not found for your seller account.' });
      return;
    }

    await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, orderId]);
    res.json({ message: 'Order status updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 6. ORDERS & CHECKOUT ENDPOINTS
// -------------------------------------------------------------
router.post('/orders', async (req, res) => {
  const { customerName, phone, shippingAddress, shippingCity, paymentMethod, notes, items, paymentReceipt } = req.body;

  if (!customerName || !phone || !shippingAddress) {
    res.status(400).json({ error: 'Customer name, phone number and delivery address are required.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Order must contain at least one item.' });
    return;
  }

  const authUser = tryAuthenticateOptional(req);
  const effectiveBuyerId = authUser?.id || null;

  let savedReceipt: ReturnType<typeof validateAndSaveReceiptFile> | null = null;
  if (paymentReceipt) {
    try {
      savedReceipt = validateAndSaveReceiptFile(paymentReceipt);
    } catch (fileErr: any) {
      res.status(400).json({ error: fileErr.message || 'Invalid payment receipt image.' });
      return;
    }
  }

  try {
    // Calculate total amount directly from database to prevent price tampering
    let total = 0;
    const itemRecords: any[] = [];

    for (const it of items) {
      const prodRes = await query('SELECT id, title, price, seller_id, stock FROM products WHERE id = $1', [it.productId]);
      if (prodRes.rows.length === 0) {
        if (savedReceipt) removeReceiptFileIfExists(savedReceipt.fileReference);
        res.status(404).json({ error: `Product with ID ${it.productId} not found` });
        return;
      }
      const p = prodRes.rows[0];
      const qty = parseInt(it.quantity || 1, 10);
      const unitPrice = parseFloat(p.price);
      total += unitPrice * qty;

      itemRecords.push({
        productId: p.id,
        sellerId: p.seller_id,
        title: p.title,
        quantity: qty,
        unitPrice
      });
    }

    const orderNumber = `MM-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Insert order in Neon
    const orderRes = await query(`
      INSERT INTO orders (
        order_number, buyer_id, total_amount, status, payment_method,
        shipping_address, shipping_city, phone, customer_name, notes
      )
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      orderNumber,
      effectiveBuyerId,
      total,
      paymentMethod || 'Telebirr',
      shippingAddress.trim(),
      shippingCity || 'Addis Ababa',
      phone.trim(),
      customerName.trim(),
      notes || null
    ]);

    const createdOrder = orderRes.rows[0];

    // Insert order items
    for (const ir of itemRecords) {
      await query(`
        INSERT INTO order_items (order_id, product_id, seller_id, product_title, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [createdOrder.id, ir.productId, ir.sellerId, ir.title, ir.quantity, ir.unitPrice]);

      // Decrement stock
      await query(`
        UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2
      `, [ir.quantity, ir.productId]);
    }

    let createdReceipt = null;
    if (savedReceipt) {
      const recRes = await query(`
        INSERT INTO payment_receipts (
          order_id, customer_id, file_reference, original_filename, mime_type, file_size, verification_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
      `, [
        createdOrder.id,
        effectiveBuyerId,
        savedReceipt.fileReference,
        savedReceipt.originalFilename,
        savedReceipt.mimeType,
        savedReceipt.fileSize
      ]);
      createdReceipt = recRes.rows[0];
    }

    res.status(201).json({
      message: 'Order created successfully in Neon database!',
      order: { ...createdOrder, payment_receipt: createdReceipt },
      receipt: createdReceipt
    });
  } catch (err: any) {
    if (savedReceipt) removeReceiptFileIfExists(savedReceipt.fileReference);
    console.error('Order creation error:', err);
    res.status(500).json({ error: `Order placement failed: ${err.message}` });
  }
});

async function canUserAccessOrder(req: AuthenticatedRequest, order: { buyer_id: number | null; phone: string | null }, receiptCustomerId?: number | null): Promise<boolean> {
  const adminCheck = await verifyAdminInDatabase(req);
  if (adminCheck.ok && adminCheck.dbRole === 'admin') {
    return true;
  }
  const userId = req.user?.id;
  if (!userId) return false;
  if (order.buyer_id === userId || (receiptCustomerId !== undefined && receiptCustomerId === userId)) {
    return true;
  }
  if (order.buyer_id == null && order.phone) {
    const userRes = await query('SELECT phone FROM users WHERE id = $1', [userId]);
    const userPhone = userRes.rows[0]?.phone;
    if (userPhone && userPhone === order.phone) {
      return true;
    }
  }
  return false;
}

// Upload or replace payment receipt for an existing order (Authenticated Owner or Admin)
router.post('/orders/:id/receipt', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: 'Invalid order ID.' });
    return;
  }

  let savedReceipt: ReturnType<typeof validateAndSaveReceiptFile> | null = null;
  try {
    const orderRes = await query('SELECT id, buyer_id, phone, payment_status FROM orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const order = orderRes.rows[0];
    const existingRes = await query('SELECT * FROM payment_receipts WHERE order_id = $1', [orderId]);
    const existingReceipt = existingRes.rows[0] || null;

    const allowed = await canUserAccessOrder(req, order, existingReceipt?.customer_id);
    if (!allowed) {
      res.status(403).json({ error: 'Access denied: You are not authorized to upload a receipt for this order.' });
      return;
    }

    const adminCheck = await verifyAdminInDatabase(req);
    const isAdmin = adminCheck.ok && adminCheck.dbRole === 'admin';
    if (existingReceipt?.verification_status === 'approved' && !isAdmin) {
      res.status(400).json({ error: 'This payment receipt has already been approved and cannot be replaced.' });
      return;
    }

    try {
      savedReceipt = validateAndSaveReceiptFile(req.body);
    } catch (fileErr: any) {
      res.status(400).json({ error: fileErr.message || 'Invalid payment receipt image.' });
      return;
    }

    const effectiveCustomerId = order.buyer_id ?? req.user?.id ?? null;
    const upsertRes = await query(`
      INSERT INTO payment_receipts (
        order_id, customer_id, file_reference, original_filename, mime_type, file_size,
        verification_status, admin_notes, verified_by, uploaded_at, verified_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', NULL, NULL, NOW(), NULL, NOW())
      ON CONFLICT (order_id) DO UPDATE SET
        customer_id = COALESCE(EXCLUDED.customer_id, payment_receipts.customer_id),
        file_reference = EXCLUDED.file_reference,
        original_filename = EXCLUDED.original_filename,
        mime_type = EXCLUDED.mime_type,
        file_size = EXCLUDED.file_size,
        verification_status = 'pending',
        admin_notes = NULL,
        verified_by = NULL,
        uploaded_at = NOW(),
        verified_at = NULL,
        updated_at = NOW()
      RETURNING *
    `, [
      orderId,
      effectiveCustomerId,
      savedReceipt.fileReference,
      savedReceipt.originalFilename,
      savedReceipt.mimeType,
      savedReceipt.fileSize
    ]);

    if (existingReceipt?.file_reference && existingReceipt.file_reference !== savedReceipt.fileReference) {
      removeReceiptFileIfExists(existingReceipt.file_reference);
    }

    res.status(201).json({
      message: 'Payment receipt uploaded successfully and is pending verification.',
      receipt: upsertRes.rows[0]
    });
  } catch (err: any) {
    if (savedReceipt) removeReceiptFileIfExists(savedReceipt.fileReference);
    console.error('Receipt upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload payment receipt.' });
  }
});

// Securely serve payment receipt image ONLY to owning customer or authorized administrator
router.get('/payment-receipts/:id/file', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const receiptId = parseInt(req.params.id, 10);
  if (isNaN(receiptId)) {
    res.status(400).json({ error: 'Invalid receipt ID.' });
    return;
  }

  try {
    const recRes = await query(`
      SELECT pr.*, o.buyer_id as order_buyer_id, o.phone as order_phone
      FROM payment_receipts pr
      JOIN orders o ON pr.order_id = o.id
      WHERE pr.id = $1
    `, [receiptId]);

    if (recRes.rows.length === 0) {
      res.status(404).json({ error: 'Payment receipt not found.' });
      return;
    }

    const rec = recRes.rows[0];
    const allowed = await canUserAccessOrder(
      req,
      { buyer_id: rec.order_buyer_id, phone: rec.order_phone },
      rec.customer_id
    );

    if (!allowed) {
      res.status(403).json({ error: 'Access denied: You are not authorized to view this payment receipt.' });
      return;
    }

    const absPath = resolveReceiptAbsolutePath(rec.file_reference);
    if (!absPath || !fs.existsSync(absPath)) {
      res.status(404).json({ error: 'Receipt file could not be found in storage.' });
      return;
    }

    res.setHeader('Content-Type', rec.mime_type || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(absPath);
  } catch (err: any) {
    console.error('Receipt file fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve payment receipt file.' });
  }
});

// Customer's Orders
router.get('/orders/my-orders', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const listRes = await query(`
      SELECT o.*,
             json_agg(json_build_object(
               'id', oi.id,
               'product_title', oi.product_title,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price,
               'product_id', oi.product_id
             )) as items,
             CASE WHEN pr.id IS NOT NULL THEN json_build_object(
               'id', pr.id,
               'order_id', pr.order_id,
               'customer_id', pr.customer_id,
               'file_reference', pr.file_reference,
               'original_filename', pr.original_filename,
               'mime_type', pr.mime_type,
               'file_size', pr.file_size,
               'verification_status', pr.verification_status,
               'admin_notes', pr.admin_notes,
               'verified_by', pr.verified_by,
               'uploaded_at', pr.uploaded_at,
               'verified_at', pr.verified_at
             ) ELSE NULL END as payment_receipt
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN payment_receipts pr ON pr.order_id = o.id
      WHERE o.buyer_id = $1 OR (o.buyer_id IS NULL AND o.phone IS NOT NULL AND o.phone = (SELECT phone FROM users WHERE id = $1))
      GROUP BY o.id, pr.id
      ORDER BY o.created_at DESC
    `, [req.user?.id]);

    res.json(listRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. SUPER ADMIN COMPLETE CONTROL SYSTEM
// Complete marketplace authority with Neon persistence
// -------------------------------------------------------------
router.get('/admin/stats', requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const userStats = await query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = FALSE THEN 1 END) as suspended_users,
        COUNT(CASE WHEN u.role = 'user' THEN 1 END) as total_customers,
        COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as total_admins,
        COUNT(CASE WHEN r.name = 'staff' THEN 1 END) as total_staff
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
    `);

    const sellerStats = await query(`
      SELECT
        COUNT(*) as total_sellers,
        COUNT(CASE WHEN is_verified = TRUE THEN 1 END) as verified_sellers
      FROM sellers
    `);

    const productStats = await query(`
      SELECT
        COUNT(*) as total_products,
        COUNT(CASE WHEN condition = 'new' THEN 1 END) as new_products,
        COUNT(CASE WHEN condition = 'used' THEN 1 END) as used_products,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_moderation,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_products,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_products
      FROM products
    `);

    const orderStats = await query(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
    `);

    const categoryStats = await query(`
      SELECT COUNT(*) as total_categories FROM categories
    `);

    let reportStats = { rows: [{ pending_reports: 0, total_reports: 0 }] };
    try {
      reportStats = await query(`
        SELECT
          COUNT(*) as total_reports,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports
        FROM reports
      `);
    } catch {
      // reports table might be freshly created
    }

    const recentUsers = await query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.created_at, u.role as db_role, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC LIMIT 5
    `);

    const recentProducts = await query(`
      SELECT p.id, p.title, p.price, p.condition, p.region, p.status, p.created_at, s.store_name
      FROM products p
      LEFT JOIN sellers s ON p.seller_id = s.id
      ORDER BY p.created_at DESC LIMIT 5
    `);

    const recentActivities = await query(`
      SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 10
    `);

    res.json({
      users: userStats.rows[0],
      sellers: sellerStats.rows[0],
      products: productStats.rows[0],
      orders: orderStats.rows[0],
      categories: categoryStats.rows[0],
      reports: reportStats.rows[0],
      recentUsers: recentUsers.rows,
      recentProducts: recentProducts.rows,
      recentActivities: recentActivities.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: User Management List (retrieves and filters users by database role)
router.get('/admin/users', requireAdminOrSuperAdmin, async (req, res) => {
  const { search, role, status } = req.query;

  try {
    let sql = `
      SELECT u.id, u.full_name, u.email, u.phone, u.role as db_role, u.is_active, u.created_at, u.updated_at,
             COALESCE(u.permissions, '{}') as permissions,
             r.name as role_name, r.id as role_id,
             up.bio, up.avatar_url,
             s.id as seller_id, s.store_name, s.is_verified as seller_verified,
             (SELECT COUNT(*) FROM products WHERE seller_id = s.id) as total_products,
             (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id) as total_orders
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      sql += ` AND (LOWER(u.full_name) LIKE $${pIdx} OR LOWER(COALESCE(u.email,'')) LIKE $${pIdx} OR COALESCE(u.phone,'') LIKE $${pIdx})`;
      params.push(`%${String(search).toLowerCase()}%`);
      pIdx++;
    }

    if (role && role !== 'all') {
      const roleStr = String(role).toLowerCase();
      if (roleStr === 'admin' || roleStr === 'user') {
        sql += ` AND u.role = $${pIdx++}`;
        params.push(roleStr);
      } else {
        sql += ` AND r.name = $${pIdx++}`;
        params.push(roleStr);
      }
    }

    if (status !== undefined && status !== '' && status !== 'all') {
      sql += ` AND u.is_active = $${pIdx++}`;
      params.push(status === 'active');
    }

    sql += ` ORDER BY u.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Single User Detail with Products and Order History
router.get('/admin/users/:id', requireAdminOrSuperAdmin, async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  try {
    const userRes = await query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.role as db_role, u.is_active, u.created_at, u.updated_at,
             COALESCE(u.permissions, '{}') as permissions,
             r.name as role_name, up.bio, up.avatar_url,
             s.id as seller_id, s.store_name, s.is_verified as seller_verified, s.rating as seller_rating, s.total_sales
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE u.id = $1
    `, [userId]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found in Neon.' });
      return;
    }

    const userData = userRes.rows[0];

    // User's listed products (if seller)
    let userProducts: any[] = [];
    if (userData.seller_id) {
      const prodRes = await query(`
        SELECT p.id, p.title, p.price, p.condition, p.status, p.region, p.created_at,
               (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
        FROM products p
        WHERE p.seller_id = $1
        ORDER BY p.created_at DESC
      `, [userData.seller_id]);
      userProducts = prodRes.rows;
    }

    // User's order history
    const orderRes = await query(`
      SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.payment_status, o.created_at
      FROM orders o
      WHERE o.buyer_id = $1
      ORDER BY o.created_at DESC
    `, [userId]);

    res.json({
      user: userData,
      products: userProducts,
      orders: orderRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Edit User Details (Full Name, Email, Phone, Bio)
router.put('/admin/users/:id', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { fullName, email, phone, bio } = req.body;

  if (!fullName || !fullName.trim()) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }

  try {
    await query(`
      UPDATE users
      SET full_name = $1, email = $2, phone = $3, updated_at = NOW()
      WHERE id = $4
    `, [fullName.trim(), email?.trim() || null, phone?.trim() || null, targetUserId]);

    if (bio !== undefined) {
      await query(`
        INSERT INTO user_profiles (user_id, bio, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET bio = $2, updated_at = NOW()
      `, [targetUserId, bio]);
    }

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'EDIT_USER_PROFILE',
      'USER',
      String(targetUserId),
      `Updated profile information for user ID ${targetUserId} (${fullName})`,
      req
    );

    res.json({ message: 'User profile updated successfully in Neon PostgreSQL.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Suspend, Activate, Restore User
router.put('/admin/users/:id/status', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { isActive } = req.body;

  try {
    // Protect Super Admin from self-suspension
    if (targetUserId === req.user?.id) {
      res.status(400).json({ error: 'Super Admin cannot suspend their own account.' });
      return;
    }

    const userRes = await query('SELECT full_name, email FROM users WHERE id = $1', [targetUserId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [Boolean(isActive), targetUserId]);

    const action = isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER';
    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      action,
      'USER',
      String(targetUserId),
      `${action} on user "${userRes.rows[0].full_name}" (${userRes.rows[0].email})`,
      req
    );

    res.json({ message: `User account ${isActive ? 'activated' : 'suspended'} successfully in Neon.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Authorized Admin: Manage Permitted User Role (updates both users.role and role_id)
router.put('/admin/users/:id/role', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { roleName } = req.body || {};

  if (!roleName || typeof roleName !== 'string') {
    res.status(400).json({ error: 'Role name is required' });
    return;
  }

  const normalizedRole = roleName.trim().toLowerCase();

  try {
    // Prevent demoting self
    if (targetUserId === req.user?.id && normalizedRole !== 'superadmin' && normalizedRole !== 'admin') {
      res.status(400).json({ error: 'Cannot demote your own active administrator account.' });
      return;
    }

    const targetRes = await query(
      `SELECT u.id, u.role as db_role, r.name as current_role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [targetUserId]
    );
    if (targetRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found in Neon.' });
      return;
    }

    const targetUser = targetRes.rows[0];
    if ((targetUser.current_role_name === 'superadmin' || normalizedRole === 'superadmin') && req.user?.role !== 'superadmin') {
      res.status(403).json({ error: 'Only a Super Admin can modify or assign the Super Admin role.' });
      return;
    }

    let targetRoleLookup = normalizedRole;
    let targetDbRole: 'admin' | 'user' = 'user';

    if (normalizedRole === 'admin' || normalizedRole === 'superadmin') {
      targetDbRole = 'admin';
      targetRoleLookup = normalizedRole;
    } else if (normalizedRole === 'user') {
      targetDbRole = 'user';
      targetRoleLookup = ['seller', 'staff', 'customer'].includes(targetUser.current_role_name)
        ? targetUser.current_role_name
        : 'customer';
    } else if (['customer', 'seller', 'staff'].includes(normalizedRole)) {
      targetDbRole = 'user';
      targetRoleLookup = normalizedRole;
    } else {
      res.status(400).json({ error: 'Invalid role specified' });
      return;
    }

    const roleRes = await query('SELECT id, name FROM roles WHERE name = $1', [targetRoleLookup]);
    if (roleRes.rows.length === 0) {
      res.status(400).json({ error: 'Invalid role specified' });
      return;
    }
    const roleId = roleRes.rows[0].id;

    await query(
      'UPDATE users SET role_id = $1, role = $2, updated_at = NOW() WHERE id = $3',
      [roleId, targetDbRole, targetUserId]
    );

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_USER_ROLE',
      'USER',
      String(targetUserId),
      `Updated user role to "${roleRes.rows[0].name}" (database role: "${targetDbRole}")`,
      req
    );

    res.json({
      message: `User role updated to ${roleRes.rows[0].name} (${targetDbRole})`,
      dbRole: targetDbRole,
      roleName: roleRes.rows[0].name
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Direct Password Reset for User
router.put('/admin/users/:id/password', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }

  try {
    const userRes = await query('SELECT full_name, email FROM users WHERE id = $1', [targetUserId]);
    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found in Neon.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, targetUserId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'ADMIN_RESET_PASSWORD',
      'USER',
      String(targetUserId),
      `Super Admin reset password for "${userRes.rows[0].full_name}"`,
      req
    );

    res.json({ message: `Password for "${userRes.rows[0].full_name}" has been securely updated.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Delete User with Safeguards
router.delete('/admin/users/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const targetUserId = parseInt(req.params.id, 10);

  // Safeguards
  if (targetUserId === req.user?.id) {
    res.status(400).json({ error: 'You cannot delete your own Super Admin account.' });
    return;
  }

  try {
    const userRes = await query(`
      SELECT u.id, u.full_name, u.email, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [targetUserId]);

    if (userRes.rows.length === 0) {
      res.status(404).json({ error: 'User not found in Neon.' });
      return;
    }

    const targetUser = userRes.rows[0];
    if (targetUser.role_name === 'superadmin') {
      res.status(403).json({ error: 'Cannot delete a Super Admin account. Change their role first.' });
      return;
    }

    // Safely delete user (cascades or sets null per FK definitions)
    await query('DELETE FROM users WHERE id = $1', [targetUserId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'DELETE_USER',
      'USER',
      String(targetUserId),
      `Deleted account of "${targetUser.full_name}" (${targetUser.email})`,
      req
    );

    res.json({ message: `User "${targetUser.full_name}" has been permanently removed.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ADMIN & STAFF MANAGEMENT
// -------------------------------------------------------------

// List All Staff and Admin Accounts
router.get('/admin/staff', requireSuperAdmin, async (_req, res) => {
  try {
    const staffRes = await query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.role as db_role, u.is_active, u.created_at,
             COALESCE(u.permissions, '{}') as permissions,
             r.name as role_name, r.id as role_id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.role = 'admin' OR r.name IN ('admin', 'staff', 'superadmin')
      ORDER BY u.created_at ASC
    `);

    res.json(staffRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create New Staff or Admin Account (Super Admin only)
router.post('/admin/staff', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { fullName, email, phone, password, roleName, permissions } = req.body;

  if (!fullName || (!email && !phone) || !password) {
    res.status(400).json({ error: 'Full name, email or phone, and a secure password are required.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const assignedRole = roleName === 'admin' ? 'admin' : 'staff';
  const assignedPermissions = Array.isArray(permissions) ? permissions : ['manage_products', 'manage_orders', 'view_logs'];

  try {
    // Check duplicates
    if (email) {
      const dupEmail = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
      if (dupEmail.rows.length > 0) {
        res.status(400).json({ error: 'A user with this email address already exists.' });
        return;
      }
    }

    if (phone) {
      const dupPhone = await query('SELECT id FROM users WHERE phone = $1', [phone.trim()]);
      if (dupPhone.rows.length > 0) {
        res.status(400).json({ error: 'A user with this phone number already exists.' });
        return;
      }
    }

    const roleRes = await query('SELECT id FROM roles WHERE name = $1', [assignedRole]);
    const roleId = roleRes.rows[0]?.id || 2;

    const passwordHash = await bcrypt.hash(password, 10);

    const assignedDbRole = assignedRole === 'admin' ? 'admin' : 'user';
    const insertRes = await query(`
      INSERT INTO users (full_name, email, phone, password_hash, role_id, role, permissions, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING id, full_name, email, phone, role, is_active, created_at
    `, [fullName.trim(), email?.trim() || null, phone?.trim() || null, passwordHash, roleId, assignedDbRole, assignedPermissions]);

    const newStaff = insertRes.rows[0];

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'CREATE_STAFF_ACCOUNT',
      'USER',
      String(newStaff.id),
      `Created new ${assignedRole} account "${fullName}" with permissions: [${assignedPermissions.join(', ')}]`,
      req
    );

    res.status(201).json({
      message: `${assignedRole === 'admin' ? 'Administrator' : 'Staff member'} created successfully.`,
      user: {
        ...newStaff,
        role: assignedRole,
        dbRole: assignedDbRole,
        permissions: assignedPermissions
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Staff Member Permissions
router.put('/admin/staff/:id/permissions', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const staffId = parseInt(req.params.id, 10);
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    res.status(400).json({ error: 'Permissions must be provided as an array of strings.' });
    return;
  }

  try {
    await query('UPDATE users SET permissions = $1, updated_at = NOW() WHERE id = $2', [permissions, staffId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_STAFF_PERMISSIONS',
      'USER',
      String(staffId),
      `Updated permissions to: [${permissions.join(', ')}]`,
      req
    );

    res.json({ message: 'Permissions updated successfully in Neon.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SELLER & PRODUCT MANAGEMENT
// -------------------------------------------------------------

// Super Admin: Seller Management
router.get('/admin/sellers', requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const sellersRes = await query(`
      SELECT s.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone, u.is_active as user_active,
             COUNT(p.id) as total_products,
             COALESCE(SUM(p.views_count), 0) as total_product_views
      FROM sellers s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN products p ON s.id = p.seller_id
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
    `);

    res.json(sellersRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Toggle Seller Verification / Status
router.put('/admin/sellers/:id/verify', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const sellerId = parseInt(req.params.id, 10);
  const { isVerified } = req.body;

  try {
    await query('UPDATE sellers SET is_verified = $1, updated_at = NOW() WHERE id = $2', [Boolean(isVerified), sellerId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_SELLER_STATUS',
      'SELLER',
      String(sellerId),
      `Set seller verification status to: ${isVerified}`,
      req
    );

    res.json({ message: `Seller verification updated to ${isVerified}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: View All Products (All statuses, condition, locations)
router.get('/admin/products', requireAdminOrSuperAdmin, async (req, res) => {
  const { search, condition, status, region } = req.query;

  try {
    let sql = `
      SELECT p.*, c.name as category_name, c.name_amharic as category_name_amharic,
             s.store_name, u.full_name as seller_owner,
             (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sellers s ON p.seller_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (search) {
      sql += ` AND (LOWER(p.title) LIKE $${pIdx} OR LOWER(COALESCE(p.title_amharic,'')) LIKE $${pIdx})`;
      params.push(`%${String(search).toLowerCase()}%`);
      pIdx++;
    }

    if (condition && condition !== 'all') {
      sql += ` AND p.condition = $${pIdx++}`;
      params.push(condition);
    }

    if (status && status !== 'all') {
      sql += ` AND p.status = $${pIdx++}`;
      params.push(status);
    }

    if (region && region !== 'all') {
      sql += ` AND p.region = $${pIdx++}`;
      params.push(region);
    }

    sql += ` ORDER BY p.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Update Product Status (Approve / Reject / Suspend)
router.put('/admin/products/:id/status', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const prodId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Invalid product status' });
    return;
  }

  try {
    const prodRes = await query('SELECT title FROM products WHERE id = $1', [prodId]);
    if (prodRes.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    await query('UPDATE products SET status = $1, updated_at = NOW() WHERE id = $2', [status, prodId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_PRODUCT_STATUS',
      'PRODUCT',
      String(prodId),
      `Changed status of "${prodRes.rows[0].title}" to ${status}`,
      req
    );

    res.json({ message: `Product status changed to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Toggle Product Featured Status
router.put('/admin/products/:id/featured', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const prodId = parseInt(req.params.id, 10);
  const { isFeatured } = req.body;

  try {
    await query('UPDATE products SET is_featured = $1, updated_at = NOW() WHERE id = $2', [Boolean(isFeatured), prodId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'TOGGLE_PRODUCT_FEATURED',
      'PRODUCT',
      String(prodId),
      `Set product featured to: ${isFeatured}`,
      req
    );

    res.json({ message: `Product featured status updated to ${isFeatured}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Delete Product Permanently
router.delete('/admin/products/:id', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const prodId = parseInt(req.params.id, 10);

  try {
    const prodRes = await query('SELECT title FROM products WHERE id = $1', [prodId]);
    if (prodRes.rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    await query('DELETE FROM products WHERE id = $1', [prodId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'DELETE_PRODUCT',
      'PRODUCT',
      String(prodId),
      `Permanently removed product "${prodRes.rows[0].title}"`,
      req
    );

    res.json({ message: 'Product deleted permanently from Neon PostgreSQL.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ORDERS, PAYMENT & DELIVERY MANAGEMENT
// -------------------------------------------------------------

// Super Admin: View All Orders
router.get('/admin/orders', requireAdminOrSuperAdmin, async (req, res) => {
  const { status, payment_status, search } = req.query;

  try {
    let sql = `
      SELECT o.*, u.email as buyer_email,
             json_agg(json_build_object(
               'id', oi.id,
               'product_title', oi.product_title,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price,
               'seller_id', oi.seller_id,
               'store_name', s.store_name
             )) as items,
             CASE WHEN pr.id IS NOT NULL THEN json_build_object(
               'id', pr.id,
               'order_id', pr.order_id,
               'customer_id', pr.customer_id,
               'file_reference', pr.file_reference,
               'original_filename', pr.original_filename,
               'mime_type', pr.mime_type,
               'file_size', pr.file_size,
               'verification_status', pr.verification_status,
               'admin_notes', pr.admin_notes,
               'verified_by', pr.verified_by,
               'uploaded_at', pr.uploaded_at,
               'verified_at', pr.verified_at
             ) ELSE NULL END as payment_receipt
      FROM orders o
      LEFT JOIN users u ON o.buyer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN sellers s ON oi.seller_id = s.id
      LEFT JOIN payment_receipts pr ON pr.order_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      sql += ` AND o.status = $${pIdx++}`;
      params.push(status);
    }

    if (payment_status && payment_status !== 'all') {
      sql += ` AND o.payment_status = $${pIdx++}`;
      params.push(payment_status);
    }

    if (search) {
      sql += ` AND (LOWER(o.order_number) LIKE $${pIdx} OR LOWER(o.customer_name) LIKE $${pIdx} OR o.phone LIKE $${pIdx})`;
      params.push(`%${String(search).toLowerCase()}%`);
      pIdx++;
    }

    sql += ` GROUP BY o.id, u.id, pr.id ORDER BY o.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Update Order Status
router.put('/admin/orders/:id/status', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { status } = req.body;

  try {
    await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, orderId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_ORDER_STATUS',
      'ORDER',
      String(orderId),
      `Updated order status to "${status}"`,
      req
    );

    res.json({ message: `Order status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Update Payment Status & Notes
router.put('/admin/orders/:id/payment', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const orderId = parseInt(req.params.id, 10);
  const { paymentStatus, paymentNotes } = req.body;

  if (!paymentStatus) {
    res.status(400).json({ error: 'Payment status is required.' });
    return;
  }

  try {
    await query(`
      UPDATE orders
      SET payment_status = $1, payment_notes = $2, updated_at = NOW()
      WHERE id = $3
    `, [paymentStatus, paymentNotes || null, orderId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_ORDER_PAYMENT',
      'ORDER',
      String(orderId),
      `Updated payment status to ${paymentStatus} (Notes: ${paymentNotes || 'none'})`,
      req
    );

    res.json({ message: `Order payment record updated successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin / Admin: Verify (Approve / Reject) Uploaded Payment Receipt
router.put('/admin/payment-receipts/:id/verify', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const receiptId = parseInt(req.params.id, 10);
  const { verificationStatus, adminNotes } = req.body;

  if (isNaN(receiptId)) {
    res.status(400).json({ error: 'Invalid receipt ID.' });
    return;
  }

  if (!['pending', 'approved', 'rejected'].includes(verificationStatus)) {
    res.status(400).json({ error: 'Verification status must be pending, approved, or rejected.' });
    return;
  }

  try {
    const cleanNotes = typeof adminNotes === 'string' && adminNotes.trim() ? adminNotes.trim() : null;
    const updRes = await query(`
      UPDATE payment_receipts
      SET verification_status = $1,
          admin_notes = $2,
          verified_by = $3,
          verified_at = CASE WHEN $1 = 'pending' THEN NULL ELSE NOW() END,
          updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [verificationStatus, cleanNotes, req.user?.id || null, receiptId]);

    if (updRes.rows.length === 0) {
      res.status(404).json({ error: 'Payment receipt not found.' });
      return;
    }

    const updatedReceipt = updRes.rows[0];
    const nextPaymentStatus = verificationStatus === 'approved' ? 'paid' : 'pending';
    await query(`
      UPDATE orders
      SET payment_status = $1,
          payment_notes = COALESCE($2, payment_notes),
          updated_at = NOW()
      WHERE id = $3
    `, [nextPaymentStatus, cleanNotes, updatedReceipt.order_id]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'VERIFY_PAYMENT_RECEIPT',
      'PAYMENT_RECEIPT',
      String(receiptId),
      `Set payment receipt #${receiptId} (Order #${updatedReceipt.order_id}) to "${verificationStatus}"${cleanNotes ? ` (${cleanNotes})` : ''}`,
      req
    );

    res.json({
      message: verificationStatus === 'approved'
        ? 'Payment receipt approved and order marked as paid.'
        : verificationStatus === 'rejected'
        ? 'Payment receipt rejected.'
        : 'Payment receipt reset to pending verification.',
      receipt: updatedReceipt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REPORTS & MODERATION
// -------------------------------------------------------------

// Submit Report (Public/Authenticated)
router.post('/reports', async (req, res) => {
  const { reporterName, reporterContact, targetType, targetId, reason, description } = req.body;

  if (!targetType || !targetId || !reason) {
    res.status(400).json({ error: 'Target type, target ID, and reason are required.' });
    return;
  }

  try {
    const insertRes = await query(`
      INSERT INTO reports (reporter_name, reporter_contact, target_type, target_id, reason, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [reporterName || 'Anonymous', reporterContact || null, targetType, targetId, reason, description || null]);

    res.status(201).json({ message: 'Report submitted for review. Thank you for helping keep Mela Market safe.', report: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: List All Reports
router.get('/admin/reports', requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const reportsRes = await query(`
      SELECT r.*,
             CASE
               WHEN r.target_type = 'product' THEN (SELECT title FROM products WHERE id = r.target_id)
               WHEN r.target_type = 'seller' THEN (SELECT store_name FROM sellers WHERE id = r.target_id)
               ELSE 'User ID ' || r.target_id
             END as target_title
      FROM reports r
      ORDER BY r.created_at DESC
    `);

    res.json(reportsRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Resolve or Dismiss Report
router.put('/admin/reports/:id/resolve', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const reportId = parseInt(req.params.id, 10);
  const { status, resolutionNotes } = req.body;

  if (!['resolved', 'dismissed', 'pending'].includes(status)) {
    res.status(400).json({ error: 'Status must be resolved, dismissed, or pending.' });
    return;
  }

  try {
    await query(`
      UPDATE reports
      SET status = $1, resolution_notes = $2, resolved_by = $3, updated_at = NOW()
      WHERE id = $4
    `, [status, resolutionNotes || null, req.user?.id || null, reportId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'RESOLVE_REPORT',
      'REPORT',
      String(reportId),
      `Marked report #${reportId} as ${status}`,
      req
    );

    res.json({ message: `Report marked as ${status}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CATEGORIES & SETTINGS
// -------------------------------------------------------------

// Super Admin: Category Management
router.get('/admin/categories', requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const catsRes = await query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.id ASC
    `);
    res.json(catsRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/categories', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { name, nameAmharic, slug, icon, displayOrder } = req.body;

  if (!name || !slug) {
    res.status(400).json({ error: 'Category name and slug are required' });
    return;
  }

  try {
    const insertRes = await query(`
      INSERT INTO categories (name, name_amharic, slug, icon, display_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name.trim(), nameAmharic || null, slug.trim().toLowerCase(), icon || 'Tag', parseInt(displayOrder || 0, 10)]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'CREATE_CATEGORY',
      'CATEGORY',
      String(insertRes.rows[0].id),
      `Created category "${name}"`,
      req
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/categories/:id', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const catId = parseInt(req.params.id, 10);
  const { name, nameAmharic, slug, icon, isActive, displayOrder } = req.body;

  try {
    await query(`
      UPDATE categories
      SET name = COALESCE($1, name),
          name_amharic = COALESCE($2, name_amharic),
          slug = COALESCE($3, slug),
          icon = COALESCE($4, icon),
          is_active = COALESCE($5, is_active),
          display_order = COALESCE($6, display_order)
      WHERE id = $7
    `, [name, nameAmharic, slug, icon, isActive, displayOrder, catId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_CATEGORY',
      'CATEGORY',
      String(catId),
      `Updated category ID: ${catId}`,
      req
    );

    res.json({ message: 'Category updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/categories/:id', requireAdminOrSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const catId = parseInt(req.params.id, 10);

  try {
    // Safely reassign existing products to uncategorized / null before deleting
    await query('UPDATE products SET category_id = NULL WHERE category_id = $1', [catId]);
    await query('DELETE FROM categories WHERE id = $1', [catId]);

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'DELETE_CATEGORY',
      'CATEGORY',
      String(catId),
      `Safely removed category ID: ${catId} and detached existing products`,
      req
    );

    res.json({ message: 'Category deleted safely. Existing products detached.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Marketplace Settings
router.get('/admin/settings', requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const setRes = await query(`SELECT key, value, description FROM marketplace_settings WHERE key NOT LIKE 'admin_setup_%'`);
    const settingsMap: Record<string, string> = {};
    setRes.rows.forEach(r => { settingsMap[r.key] = r.value; });
    res.json(settingsMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/settings', requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const settings = req.body;

  try {
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('admin_setup_')) continue;
      await query(`
        INSERT INTO marketplace_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, String(value)]);
    }

    await logAdminActivity(
      req.user?.id,
      req.user?.fullName,
      'UPDATE_MARKETPLACE_SETTINGS',
      'SETTINGS',
      'ALL',
      'Updated marketplace settings and announcements',
      req
    );

    res.json({ message: 'Settings saved in Neon PostgreSQL' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Super Admin: Activity Audit Logs
router.get('/admin/logs', requireAdminOrSuperAdmin, async (_req, res) => {
  try {
    const logsRes = await query(`
      SELECT * FROM admin_activity_logs ORDER BY created_at DESC LIMIT 100
    `);
    res.json(logsRes.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
