import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  CalendarDays,
  Flame,
  ChevronRight,
  ChevronDown,
  Plus,
  ShieldCheck,
  Check,
  Sparkles,
} from "lucide-react";
import LazyImage from "./LazyImage";
import { Movie } from "../types";

export interface CalendarItem {
  title: string;
  episode?: string;
  season?: number;
  number?: number;
  air_date: string;
  type?: number; // 2: Serie, 3: Anime/Dorama, 5: Outros
  tmdb_id?: string;
  imdb_id?: string;
  poster?: string;
  backdrop?: string;
  status: "Futuro" | "Atualizado" | "Atrasado" | string;
}

interface ReleaseCalendarProps {
  onSelectMovie?: (movie: Partial<Movie>) => void;
  movies?: Movie[];
  currentUser?: any;
  onMoviesUpdated?: () => void;
}

const INITIAL_BATCH_SIZE = 24;
const BATCH_INCREMENT = 24;

// Memoized Card Component for fast rendering on mobile devices
const CalendarCard = memo(
  ({
    item,
    catalogMovie,
    isAdmin,
    isImporting,
    onCardClick,
    onAddToSite,
    formatDateBR,
  }: {
    item: CalendarItem;
    catalogMovie?: Movie;
    isAdmin: boolean;
    isImporting: boolean;
    onCardClick: (item: CalendarItem) => void;
    onAddToSite: (item: CalendarItem, e: React.MouseEvent) => void;
    formatDateBR: (dateStr: string) => string;
  }) => {
    const getPosterUrl = (posterPath?: string) => {
      if (!posterPath) return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500";
      if (posterPath.startsWith("http")) return posterPath;
      return `https://image.tmdb.org/t/p/w500${posterPath}`;
    };

    const getStatusBadge = (status: string) => {
      switch (status) {
        case "Atualizado":
          return (
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Disponível</span>
            </span>
          );
        case "Futuro":
          return (
            <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>Em Breve</span>
            </span>
          );
        case "Atrasado":
          return (
            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm backdrop-blur-md">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>Pendente</span>
            </span>
          );
        default:
          return (
            <span className="inline-flex items-center gap-1 bg-gray-800 text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <span>{status}</span>
            </span>
          );
      }
    };

    const itemKey = item.tmdb_id || item.title;

    return (
      <div
        onClick={() => onCardClick(item)}
        className="group relative bg-[#0a0a0a] rounded-2xl overflow-hidden border border-gray-800/70 hover:border-red-600/60 shadow-xl cursor-pointer flex flex-col transform hover:-translate-y-1 hover:scale-[1.01] transition-all duration-200 active:scale-95 touch-manipulation"
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] bg-gray-900 overflow-hidden">
          <LazyImage
            src={getPosterUrl(item.poster)}
            alt={item.title}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Status Badge top right */}
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
            {getStatusBadge(item.status)}
            {catalogMovie && (
              <span className="inline-flex items-center gap-1 bg-emerald-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg backdrop-blur-md">
                <Check className="w-2.5 h-2.5" /> No Site
              </span>
            )}
          </div>

          {/* Hover Overlay Play button */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <div className="w-11 h-11 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/40 transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-4 h-4 fill-white pl-0.5" />
            </div>
          </div>

          {/* Episode Info Banner bottom */}
          {(item.season !== undefined || item.number !== undefined) && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 pt-5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                {item.season ? `T${item.season}` : ""} {item.number ? `• EP ${item.number}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-xs text-white group-hover:text-red-400 transition-colors line-clamp-1">
              {item.title}
            </h4>
            {item.episode && (
              <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 leading-snug">
                {item.episode}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between pt-1 border-t border-gray-900 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-600 shrink-0" />
                {formatDateBR(item.air_date)}
              </span>
              <span className="text-red-500 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Ver <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            {/* Admin "Adicionar ao Site" Button */}
            {isAdmin && (
              <div className="pt-1">
                {catalogMovie ? (
                  <div className="w-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold py-2 px-2 rounded-xl flex items-center justify-center gap-1 min-h-[36px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Cadastrado</span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => onAddToSite(item, e)}
                    disabled={isImporting}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-[11px] py-2 px-2 rounded-xl border border-red-500/40 shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60 min-h-[36px]"
                    id={`add-to-site-btn-${itemKey}`}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-white shrink-0" />
                        <span>Adicionando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-white shrink-0" />
                        <span>Adicionar ao Site</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

CalendarCard.displayName = "CalendarCard";

export default function ReleaseCalendar({
  onSelectMovie,
  movies = [],
  currentUser,
  onMoviesUpdated,
}: ReleaseCalendarProps) {
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDayFilter, setSelectedDayFilter] = useState<"all" | "today" | "tomorrow" | "week" | "upcoming">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Futuro" | "Atualizado" | "Atrasado">("all");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);

  // States for Admin direct import
  const [importingIds, setImportingIds] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchCalendar = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calendar");
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        setCalendarItems(json.data);
      } else {
        throw new Error(json.error || "Formato de dados inválido.");
      }
    } catch (err: any) {
      console.error("Erro ao carregar calendário:", err);
      setError("Não foi possível carregar o calendário de lançamentos. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [searchQuery, selectedDayFilter, statusFilter]);

  // Format date helper (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDateBR = useCallback((dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }, []);

  // Pre-build O(1) Lookup Maps for movies to avoid expensive nested loops
  const movieCatalogMap = useMemo(() => {
    const tmdbMap = new Map<string, Movie>();
    const imdbMap = new Map<string, Movie>();
    const titleMap = new Map<string, Movie>();

    if (movies && movies.length > 0) {
      for (let i = 0; i < movies.length; i++) {
        const m = movies[i];
        if (m.tmdbId) {
          tmdbMap.set(String(m.tmdbId), m);
        }
        if (m.id && m.id.startsWith("tmdb-")) {
          const idNum = m.id.replace("tmdb-", "");
          tmdbMap.set(idNum, m);
        }
        if (m.imdbId) {
          imdbMap.set(m.imdbId, m);
        }
        if (m.title) {
          const norm = m.title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
          if (norm) {
            titleMap.set(norm, m);
          }
        }
      }
    }

    return { tmdbMap, imdbMap, titleMap };
  }, [movies]);

  // Check if calendar item is already present in catalog
  const getCatalogMovie = useCallback(
    (item: CalendarItem): Movie | undefined => {
      if (item.tmdb_id && movieCatalogMap.tmdbMap.has(String(item.tmdb_id))) {
        return movieCatalogMap.tmdbMap.get(String(item.tmdb_id));
      }
      if (item.imdb_id && movieCatalogMap.imdbMap.has(item.imdb_id)) {
        return movieCatalogMap.imdbMap.get(item.imdb_id);
      }
      if (item.title) {
        const normTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
        if (normTitle && movieCatalogMap.titleMap.has(normTitle)) {
          return movieCatalogMap.titleMap.get(normTitle);
        }
      }
      return undefined;
    },
    [movieCatalogMap]
  );

  // Admin 1-click import handler
  const handleAddToSite = useCallback(
    async (item: CalendarItem, e: React.MouseEvent) => {
      e.stopPropagation();
      const itemKey = item.tmdb_id || item.title;
      if (importingIds[itemKey]) return;

      setImportingIds((prev) => ({ ...prev, [itemKey]: true }));
      try {
        const res = await fetch("/api/tmdb/import-direct", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": currentUser?.email || "admin@pipocamax.com",
          },
          body: JSON.stringify({
            tmdbId: item.tmdb_id,
            title: item.title,
            type: item.type === 3 ? "anime" : item.type === 2 ? "serie" : "filme",
            poster: item.poster,
            backdrop: item.backdrop,
            air_date: item.air_date,
            episode: item.episode,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setToastMessage({
            text: data.alreadyExisted
              ? `"${data.movie?.title || item.title}" já está cadastrado no catálogo!`
              : `🎉 "${data.movie?.title || item.title}" foi adicionado ao site e ao painel admin com sucesso!`,
            type: "success",
          });

          if (onMoviesUpdated) {
            onMoviesUpdated();
          }
        } else {
          throw new Error(data.error || "Erro ao adicionar título ao catálogo.");
        }
      } catch (err: any) {
        console.error("Erro ao adicionar ao site:", err);
        setToastMessage({
          text: err?.message || "Erro ao adicionar título ao site.",
          type: "error",
        });
      } finally {
        setImportingIds((prev) => ({ ...prev, [itemKey]: false }));
        setTimeout(() => setToastMessage(null), 5000);
      }
    },
    [importingIds, currentUser, onMoviesUpdated]
  );

  // Determine today/tomorrow strings
  const { todayStr, tomorrowStr } = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const today = `${year}-${month}-${day}`;

    const d2 = new Date();
    d2.setDate(d2.getDate() + 1);
    const y2 = d2.getFullYear();
    const m2 = String(d2.getMonth() + 1).padStart(2, "0");
    const day2 = String(d2.getDate()).padStart(2, "0");
    const tomorrow = `${y2}-${m2}-${day2}`;

    return { todayStr: today, tomorrowStr: tomorrow };
  }, []);

  // Filter items based on user inputs
  const filteredItems = useMemo(() => {
    if (!calendarItems || calendarItems.length === 0) return [];

    const query = searchQuery.trim().toLowerCase();
    const hasQuery = query.length > 0;

    return calendarItems.filter((item) => {
      // Search text
      if (hasQuery) {
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchEp = item.episode?.toLowerCase().includes(query);
        if (!matchTitle && !matchEp) return false;
      }

      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Day filter
      if (selectedDayFilter === "today" && item.air_date !== todayStr) {
        return false;
      }
      if (selectedDayFilter === "tomorrow" && item.air_date !== tomorrowStr) {
        return false;
      }
      if (selectedDayFilter === "upcoming" && item.air_date < todayStr) {
        return false;
      }
      if (selectedDayFilter === "week") {
        if (!item.air_date) return false;
        const d = item.air_date;
        const nowStr = todayStr;
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const y = nextWeek.getFullYear();
        const m = String(nextWeek.getMonth() + 1).padStart(2, "0");
        const day = String(nextWeek.getDate()).padStart(2, "0");
        const nextWeekStr = `${y}-${m}-${day}`;
        if (d < nowStr || d > nextWeekStr) return false;
      }

      return true;
    });
  }, [calendarItems, searchQuery, statusFilter, selectedDayFilter, todayStr, tomorrowStr]);

  // Paginated items to render
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(0, visibleCount);
  }, [filteredItems, visibleCount]);

  // Group paginated items by air_date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, CalendarItem[]> = {};
    paginatedItems.forEach((item) => {
      const dateKey = item.air_date || "Outras Datas";
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return sortedDates.map((dateKey) => ({
      date: dateKey,
      items: groups[dateKey],
    }));
  }, [paginatedItems]);

  // Infinite Scroll IntersectionObserver trigger for smooth lazy loading
  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredItems.length) {
          setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredItems.length));
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(currentSentinel);
    return () => {
      if (currentSentinel) observer.unobserve(currentSentinel);
    };
  }, [visibleCount, filteredItems.length]);

  // Quick stats
  const stats = useMemo(() => {
    const total = calendarItems.length;
    let todayCount = 0;
    let updatedCount = 0;
    let futureCount = 0;

    for (let i = 0; i < calendarItems.length; i++) {
      const item = calendarItems[i];
      if (item.air_date === todayStr) todayCount++;
      if (item.status === "Atualizado") updatedCount++;
      if (item.status === "Futuro") futureCount++;
    }

    return { total, todayCount, updatedCount, futureCount };
  }, [calendarItems, todayStr]);

  const handleCardClick = useCallback(
    (item: CalendarItem) => {
      const catalogMatch = getCatalogMovie(item);

      const getPosterUrl = (posterPath?: string) => {
        if (!posterPath) return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500";
        if (posterPath.startsWith("http")) return posterPath;
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
      };

      if (catalogMatch && onSelectMovie) {
        onSelectMovie(catalogMatch);
      } else if (onSelectMovie) {
        onSelectMovie({
          id: item.tmdb_id ? `tmdb-${item.tmdb_id}` : `cal_${Date.now()}`,
          title: item.title,
          posterUrl: getPosterUrl(item.poster),
          backdropUrl: item.backdrop ? `https://image.tmdb.org/t/p/original${item.backdrop}` : getPosterUrl(item.poster),
          synopsis: item.episode ? `Episódio: ${item.episode}` : "Lançamento em breve no PipocaMax.",
          type: item.type === 3 ? "anime" : item.type === 2 ? "serie" : "filme",
          year: item.air_date ? parseInt(item.air_date.split("-")[0], 10) : 2026,
          rating: 8.5,
          genres: ["Lançamento", item.type === 3 ? "Anime" : "Série"],
        });
      }
    },
    [getCatalogMovie, onSelectMovie]
  );

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="min-h-screen bg-[#060606] text-white py-6 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="release-calendar-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-4 sm:right-6 z-50 p-4 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-sm sm:max-w-md text-xs font-bold ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-emerald-900/40"
              : "bg-red-950/90 border-red-500 text-red-200 shadow-red-900/40"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Mode Banner */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-red-950 via-gray-900 to-black border border-red-800/80 rounded-2xl p-3.5 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span>Modo de Administração do Calendário</span>
                <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Ativo</span>
              </h4>
              <p className="text-[11px] text-gray-400">
                Você pode adicionar qualquer filme, série ou anime do calendário diretamente para o catálogo do site com 1 clique!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-red-950/40 via-gray-900 to-black border border-gray-800 p-5 sm:p-8 md:p-10 mb-6 sm:mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-red-600/15 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-600/10">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span>Programação de Lançamentos</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight font-display">
              Calendário de <span className="bg-gradient-to-r from-red-500 via-amber-400 to-red-400 bg-clip-text text-transparent">Lançamentos</span>
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              Acompanhe as datas oficiais de lançamento de episódios, novas temporadas e filmes atualizados em tempo real.
            </p>
          </div>

          <button
            onClick={fetchCalendar}
            disabled={isLoading}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-gray-800 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 shrink-0 min-h-[40px] touch-manipulation"
            id="refresh-calendar-btn"
          >
            <RefreshCw className={`w-4 h-4 text-red-500 ${isLoading ? "animate-spin" : ""}`} />
            <span>Atualizar Grade</span>
          </button>
        </div>

        {/* Stats Pills Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-800/80">
          <div className="bg-black/50 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-gray-800/80 flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600/15 text-red-500 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Catalogado</span>
              <span className="text-base sm:text-lg font-black text-white font-display">{stats.total}</span>
            </div>
          </div>

          <div className="bg-black/50 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-gray-800/80 flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Hoje</span>
              <span className="text-base sm:text-lg font-black text-white font-display">{stats.todayCount}</span>
            </div>
          </div>

          <div className="bg-black/50 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-gray-800/80 flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Já Disponíveis</span>
              <span className="text-base sm:text-lg font-black text-white font-display">{stats.updatedCount}</span>
            </div>
          </div>

          <div className="bg-black/50 backdrop-blur-md p-2.5 sm:p-3 rounded-2xl border border-gray-800/80 flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Em Breve</span>
              <span className="text-base sm:text-lg font-black text-white font-display">{stats.futureCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0b0b0b] p-3.5 sm:p-4 rounded-2xl border border-gray-900 shadow-xl mb-6 sm:mb-8 space-y-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar título ou episódio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050505] border border-gray-800 focus:border-red-600 text-xs text-white placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none transition-colors min-h-[40px]"
              id="calendar-search-input"
            />
          </div>

          {/* Day Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 scrollbar-none touch-pan-x">
            {[
              { id: "all", label: "Todos" },
              { id: "today", label: "Hoje" },
              { id: "tomorrow", label: "Amanhã" },
              { id: "week", label: "Esta Semana" },
              { id: "upcoming", label: "Futuros" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedDayFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer min-h-[38px] touch-manipulation ${
                  selectedDayFilter === tab.id
                    ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                    : "bg-[#050505] text-gray-400 hover:text-white border border-gray-900"
                }`}
                id={`cal-filter-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Pills Filter */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-900 flex-wrap">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-red-500" />
            Status:
          </span>
          {[
            { id: "all", label: "Todos Status" },
            { id: "Atualizado", label: "Disponíveis" },
            { id: "Futuro", label: "Em Breve" },
            { id: "Atrasado", label: "Pendentes" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer min-h-[34px] touch-manipulation ${
                statusFilter === st.id
                  ? "bg-gray-800 text-white border border-gray-700"
                  : "text-gray-400 hover:text-white bg-[#050505]"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-gray-900/60 rounded-2xl aspect-[2/3] animate-pulse p-4 flex flex-col justify-end">
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="bg-red-950/30 border border-red-800/60 p-6 rounded-2xl text-center space-y-3 max-w-lg mx-auto my-12">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="font-bold text-white text-base">Falha de conexão</h3>
          <p className="text-xs text-gray-400 leading-relaxed">{error}</p>
          <button
            onClick={fetchCalendar}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && groupedByDate.length === 0 && (
        <div className="bg-[#0b0b0b] border border-gray-900 rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto my-12">
          <CalendarIcon className="w-12 h-12 text-gray-700 mx-auto" />
          <h3 className="font-bold text-white text-base">Nenhum lançamento encontrado</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Não encontramos nenhum título para o filtro selecionado. Tente mudar o termo de busca ou selecionar outro dia.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedDayFilter("all");
              setStatusFilter("all");
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-xl border border-gray-800 transition-all cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Release Groups Timeline */}
      {!isLoading && !error && groupedByDate.length > 0 && (
        <div className="space-y-8 sm:space-y-10">
          {groupedByDate.map((group) => {
            const isToday = group.date === todayStr;
            const isTomorrow = group.date === tomorrowStr;

            return (
              <div key={group.date} className="space-y-3.5">
                {/* Date Header Badge */}
                <div className="flex items-center gap-3 border-b border-gray-900 pb-2">
                  <div
                    className={`px-3 py-1 rounded-xl text-xs font-bold font-display flex items-center gap-2 ${
                      isToday
                        ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                        : isTomorrow
                        ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                        : "bg-gray-900 text-gray-300 border border-gray-800"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isToday ? `HOJE (${formatDateBR(group.date)})` : isTomorrow ? `AMANHÃ (${formatDateBR(group.date)})` : formatDateBR(group.date)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-semibold">
                    {group.items.length} {group.items.length === 1 ? "título" : "títulos"}
                  </span>
                </div>

                {/* Items Grid Responsive */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {group.items.map((item, idx) => {
                    const catalogMovie = getCatalogMovie(item);
                    const itemKey = item.tmdb_id || item.title;
                    const isImporting = Boolean(importingIds[itemKey]);

                    return (
                      <CalendarCard
                        key={`${item.title}-${idx}`}
                        item={item}
                        catalogMovie={catalogMovie}
                        isAdmin={isAdmin}
                        isImporting={isImporting}
                        onCardClick={handleCardClick}
                        onAddToSite={handleAddToSite}
                        formatDateBR={formatDateBR}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Infinite Scroll Sentinel Element */}
          <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center py-4">
            {visibleCount < filteredItems.length && (
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-900/60 px-4 py-2 rounded-full border border-gray-800">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                <span>Carregando mais lançamentos ({filteredItems.length - visibleCount} restantes)...</span>
              </div>
            )}
          </div>

          {/* Fallback Manual Load More Button */}
          {visibleCount < filteredItems.length && (
            <div className="text-center pt-2 pb-6">
              <button
                onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredItems.length))}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs px-6 py-3 rounded-full shadow-lg shadow-red-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-red-500/30 touch-manipulation"
                id="load-more-calendar-btn"
              >
                <span>Carregar Mais Lançamentos ({filteredItems.length - visibleCount} restantes)</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

