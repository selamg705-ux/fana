/**
 * Secure cryptographic password hashing utilities using Web Crypto API.
 * Uses PBKDF2 with SHA-256 and 100,000 iterations for secure password storage.
 * Prevents hardcoding passwords in plain text.
 */

// Default admin setup authorization key for initializing the first admin account
export const DEFAULT_ADMIN_SETUP_KEY = 'MELA-ADMIN-SETUP-2026';

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(length = 16): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Securely hashes a password using PBKDF2 with SHA-256 and salt.
 */
export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || generateSalt(16);
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = encoder.encode(salt);

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedKey));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash, salt };
}

/**
 * Verifies a password against a stored PBKDF2 hash and salt.
 */
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, salt);
    return hash === storedHash;
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}
