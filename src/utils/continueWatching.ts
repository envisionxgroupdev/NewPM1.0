import { Movie, ContinueWatchingItem } from "../types";

const STORAGE_KEY = "pipocamax_continue_watching";
export const CONTINUE_WATCHING_EVENT = "pipocamax_continue_watching_updated";

export function getContinueWatchingList(): ContinueWatchingItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: ContinueWatchingItem[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }
    return [];
  } catch (err) {
    console.warn("Erro ao carregar histórico de 'Continuar Assistindo':", err);
    return [];
  }
}

export function saveContinueWatching(
  movie: Movie,
  playerType: "superflix" | "warez" | "trailer",
  season?: number,
  episode?: number,
  progressPercent?: number
) {
  try {
    const list = getContinueWatchingList();
    const existing = list.find((item) => item.movieId === movie.id);

    let calculatedProgress = progressPercent;
    if (!calculatedProgress) {
      if (movie.type === "filme") {
        calculatedProgress = existing?.progressPercent
          ? Math.min(existing.progressPercent + 20, 85)
          : 40;
      } else {
        const ep = episode || 1;
        calculatedProgress = Math.min(25 + ep * 10, 90);
      }
    }

    const newItem: ContinueWatchingItem = {
      movieId: movie.id,
      movie,
      updatedAt: Date.now(),
      playerType,
      season: movie.type !== "filme" ? season || 1 : 1,
      episode: movie.type !== "filme" ? episode || 1 : 1,
      progressPercent: Math.min(Math.max(calculatedProgress, 10), 95),
    };

    const filtered = list.filter((item) => item.movieId !== movie.id);
    const updated = [newItem, ...filtered].slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(CONTINUE_WATCHING_EVENT));
  } catch (err) {
    console.warn("Erro ao salvar progresso em 'Continuar Assistindo':", err);
  }
}

export function removeContinueWatching(movieId: string) {
  try {
    const list = getContinueWatchingList();
    const updated = list.filter((item) => item.movieId !== movieId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(CONTINUE_WATCHING_EVENT));
  } catch (err) {
    console.warn("Erro ao remover item do 'Continuar Assistindo':", err);
  }
}

export function clearContinueWatching() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CONTINUE_WATCHING_EVENT));
  } catch (err) {
    console.warn("Erro ao limpar 'Continuar Assistindo':", err);
  }
}
