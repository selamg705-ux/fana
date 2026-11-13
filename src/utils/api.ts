/**
 * Safe API client for Mela Market frontend.
 * Guarantees that responses are NEVER parsed with res.json() blindly,
 * preventing 'Unexpected token T, The page cannot be found...' errors
 * and ensuring error objects like { code, message } are always converted to strings.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export function extractErrorMessage(input: unknown, fallback = ''): string {
  if (input === null || input === undefined) return fallback;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || trimmed === '[object Object]') return fallback;
    return trimmed;
  }
  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }
  if (input instanceof Error) {
    return extractErrorMessage(input.message, fallback);
  }
  if (Array.isArray(input)) {
    const parts = input.map((item) => extractErrorMessage(item, '')).filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  }
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const nestedError = extractErrorMessage(obj.error, '');
    if (nestedError) return nestedError;

    const msg = extractErrorMessage(obj.message, '');
    const code = typeof obj.code === 'string' || typeof obj.code === 'number' ? String(obj.code).trim() : '';
    if (msg) {
      return code ? `${msg} (${code})` : msg;
    }

    const detail = extractErrorMessage(obj.detail || obj.details || obj.reason || obj.statusText, '');
    if (detail) {
      return code ? `${detail} (${code})` : detail;
    }

    if (code) {
      return `Error (${code})`;
    }

    try {
      const json = JSON.stringify(obj);
      if (json && json !== '{}') return json;
    } catch {}
  }
  return fallback;
}

export function safeText(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return extractErrorMessage(value, fallback);
}

export async function safeApiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options?.headers || {})
      }
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const rawText = await res.text();
    const trimmed = rawText.trim();

    const looksLikeHtml =
      contentType.includes('text/html') ||
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html');

    let parsedJson: any = null;
    if (
      !looksLikeHtml &&
      (contentType.includes('application/json') ||
        trimmed.startsWith('{') ||
        trimmed.startsWith('['))
    ) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        parsedJson = null;
      }
    }

    if (res.ok && !looksLikeHtml) {
      if (parsedJson !== null) {
        return {
          ok: true,
          status: res.status,
          data: parsedJson as T
        };
      }
      if (!trimmed) {
        return {
          ok: true,
          status: res.status,
          data: undefined
        };
      }
    }

    // Response is NOT ok (4xx, 5xx, gateway HTML error, or invalid non-JSON response)
    let errorMessage = '';
    if (parsedJson) {
      errorMessage = extractErrorMessage(
        parsedJson.error ?? parsedJson.message ?? parsedJson,
        ''
      );
    }

    if (!errorMessage && rawText && !looksLikeHtml && rawText.length < 300) {
      errorMessage = trimmed;
    }

    if (!errorMessage) {
      if (res.status === 404 || looksLikeHtml) {
        errorMessage = 'የተጠየቀው የሰርቨር አገልግሎት አልተገኘም (404: Endpoint not found).';
      } else if (res.status === 401) {
        errorMessage = 'ያስገቡት የይለፍ ቃል ወይም ስልክ/ኢሜይል ትክክል አይደለም (Invalid credentials).';
      } else if (res.status === 403) {
        errorMessage = 'ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም (Access forbidden).';
      } else if (res.status === 409) {
        errorMessage = 'በዚህ ኢሜይል ወይም ስልክ ቁጥር አስቀድሞ የተመዘገበ መለያ አለ (Account already exists).';
      } else if (res.status >= 500) {
        errorMessage = 'የሰርቨር ችግር አጋጥሟል፤ እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ (Server error).';
      } else {
        errorMessage = `ጥያቄውን ማስተናገድ አልተቻለም (${res.status}: ${res.statusText || 'Request failed'}).`;
      }
    }

    return {
      ok: false,
      status: res.status,
      data: parsedJson,
      error: errorMessage
    };
  } catch (networkErr: any) {
    console.error('Network request error:', networkErr);
    return {
      ok: false,
      status: 0,
      error: 'ከሰርቨሩ ጋር መገናኘት አልተቻለም፤ እባክዎ የኢንተርኔት ግንኙነትዎን ያረጋግጡ (Connection failed).'
    };
  }
}
