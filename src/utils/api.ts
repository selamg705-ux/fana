/**
 * Safe API client for Mela Market frontend.
 * Guarantees that responses are NEVER parsed with res.json() blindly,
 * preventing 'Unexpected token T, The page cannot be found...' errors.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
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

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    let parsedJson: any = null;
    if (
      contentType.includes('application/json') ||
      rawText.trim().startsWith('{') ||
      rawText.trim().startsWith('[')
    ) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        parsedJson = null;
      }
    }

    if (res.ok) {
      return {
        ok: true,
        status: res.status,
        data: parsedJson !== null ? parsedJson : (rawText as any)
      };
    }

    // Response is NOT ok (4xx, 5xx, or gateway HTML error)
    let errorMessage = '';
    if (parsedJson && (parsedJson.error || parsedJson.message)) {
      errorMessage = parsedJson.error || parsedJson.message;
    } else if (rawText && !rawText.includes('<!DOCTYPE') && !rawText.includes('<html') && rawText.length < 200) {
      errorMessage = rawText;
    } else if (res.status === 404) {
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
