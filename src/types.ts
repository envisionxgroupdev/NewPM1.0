export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  duration: string;
  rating: number; // e.g. 8.7
  genres: string[];
  synopsis: string;
  backdropUrl: string;
  posterUrl: string;
  trailerVideoId: string; // YouTube video ID
  cast: string[];
  director: string;
  featured?: boolean;
  type: "filme" | "serie" | "anime";
  imdbId?: string;
  tmdbId?: string;
  createdAt?: string;
}

export interface Review {
  id: string;
  movieId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  status?: "active" | "banned";
  createdAt?: string;
}

export interface ContinueWatchingItem {
  movieId: string;
  movie: Movie;
  updatedAt: number;
  playerType: "superflix" | "warez" | "trailer";
  season?: number;
  episode?: number;
  progressPercent: number;
}

export interface AdSlotConfig {
  enabled: boolean;
  type: "code" | "banner";
  code: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

export interface SiteAdsConfig {
  headerAd: AdSlotConfig;
  homeBetweenRowsAd: AdSlotConfig;
  playerAd: AdSlotConfig;
  footerAd: AdSlotConfig;
  sidebarAd: AdSlotConfig;
  popunderAd: {
    enabled: boolean;
    code: string;
  };
}

export interface CustomCodesConfig {
  headerCode: string;
  footerCode: string;
}
