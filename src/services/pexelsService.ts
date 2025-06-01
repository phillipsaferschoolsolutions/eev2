
// src/services/pexelsService.ts
'use client';

const PEXELS_API_KEY = 'fJc3QeugalYSw2tVEAPoLIZnpDLXCBIUxxHLPN5lDgpxxQYCdf2bW7va';
const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  photographer: string;
  photographer_url: string;
}

interface PexelsResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
  next_page?: string;
}

/**
 * Fetches a random high-quality image URL from Pexels based on a query.
 * IMPORTANT: Using an API key directly on the client-side is insecure for production.
 * This should be proxied through a backend in a real application.
 * @param query Search query for the image (e.g., "nature", "technology")
 * @param orientation "landscape" | "portrait" | "square"
 * @returns URL of the image or null if an error occurs.
 */
export async function fetchPexelsImageURL(
  query: string,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape'
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.error("Pexels API key is missing.");
    return null;
  }

  // Fetch a small number of results to pick one randomly, to vary image on refresh/theme change
  const perPage = 5;
  const randomPage = Math.floor(Math.random() * 20) + 1; // Fetch from first 20 pages

  const url = `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${perPage}&page=${randomPage}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Pexels API error: ${response.status}`, errorData);
      return null;
    }

    const data: PexelsResponse = await response.json();
    if (data.photos && data.photos.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.photos.length);
      // Use 'large2x' for high quality, fallback to 'large' or 'original'
      return data.photos[randomIndex].src.large2x || data.photos[randomIndex].src.large || data.photos[randomIndex].src.original;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Pexels image:", error);
    return null;
  }
}
