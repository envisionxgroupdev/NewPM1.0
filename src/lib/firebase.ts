import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDocFromServer,
  onSnapshot,
  setDoc,
  deleteDoc,
  Unsubscribe,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { Movie } from "../types";
import { sortMoviesByYearDesc } from "../utils/sortMovies";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with databaseId specified in firebase-applet-config.json
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
}

// Test connection to Firestore on boot safely without throwing
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("[Firebase] Teste de conexão Firestore com o servidor efetuado com sucesso.");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("[Firebase] O cliente Firestore está offline. Verifique a configuração no firebase-applet-config.json.");
    } else {
      console.warn("[Firebase] Aviso na verificação de conexão Firestore:", error);
    }
    return false;
  }
}

// Execute non-blocking connection test
testFirestoreConnection().catch((e) => console.warn("[Firebase] Test connection exception:", e));

// Helper to convert Firestore timestamp or value to ISO date string safely
function safeIsoDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (typeof val === "number") {
    try {
      return new Date(val).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (typeof val === "object") {
    if (typeof val.toDate === "function") {
      try {
        return val.toDate().toISOString();
      } catch {}
    }
    if (typeof val.seconds === "number") {
      try {
        return new Date(val.seconds * 1000).toISOString();
      } catch {}
    }
    if (typeof val._seconds === "number") {
      try {
        return new Date(val._seconds * 1000).toISOString();
      } catch {}
    }
  }
  return new Date().toISOString();
}

// Format Firestore document data to Movie type
export function formatMovieDoc(id: string, data: any): Movie {
  return {
    id,
    title: data.title || "",
    originalTitle: data.originalTitle || data.title || "",
    year: Number(data.year || 2026),
    duration: data.duration || "120 min",
    rating: Number(data.rating || 8.0),
    genres: Array.isArray(data.genres) ? data.genres : [],
    synopsis: data.synopsis || "",
    backdropUrl: data.backdropUrl || "",
    posterUrl: data.posterUrl || "",
    trailerVideoId: data.trailerVideoId || "dQw4w9WgXcQ",
    cast: Array.isArray(data.cast) ? data.cast : [],
    director: data.director || "",
    featured: Boolean(data.featured),
    type: data.type || "filme",
    imdbId: data.imdbId || "",
    tmdbId: data.tmdbId ? String(data.tmdbId) : undefined,
    createdAt: safeIsoDate(data.createdAt),
  };
}

/**
 * Inscreve um listener em tempo real no Firestore na coleção 'movies'.
 * Sempre que houver inclusão, alteração ou exclusão de um filme no banco de dados,
 * o callback é acionado imediatamente atualizando o catálogo em tempo real.
 */
export function subscribeToMovies(
  onUpdate: (movies: Movie[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const moviesCollectionPath = "movies";
  const colRef = collection(db, moviesCollectionPath);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const docsList: Movie[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id === "catalog" || docSnap.id === "sitemap" || docSnap.id === "config") return;
        const data = docSnap.data();
        if (data && data.title) {
          docsList.push(formatMovieDoc(docSnap.id, data));
        }
      });

      // Retorna estritamente os títulos salvos na base do Firestore
      onUpdate(sortMoviesByYearDesc(docsList));
    },
    (error) => {
      console.warn("[Firebase] Erro no listener em tempo real de filmes:", error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, moviesCollectionPath);
    }
  );
}

/**
 * Busca a lista completa de filmes diretamente do Firestore (One-shot fetch)
 */
export async function fetchMoviesFromFirestore(): Promise<Movie[]> {
  const path = "movies";
  try {
    const snap = await getDocs(collection(db, path));
    const list: Movie[] = [];
    snap.forEach((docSnap) => {
      if (docSnap.id === "catalog" || docSnap.id === "sitemap" || docSnap.id === "config") return;
      const data = docSnap.data();
      if (data && data.title) {
        list.push(formatMovieDoc(docSnap.id, data));
      }
    });

    return sortMoviesByYearDesc(list);
  } catch (error) {
    console.warn("[Firebase] Falha ao buscar filmes do Firestore via SDK:", error);
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Salva ou atualiza um filme diretamente no Firestore
 */
export async function saveMovieToFirestore(movie: Movie): Promise<void> {
  const path = `movies/${movie.id}`;
  try {
    const movieRef = doc(db, "movies", movie.id);
    await setDoc(movieRef, {
      title: movie.title,
      originalTitle: movie.originalTitle || movie.title,
      year: Number(movie.year),
      duration: movie.duration,
      rating: Number(movie.rating),
      genres: movie.genres,
      synopsis: movie.synopsis,
      backdropUrl: movie.backdropUrl,
      posterUrl: movie.posterUrl,
      trailerVideoId: movie.trailerVideoId,
      cast: movie.cast,
      director: movie.director,
      featured: Boolean(movie.featured),
      type: movie.type,
      imdbId: movie.imdbId || "",
      tmdbId: movie.tmdbId ? String(movie.tmdbId) : "",
      createdAt: movie.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Exclui um filme do Firestore
 */
export async function deleteMovieFromFirestore(movieId: string): Promise<void> {
  const path = `movies/${movieId}`;
  try {
    await deleteDoc(doc(db, "movies", movieId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
