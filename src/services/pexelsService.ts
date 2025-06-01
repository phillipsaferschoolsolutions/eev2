
// src/services/pexelsService.ts
'use client';

// Use the API key from the environment variable
const PEXELS_API_KEY = process.env.NEXT_PUBLIC_PEXEL_API_KEY;
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
 * IMPORTANT: Using an API key directly on the client-side is insecure for production if not handled carefully.
 * Ensure NEXT_PUBLIC_PEXEL_API_KEY is set in your environment.
 * @param query Search query for the image (e.g., "nature", "technology")
 * @param orientation "landscape" | "portrait" | "square"
 * @returns URL of the image or null if an error occurs or API key is missing.
 */
export async function fetchPexelsImageURL(
  query: string,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape'
): Promise<string | null> {
  if (!PEXELS_API_KEY) {
    console.error("Pexels API key (NEXT_PUBLIC_PEXEL_API_KEY) is missing from environment variables.");
    return null;
  }

  const perPage = 10; // Fetch a few more to increase variety
  const randomPage = Math.floor(Math.random() * 10) + 1; // Fetch from first 10 pages

  const url = `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=${perPage}&page=${randomPage}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to parse Pexels error response" }));
      console.error(`Pexels API error: ${response.status}`, errorData);
      return null;
    }

    const data: PexelsResponse = await response.json();
    if (data.photos && data.photos.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.photos.length);
      return data.photos[randomIndex].src.large2x || data.photos[randomIndex].src.large || data.photos[randomIndex].src.original;
    }
    console.warn(`No photos found from Pexels for query: "${query}"`);
    return null;
  } catch (error) {
    console.error("Error fetching Pexels image:", error);
    return null;
  }
}

