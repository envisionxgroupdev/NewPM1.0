import { Movie } from "../types";

/**
 * Ordena a lista de filmes/séries/animes em ordem decrescente pelo ano de lançamento
 * (do mais novo para o mais antigo, ex: 2026 -> 2025 -> 2024...).
 * Em caso de empate no ano, desempata por destaque (featured), data de cadastro no catálogo e nota (rating).
 */
export function sortMoviesByYearDesc(list: Movie[]): Movie[] {
  if (!Array.isArray(list)) return [];

  return [...list].sort((a, b) => {
    const yearA = Number(a.year || 0);
    const yearB = Number(b.year || 0);
    if (yearB !== yearA) {
      return yearB - yearA; // Anos mais recentes primeiro (ex: 2026 -> 2025 -> 2024...)
    }

    // Em caso de empate no ano, títulos em destaque (featured) vêm primeiro
    const featA = a.featured ? 1 : 0;
    const featB = b.featured ? 1 : 0;
    if (featB !== featA) {
      return featB - featA;
    }

    // Em seguida, desempata pela data de cadastro no sistema (mais recente primeiro)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (!isNaN(timeB) && !isNaN(timeA) && timeB !== timeA) {
      return timeB - timeA;
    }

    // Por fim, desempata pela nota (rating)
    return (b.rating || 0) - (a.rating || 0);
  });
}
