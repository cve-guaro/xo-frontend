// lib/googleFonts.ts — Google Fonts API Integration
// Uses Google Web Fonts Developer API with provided API key.

export const GOOGLE_FONTS_API_KEY = "AIzaSyDP5AhNDrgbQpu1kNFLu45-JrNeEbPyaZI";

export interface WebFontItem {
  family: string;
  variants: string[];
  subsets: string[];
  version: string;
  category: string;
  files: Record<string, string>;
}

/**
 * Fetch font metadata list from Google Fonts Developer API
 */
export async function fetchGoogleFontsList(sort: 'popularity' | 'trending' | 'alpha' = 'popularity'): Promise<WebFontItem[]> {
  try {
    const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=${sort}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('[GoogleFonts] API request returned status:', res.status);
      return [];
    }
    const data = await res.json();
    return data.items || [];
  } catch (err: any) {
    console.error('[GoogleFonts] Failed to fetch fonts list:', err?.message || err);
    return [];
  }
}

/**
 * Generate Google Fonts CSS stylesheet link for given font families
 */
export function getGoogleFontsStylesheetUrl(families: { name: string; weights?: number[] }[]): string {
  const query = families
    .map(f => {
      const familyName = f.name.replace(/ /g, '+');
      if (f.weights && f.weights.length > 0) {
        return `family=${familyName}:wght@${f.weights.join(';')}`;
      }
      return `family=${familyName}`;
    })
    .join('&');

  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
