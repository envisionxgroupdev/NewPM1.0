/**
 * Helper utility to handle YouTube video ID parsing and trailer lookup.
 */

/**
 * Extracts an 11-character YouTube video ID from a URL, embed link, or raw string.
 * Returns null if invalid or empty.
 */
export function extractYouTubeId(input?: string | null): string | null {
  if (!input) return null;
  const str = input.trim();
  if (!str) return null;

  // Standard YouTube URL regex matching (watch?v=, embed/, youtu.be/, etc.)
  const youtubeRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
  const match = str.match(youtubeRegex);
  if (match && match[1]) {
    return match[1];
  }

  // Direct 11-character YouTube video ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // Fallback regex to capture any 11-char pattern in messy input
  const fallbackMatch = str.match(/([a-zA-Z0-9_-]{11})/);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1];
  }

  return null;
}

/**
 * Fetches a valid YouTube trailer ID from the backend server for a movie.
 */
export async function fetchTrailerFromBackend(movie: {
  tmdbId?: string;
  title: string;
  type?: string;
  year?: number;
}): Promise<string | null> {
  try {
    const params = new URLSearchParams();
    if (movie.tmdbId) params.append("tmdbId", movie.tmdbId);
    if (movie.title) params.append("title", movie.title);
    if (movie.type) params.append("type", movie.type);
    if (movie.year) params.append("year", String(movie.year));

    const response = await fetch(`/api/tmdb/trailer?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.success && data.trailerVideoId) {
      return extractYouTubeId(data.trailerVideoId);
    }
    return null;
  } catch (err) {
    console.warn("Erro ao buscar trailer do servidor:", err);
    return null;
  }
}
