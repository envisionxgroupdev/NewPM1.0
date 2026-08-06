import React, { useState, useEffect, useMemo } from "react";
import { Movie, ContinueWatchingItem, CustomCodesConfig, SiteAdsConfig } from "./types";
import Header from "./components/Header";
import HeroCarousel from "./components/HeroCarousel";
import MovieCard from "./components/MovieCard";
import NetflixRow from "./components/NetflixRow";
import ContinueWatchingRow from "./components/ContinueWatchingRow";
import MovieModal from "./components/MovieModal";
import AuthModal from "./components/AuthModal";
import ReportModal from "./components/ReportModal";
import ReportWebsiteBugModal from "./components/ReportWebsiteBugModal";
import ProfileModal from "./components/ProfileModal";
import AdminPanel from "./components/AdminPanel";
import ReleaseCalendar from "./components/ReleaseCalendar";
import AdBanner from "./components/AdBanner";
import CustomScriptInjector from "./components/CustomScriptInjector";
import { useUserSync } from "./hooks/useUserSync";
import {
  getContinueWatchingList,
  removeContinueWatching,
  clearContinueWatching,
  CONTINUE_WATCHING_EVENT,
} from "./utils/continueWatching";
import { Film, Bookmark, Zap, AlertCircle, Tv, Flame, Star, Clapperboard, Heart, ArrowRight, Bug, Wrench, ShieldAlert, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MaintenanceScreen from "./components/MaintenanceScreen";
import { sortMoviesByYearDesc } from "./utils/sortMovies";
import { subscribeToMovies } from "./lib/firebase";

const ALL_GENRES = ["Tudo", "Ação", "Ficção Científica", "Aventura", "Animação", "Drama", "Família", "Suspense", "Policial"];

export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [selectedGenre, setSelectedGenre] = useState("Tudo");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bannedAlertOpen, setBannedAlertOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isWebsiteBugModalOpen, setIsWebsiteBugModalOpen] = useState(false);
  const [reportMovieTarget, setReportMovieTarget] = useState<Movie | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [visibleGridLimit, setVisibleGridLimit] = useState(20);
  const [continueWatchingItems, setContinueWatchingItems] = useState<ContinueWatchingItem[]>([]);
  const [modalResumeParams, setModalResumeParams] = useState<{
    playerType?: "none" | "trailer" | "superflix" | "warez";
    season?: number;
    episode?: number;
  }>({});

  const [maintenanceConfig, setMaintenanceConfig] = useState<{
    enabled: boolean;
    title: string;
    message: string;
    estimatedReturn: string;
  }>({
    enabled: false,
    title: "Estamos em Manutenção Programada ⚙️",
    message: "Estamos realizando atualizações em nossos servidores para melhorar a velocidade e a estabilidade. Voltaremos em breve!",
    estimatedReturn: "Em breve (Algumas horas)"
  });

  const [customCodes, setCustomCodes] = useState<CustomCodesConfig>({
    headerCode: "",
    footerCode: ""
  });

  const [siteAds, setSiteAds] = useState<SiteAdsConfig | null>(null);

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          if (data.maintenance) {
            const nextEnabled = Boolean(data.maintenance.enabled);
            const nextTitle = data.maintenance.title || "Estamos em Manutenção Programada ⚙️";
            const nextMessage = data.maintenance.message || "Estamos realizando atualizações em nossos servidores para melhorar a velocidade e a estabilidade. Voltaremos em breve!";
            const nextReturn = data.maintenance.estimatedReturn || "Em breve (Algumas horas)";
            
            setMaintenanceConfig((prev) => {
              if (
                prev.enabled === nextEnabled &&
                prev.title === nextTitle &&
                prev.message === nextMessage &&
                prev.estimatedReturn === nextReturn
              ) {
                return prev;
              }
              return {
                enabled: nextEnabled,
                title: nextTitle,
                message: nextMessage,
                estimatedReturn: nextReturn,
              };
            });
          }

          if (data.customCodes) {
            setCustomCodes({
              headerCode: data.customCodes.headerCode || "",
              footerCode: data.customCodes.footerCode || ""
            });
          }

          if (data.ads) {
            setSiteAds(data.ads);
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar configurações públicas:", err);
      }
    };
    fetchPublicSettings();
    const interval = setInterval(fetchPublicSettings, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync Continue Watching items from localStorage
  const refreshContinueWatching = () => {
    const list = getContinueWatchingList();
    const updatedList = list
      .map((item) => {
        const foundMovie = movies.find((m) => m.id === item.movieId);
        return foundMovie ? { ...item, movie: foundMovie } : item;
      })
      .filter((item) => item.movie);
    setContinueWatchingItems(updatedList);
  };

  // Dynamic SEO Document Title & Meta Tags Management
  useEffect(() => {
    let title = "PipocaMax - Filmes, Séries e Animes Online em HD";
    let metaDesc = "Assista a Filmes, Séries e Animes online grátis em HD no PipocaMax. Confira os últimos lançamentos, sinopses detalhadas, trailers e buscas instantâneas.";

    if (selectedMovie) {
      const typeLabel = selectedMovie.type === "serie" ? "Série" : selectedMovie.type === "anime" ? "Anime" : "Filme";
      title = `Assistir ${selectedMovie.title} (${selectedMovie.year || "Online"}) - ${typeLabel} em HD - PipocaMax`;
      metaDesc = `Assistir ${selectedMovie.title} online em HD. ${selectedMovie.synopsis ? selectedMovie.synopsis.slice(0, 140) + "..." : "Veja o trailer, sinopse, elenco e reprodução no PipocaMax."}`;
    } else if (searchQuery.trim()) {
      title = `Buscar "${searchQuery}" - Filmes e Séries no PipocaMax`;
      metaDesc = `Resultados da busca por ${searchQuery} em filmes, séries e animes no PipocaMax.`;
    } else if (activeTab === "filme" || activeTab === "filmes") {
      title = "Filmes Online em HD - Lançamentos e Sucessos de Cinema - PipocaMax";
      metaDesc = "Catálogo completo de filmes online grátis em HD. Assista a lançamentos de ação, comédia, terror, drama e animação no PipocaMax.";
    } else if (activeTab === "serie" || activeTab === "series") {
      title = "Séries Online em HD - Assistir Temporadas Completas - PipocaMax";
      metaDesc = "Assista às melhores séries online em HD. Todas as temporadas, episódios atualizados, dublados e legendados no PipocaMax.";
    } else if (activeTab === "anime" || activeTab === "animes") {
      title = "Animes Online Legendados e Dublados em HD - PipocaMax";
      metaDesc = "Assista a animes online grátis em HD. Episódios atualizados de animes populares, lançamentos da temporada no PipocaMax.";
    } else if (activeTab === "embreve" || activeTab === "em-breve") {
      title = "Em Breve - Próximos Lançamentos de Cinema e Streaming - PipocaMax";
      metaDesc = "Confira a lista de filmes, séries e animes em breve (ano > 2026). Fique por dentro de todas as novidades que estreiam nos próximos anos no PipocaMax.";
    } else if (activeTab === "favorites") {
      title = "Meus Favoritos - PipocaMax";
    } else if (selectedGenre && selectedGenre !== "Tudo") {
      title = `${selectedGenre} - Filmes, Séries e Animes - PipocaMax`;
      metaDesc = `Explore os melhores títulos do gênero ${selectedGenre} no PipocaMax.`;
    }

    document.title = title;

    const metaDescEl = document.querySelector('meta[name="description"]');
    if (metaDescEl) {
      metaDescEl.setAttribute("content", metaDesc);
    }
  }, [selectedMovie, activeTab, searchQuery, selectedGenre]);

  useEffect(() => {
    refreshContinueWatching();
    const handleUpdate = () => refreshContinueWatching();
    window.addEventListener(CONTINUE_WATCHING_EVENT, handleUpdate);
    return () => window.removeEventListener(CONTINUE_WATCHING_EVENT, handleUpdate);
  }, [movies]);

  const handleSelectContinueWatching = (movie: Movie, item?: ContinueWatchingItem) => {
    setSelectedMovie(movie);
    setModalResumeParams({
      playerType: item?.playerType || "superflix",
      season: item?.season || 1,
      episode: item?.episode || 1,
    });
  };

  const handleRemoveContinueWatching = (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeContinueWatching(movieId);
  };

  const handleClearAllContinueWatching = () => {
    clearContinueWatching();
  };

  // Reset grid items limit when filters or active tab change
  useEffect(() => {
    setVisibleGridLimit(20);
  }, [activeTab, selectedGenre, searchQuery]);

  // Load stored user session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("pipocamax_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
      } catch (e) {
        localStorage.removeItem("pipocamax_user");
      }
    }
  }, []);

  // Hook customizado para sincronizar o perfil do usuário e permissões periodicamente com o servidor
  useUserSync({
    currentUser,
    setCurrentUser,
    intervalMs: 30000, // Sincroniza a cada 30 segundos sem causar re-renders
    onRoleChanged: (newRole, oldRole) => {
      console.log(`[App] Permissão do usuário alterada de "${oldRole}" para "${newRole}"`);
      // Se o usuário perder o acesso admin enquanto navega no painel de administração, redireciona para o início
      if (oldRole === "admin" && newRole !== "admin" && activeTab === "admin") {
        setActiveTab("home");
      }
    },
    onUserLoggedOut: (reason) => {
      if (activeTab === "admin") {
        setActiveTab("home");
      }
      if (reason === "banned") {
        setBannedAlertOpen(true);
      }
    }
  });

  // Garantir segurança do painel admin caso as permissões do usuário mudem
  useEffect(() => {
    if (activeTab === "admin" && currentUser?.role !== "admin") {
      setActiveTab("home");
    }
  }, [activeTab, currentUser?.role]);

  // Load favorites from local storage
  useEffect(() => {
    const stored = localStorage.getItem("pipocamax_favorites");
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  // Helper function to safely parse dates without throwing SyntaxError in strict browser engines
  const parseSafeDate = (val?: any): number | null => {
    if (!val) return null;
    try {
      if (typeof val === "number") return isNaN(val) ? null : val;
      if (typeof val === "object") {
        if (typeof val.seconds === "number") return val.seconds * 1000;
        if (typeof val._seconds === "number") return val._seconds * 1000;
      }
      if (typeof val === "string") {
        const cleaned = val.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, "$1T$2");
        const timestamp = Date.parse(cleaned);
        return isNaN(timestamp) ? null : timestamp;
      }
    } catch {
      return null;
    }
    return null;
  };

  // Fetch movies from server/DB and subscribe to real-time Firestore updates
  const fetchMovies = async () => {
    try {
      const response = await fetch("/api/movies");
      if (response.ok) {
        const data = await response.json();
        if (data && data.movies && Array.isArray(data.movies)) {
          setMovies(sortMoviesByYearDesc(data.movies));
        }
      }
    } catch (err) {
      console.warn("Aviso ao carregar títulos do banco de dados:", err);
    }
  };

  useEffect(() => {
    // Fetch initial state from server
    fetchMovies();

    // Subscribe to real-time Firestore updates for live catalog synchronization
    const unsubscribe = subscribeToMovies(
      (updatedMovies) => {
        setMovies(updatedMovies);
      },
      (err) => {
        console.warn("[App] Erro na inscrição Firestore em tempo real:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem("pipocamax_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("pipocamax_user");
    if (activeTab === "admin") {
      setActiveTab("home");
    }
  };

  const handleToggleFavorite = (movie: Movie, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Avoid triggering card click
    }
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    let updated;
    if (favorites.includes(movie.id)) {
      updated = favorites.filter((id) => id !== movie.id);
    } else {
      updated = [...favorites, movie.id];
    }
    setFavorites(updated);
    localStorage.setItem("pipocamax_favorites", JSON.stringify(updated));
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
    setModalResumeParams({});
  };

  // Identify recently added movies based on database createdAt dates (within the last 7 days)
  const recentMovieIds = useMemo(() => {
    const ids = new Set<string>();
    const RECENT_DAYS_LIMIT = 7; // Recém chegado dura 7 dias e depois some
    const recentCutoffMs = Date.now() - RECENT_DAYS_LIMIT * 24 * 60 * 60 * 1000;
    
    try {
      movies.forEach(m => {
        const timestamp = parseSafeDate(m.createdAt);
        if (timestamp !== null && timestamp >= recentCutoffMs) {
          ids.add(m.id);
        }
      });
    } catch (err) {
      console.warn("Erro ao calcular lançamentos recentes:", err);
    }
    
    return ids;
  }, [movies]);

  // Categorized lists for Netflix-style home layout
  const isNetflixHomeView = activeTab === "home" && selectedGenre === "Tudo" && !searchQuery;

  const favoriteMoviesList = useMemo(() => {
    return sortMoviesByYearDesc(movies.filter((m) => favorites.includes(m.id)));
  }, [movies, favorites]);

  const trendingMoviesList = useMemo(() => {
    return sortMoviesByYearDesc(movies.filter((m) => m.featured === true));
  }, [movies]);

  const filmesList = useMemo(() => {
    return sortMoviesByYearDesc(movies.filter((m) => m.type === "filme"));
  }, [movies]);

  const seriesList = useMemo(() => {
    return sortMoviesByYearDesc(movies.filter((m) => m.type === "serie"));
  }, [movies]);

  const animesList = useMemo(() => {
    return sortMoviesByYearDesc(movies.filter((m) => m.type === "anime"));
  }, [movies]);

  const comingSoonList = useMemo(() => {
    return sortMoviesByYearDesc(movies.filter((m) => Number(m.year) > 2026));
  }, [movies]);

  const topRatedList = useMemo(() => {
    return [...movies].filter((m) => m.rating >= 8.0).sort((a, b) => {
      const yrA = Number(a.year || 0);
      const yrB = Number(b.year || 0);
      if (yrB !== yrA) return yrB - yrA;
      return b.rating - a.rating;
    });
  }, [movies]);

  // Filter movies
  const filteredMovies = useMemo(() => {
    const list = movies.filter((movie) => {
      // 1. Filter by active tab (Category)
      if (activeTab === "favorites") {
        if (!favorites.includes(movie.id)) return false;
      } else if (activeTab === "filmes" || activeTab === "filme") {
        if (movie.type !== "filme") return false;
      } else if (activeTab === "series" || activeTab === "serie") {
        if (movie.type !== "serie") return false;
      } else if (activeTab === "animes" || activeTab === "anime") {
        if (movie.type !== "anime") return false;
      } else if (activeTab === "embreve" || activeTab === "em-breve") {
        if (Number(movie.year) <= 2026) return false;
      }

      // 2. Filter by genre pill (only if not searching)
      if (selectedGenre !== "Tudo" && !searchQuery) {
        if (!movie.genres.includes(selectedGenre)) {
          return false;
        }
      }

      // 3. Filter by search text query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = movie.title.toLowerCase().includes(q);
        const matchOriginal = movie.originalTitle?.toLowerCase().includes(q);
        const matchDirector = movie.director.toLowerCase().includes(q);
        const matchGenre = movie.genres.some((g) => g.toLowerCase().includes(q));
        const matchCast = movie.cast.some((c) => c.toLowerCase().includes(q));
        return matchTitle || matchOriginal || matchDirector || matchGenre || matchCast;
      }

      return true;
    });
    return sortMoviesByYearDesc(list);
  }, [movies, activeTab, favorites, selectedGenre, searchQuery]);

  // Get count label helper
  const getCountLabel = () => {
    const count = filteredMovies.length;
    if (activeTab === "series" || activeTab === "serie") {
      return `${count} ${count === 1 ? "série" : "séries"}`;
    }
    if (activeTab === "animes" || activeTab === "anime") {
      return `${count} ${count === 1 ? "anime" : "animes"}`;
    }
    if (activeTab === "embreve" || activeTab === "em-breve") {
      return `${count} ${count === 1 ? "lançamento futuro" : "lançamentos futuros"}`;
    }
    return `${count} ${count === 1 ? "título" : "títulos"}`;
  };

  // If System Maintenance is active AND current user is not an administrator, show MaintenanceScreen
  if (maintenanceConfig.enabled && currentUser?.role !== "admin") {
    return (
      <>
        <MaintenanceScreen
          title={maintenanceConfig.title}
          message={maintenanceConfig.message}
          estimatedReturn={maintenanceConfig.estimatedReturn}
          onAdminLogin={() => setIsAuthModalOpen(true)}
        />
        <AnimatePresence>
          {isAuthModalOpen && (
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              onAuthSuccess={handleAuthSuccess}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-gray-200" id="pipocamax-app-root">
      {/* Dynamic Header/Footer Custom Scripts and Popunder Ad Injection */}
      <CustomScriptInjector customCodes={customCodes} popunderAd={siteAds?.popunderAd} />

      {/* Admin warning banner when maintenance is enabled */}
      {maintenanceConfig.enabled && currentUser?.role === "admin" && (
        <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-xs font-extrabold shadow-md z-50">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-black animate-spin-slow" />
            <span>MODO DE MANUTENÇÃO ESTÁ ATIVADO PARA O PÚBLICO! Apenas Administradores têm acesso ao site no momento.</span>
          </div>
          <button
            onClick={() => setActiveTab("admin")}
            className="bg-black text-amber-400 hover:bg-gray-900 px-3 py-1 rounded-lg transition-all text-[11px] font-black cursor-pointer"
          >
            Gerenciar em Configurações →
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedGenre("Tudo"); // Reset genre filter when switching tabs
        }}
        favoritesCount={favorites.length}
        currentUser={currentUser}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenProfile={() => {
          if (!currentUser) {
            setIsAuthModalOpen(true);
          } else {
            setIsProfileModalOpen(true);
          }
        }}
        onMovieClick={handleMovieClick}
        movies={movies}
      />

      {/* Header Ad Slot (Below Navigation Header) */}
      <div className="pt-16 sm:pt-20">
        <AdBanner ad={siteAds?.headerAd} slotName="Anúncio do Topo" className="max-w-7xl mx-auto px-4 py-2" />
      </div>

      {/* Main Content Area */}
      <main className="flex-grow pb-16">
        {activeTab === "admin" && currentUser?.role === "admin" ? (
          <AdminPanel 
            movies={movies} 
            onMoviesUpdated={fetchMovies} 
            currentUser={currentUser}
          />
        ) : activeTab === "calendar" ? (
          <ReleaseCalendar
            onSelectMovie={(m) => handleMovieClick(m as Movie)}
            movies={movies}
            currentUser={currentUser}
            onMoviesUpdated={fetchMovies}
          />
        ) : (
          <>
            {/* Banner Carousel: Only display on Home tab when there is no current search query */}
            {activeTab === "home" && !searchQuery && (
              <>
                <HeroCarousel
                  movies={movies}
                  onMovieClick={handleMovieClick}
                  favorites={favorites}
                  onToggleFavorite={(m) => handleToggleFavorite(m)}
                  currentUser={currentUser}
                />
                
                {/* Home Ad Slot (Between Hero Carousel and Catalog Rows) */}
                <AdBanner ad={siteAds?.homeBetweenRowsAd} slotName="Anúncio da Home" className="max-w-7xl mx-auto px-4 py-4" />
              </>
            )}

            {/* Catalog Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          
          {/* Section titles and filter widgets */}
          {activeTab !== "favorites" && !searchQuery && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                <h2 className="font-display font-extrabold text-lg md:text-xl text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-brand-primary" />
                  Navegar por Gêneros
                </h2>
              </div>
              {/* Horizontal sliding Genre pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                {ALL_GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer shrink-0 transition-all ${
                      selectedGenre === genre
                        ? "bg-brand-primary text-white shadow-md shadow-red-600/20 font-bold"
                        : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                    }`}
                    id={`genre-pill-${genre}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* NETFLIX-STYLE HOMEPAGE ROWS (When on Home tab with 'Tudo' genre and no search) */}
          {isNetflixHomeView ? (
            <div className="space-y-4">
              {/* Continue Watching Row (If User Has Items In Progress) */}
              {continueWatchingItems.length > 0 && (
                <ContinueWatchingRow
                  items={continueWatchingItems}
                  onSelect={handleSelectContinueWatching}
                  onRemove={handleRemoveContinueWatching}
                  onClearAll={handleClearAllContinueWatching}
                />
              )}

              {/* Row 0: Minha Lista (If User Has Favorites) */}
              {favoriteMoviesList.length > 0 && (
                <NetflixRow
                  title="Minha Lista"
                  icon={<Heart className="w-5 h-5 fill-brand-primary text-brand-primary" />}
                  movies={favoriteMoviesList}
                  onMovieClick={handleMovieClick}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  recentMovieIds={recentMovieIds}
                  onSeeAll={() => setActiveTab("favorites")}
                  seeAllLabel="Ver Lista Completa"
                  badge={`${favoriteMoviesList.length}`}
                />
              )}

              {/* Row 1: Lançamentos */}
              {trendingMoviesList.length > 0 && (
                <NetflixRow
                  title="Lançamentos"
                  icon={<Flame className="w-5 h-5 text-red-500 fill-red-500" />}
                  movies={trendingMoviesList}
                  onMovieClick={handleMovieClick}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  recentMovieIds={recentMovieIds}
                  badge="Destaques"
                  currentUser={currentUser}
                />
              )}

              {/* Row 2: Filmes */}
              <NetflixRow
                title="Filmes"
                icon={<Film className="w-5 h-5 text-brand-primary" />}
                movies={filmesList}
                onMovieClick={handleMovieClick}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                recentMovieIds={recentMovieIds}
                onSeeAll={() => setActiveTab("filmes")}
                seeAllLabel="Ver todos os filmes"
                badge="Filmes"
                maxItems={20}
                currentUser={currentUser}
              />

              {/* Row 3: Séries */}
              <NetflixRow
                title="Séries"
                icon={<Tv className="w-5 h-5 text-brand-primary" />}
                movies={seriesList}
                onMovieClick={handleMovieClick}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                recentMovieIds={recentMovieIds}
                onSeeAll={() => setActiveTab("series")}
                seeAllLabel="Ver todas as séries"
                badge="Séries"
                maxItems={20}
                currentUser={currentUser}
              />

              {/* Row 4: Animes */}
              <NetflixRow
                title="Animes"
                icon={<Zap className="w-5 h-5 text-amber-400" />}
                movies={animesList}
                onMovieClick={handleMovieClick}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                recentMovieIds={recentMovieIds}
                onSeeAll={() => setActiveTab("animes")}
                seeAllLabel="Ver todos os animes"
                badge="Animes"
                maxItems={20}
                currentUser={currentUser}
              />

              {/* Row 5: Em Breve (Lançamentos futuros ano > 2026) */}
              {comingSoonList.length > 0 && (
                <NetflixRow
                  title="Em Breve"
                  icon={<Calendar className="w-5 h-5 text-amber-400" />}
                  movies={comingSoonList}
                  onMovieClick={handleMovieClick}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                  recentMovieIds={recentMovieIds}
                  onSeeAll={() => setActiveTab("embreve")}
                  seeAllLabel="Ver lançamentos futuros"
                  badge="Em Breve"
                  maxItems={20}
                  currentUser={currentUser}
                />
              )}

              {/* Row 6: Top Rated */}
              <NetflixRow
                title="Mais Bem Avaliados"
                icon={<Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                movies={topRatedList}
                onMovieClick={handleMovieClick}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                recentMovieIds={recentMovieIds}
                badge="Top 10"
                maxItems={20}
                currentUser={currentUser}
              />
            </div>
          ) : (
            /* STANDARD GRID VIEW (for search, filtered genres, or specific tabs) */
            <>
              {/* Catalog title indicators */}
              <div className="flex items-center justify-between border-b border-gray-900 pb-3 mb-6">
                <h2 className="font-display font-extrabold text-xl md:text-2xl text-white flex items-center gap-2">
                  {searchQuery ? (
                    <span>Resultados de busca para &ldquo;{searchQuery}&rdquo;</span>
                  ) : activeTab === "favorites" ? (
                    <>
                      <Bookmark className="w-5.5 h-5.5 text-brand-primary fill-brand-primary" />
                      <span>Minha Lista de Favoritos</span>
                    </>
                  ) : activeTab === "filmes" || activeTab === "filme" ? (
                    <>
                      <Film className="w-5.5 h-5.5 text-brand-primary" />
                      <span>{selectedGenre === "Tudo" ? "Catálogo de Filmes" : `Filmes de ${selectedGenre}`}</span>
                    </>
                  ) : activeTab === "series" || activeTab === "serie" ? (
                    <>
                      <Tv className="w-5.5 h-5.5 text-brand-primary" />
                      <span>{selectedGenre === "Tudo" ? "Catálogo de Séries" : `Séries de ${selectedGenre}`}</span>
                    </>
                  ) : activeTab === "animes" || activeTab === "anime" ? (
                    <>
                      <Zap className="w-5.5 h-5.5 text-brand-primary" />
                      <span>{selectedGenre === "Tudo" ? "Catálogo de Animes" : `Animes de ${selectedGenre}`}</span>
                    </>
                  ) : activeTab === "embreve" || activeTab === "em-breve" ? (
                    <>
                      <Calendar className="w-5.5 h-5.5 text-amber-400" />
                      <span>{selectedGenre === "Tudo" ? "Em Breve (Lançamentos Futuros)" : `Em Breve de ${selectedGenre}`}</span>
                    </>
                  ) : (
                    <>
                      <Clapperboard className="w-5.5 h-5.5 text-brand-primary" />
                      <span>{selectedGenre === "Tudo" ? "Destaques e Lançamentos" : `Recomendações de ${selectedGenre}`}</span>
                    </>
                  )}
                </h2>
                <span className="font-mono text-xs text-gray-500 font-bold bg-[#141414] px-2.5 py-1 rounded-md border border-gray-900">
                  {getCountLabel()}
                </span>
              </div>

              {/* Grid Layout of Cards */}
              {filteredMovies.length > 0 ? (
                <>
                  <motion.div 
                    layout
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
                    id="movie-grid"
                  >
                    <AnimatePresence>
                      {filteredMovies.slice(0, visibleGridLimit).map((movie) => (
                        <motion.div
                          key={movie.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                        >
                          <MovieCard
                            movie={movie}
                            onMovieClick={handleMovieClick}
                            isFavorite={favorites.includes(movie.id)}
                            onToggleFavorite={handleToggleFavorite}
                            isRecent={recentMovieIds.has(movie.id)}
                            currentUser={currentUser}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {/* Load More / See All Buttons if count > visibleGridLimit */}
                  {filteredMovies.length > visibleGridLimit && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 pt-6 border-t border-gray-900">
                      <button
                        onClick={() => setVisibleGridLimit((prev) => prev + 20)}
                        className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs px-6 py-3 rounded-xl border border-gray-800 hover:border-gray-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                      >
                        <span>Mostrar +20 Títulos</span>
                        <span className="text-[10px] bg-black px-2 py-0.5 rounded font-mono text-gray-400">
                          ({filteredMovies.length - visibleGridLimit} restantes)
                        </span>
                      </button>

                      <button
                        onClick={() => setVisibleGridLimit(filteredMovies.length)}
                        className="w-full sm:w-auto bg-brand-primary hover:bg-red-600 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Ver Todos os {filteredMovies.length} Títulos</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* Elegant Empty State */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center text-center p-12 md:p-20 bg-dark-card/30 rounded-2xl border border-gray-900"
                  id="catalog-empty-state"
                >
                  <div className="bg-gray-950 text-brand-primary p-4 rounded-full border border-gray-800 mb-4 animate-pulse">
                    {activeTab === "favorites" ? (
                      <Bookmark className="w-8 h-8" />
                    ) : (
                      <AlertCircle className="w-8 h-8" />
                    )}
                  </div>
                  <h3 className="font-display font-bold text-lg text-white mb-2">
                    {activeTab === "favorites" ? "Sua lista está vazia" : "Nenhum título encontrado"}
                  </h3>
                  <p className="font-sans text-sm text-gray-400 max-w-sm mb-6">
                    {activeTab === "favorites"
                      ? "Explore o nosso catálogo e adicione títulos à sua lista clicando no marcador dos cartazes."
                      : "Não conseguimos encontrar títulos correspondendo a esses critérios. Experimente mudar os filtros!"}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedGenre("Tudo");
                      setActiveTab("home");
                    }}
                    className="bg-brand-primary hover:bg-brand-secondary text-white font-bold text-xs px-5 py-2.5 rounded-full cursor-pointer transition-colors shadow-md border border-transparent hover:border-red-500"
                  >
                    Limpar Filtros e Voltar ao Início
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>
          </>
        )}
      </main>

      {/* Footer Ad Slot */}
      <AdBanner ad={siteAds?.footerAd} slotName="Anúncio do Rodapé" className="max-w-7xl mx-auto px-4 py-4" />

      {/* SEO-optimized Footer */}
      <footer className="border-t border-gray-900 bg-[#08080a] pt-10 pb-8 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 space-y-8">
          {/* Top Brand & Category Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-gray-900">
            {/* Brand Intro */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <Clapperboard className="w-5 h-5 text-brand-primary" />
                <span className="font-display font-black text-white text-lg tracking-wider">
                  Pipoca<span className="text-brand-primary">Max</span>
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                A sua plataforma definitiva para assistir a filmes, séries e animes online em alta definição. O melhor do cinema e streaming ao seu alcance.
              </p>
            </div>

            {/* Nav Column 1: Categorias Populares */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Navegação Rápida</h3>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>
                  <button
                    onClick={() => {
                      setSelectedMovie(null);
                      setSearchQuery("");
                      setActiveTab("home");
                      setSelectedGenre("Tudo");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-gray-900/80 hover:text-red-400 transition-all cursor-pointer block font-medium"
                  >
                    Início / Populares
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedMovie(null);
                      setSearchQuery("");
                      setActiveTab("filmes");
                      setSelectedGenre("Tudo");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-gray-900/80 hover:text-red-400 transition-all cursor-pointer block font-medium"
                  >
                    Filmes Online em HD
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedMovie(null);
                      setSearchQuery("");
                      setActiveTab("series");
                      setSelectedGenre("Tudo");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-gray-900/80 hover:text-red-400 transition-all cursor-pointer block font-medium"
                  >
                    Séries e Temporadas
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedMovie(null);
                      setSearchQuery("");
                      setActiveTab("animes");
                      setSelectedGenre("Tudo");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-gray-900/80 hover:text-red-400 transition-all cursor-pointer block font-medium"
                  >
                    Animes Legendados e Dublados
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setSelectedMovie(null);
                      setSearchQuery("");
                      setActiveTab("embreve");
                      setSelectedGenre("Tudo");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-gray-900/80 hover:text-amber-400 transition-all cursor-pointer block font-medium"
                  >
                    Em Breve (Lançamentos Futuros)
                  </button>
                </li>
              </ul>
            </div>

            {/* Nav Column 2: Gêneros em Destaque */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Gêneros Populares</h3>
              <ul className="space-y-1 text-xs text-gray-400">
                {["Ação", "Comédia", "Terror", "Animação", "Aventura"].map((g) => (
                  <li key={g}>
                    <button
                      onClick={() => {
                        setSelectedMovie(null);
                        setSearchQuery("");
                        setSelectedGenre(g);
                        setActiveTab("home");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-gray-900/80 hover:text-amber-400 transition-all cursor-pointer block font-medium"
                    >
                      Filmes e Séries de {g}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Nav Column 3: Suporte & SEO Tech Links */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Suporte & Ferramentas</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (!currentUser) {
                      setIsAuthModalOpen(true);
                    } else {
                      setIsWebsiteBugModalOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:text-amber-300 font-extrabold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10 text-xs w-fit"
                  id="footer-report-bug-btn"
                  title="Relatar um bug no site ou no filtro"
                >
                  <Bug className="w-4 h-4 text-amber-400" />
                  <span>Reportar Bug no Site</span>
                </button>

                <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-500">
                  <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors underline">
                    Sitemap.xml
                  </a>
                  <span>•</span>
                  <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors underline">
                    Robots.txt
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Statement */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-gray-500 text-[11px]">
            <p>
              PipocaMax &copy; 2026. Todos os direitos reservados. Assista aos melhores filmes, séries e animes online em alta definição HD.
            </p>
          </div>
        </div>
      </footer>

      {/* Details modal overlay */}
      <AnimatePresence>
        {selectedMovie && (
          <MovieModal
            movie={selectedMovie}
            allMovies={movies}
            onClose={() => {
              setSelectedMovie(null);
              setModalResumeParams({});
            }}
            isFavorite={favorites.includes(selectedMovie.id)}
            onToggleFavorite={(m) => handleToggleFavorite(m)}
            onMovieClick={handleMovieClick}
            initialPlayerType={modalResumeParams.playerType}
            initialSeason={modalResumeParams.season}
            initialEpisode={modalResumeParams.episode}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            playerAd={siteAds?.playerAd}
            sidebarAd={siteAds?.sidebarAd}
            onOpenReport={(m) => {
              if (!currentUser) {
                setIsAuthModalOpen(true);
              } else {
                setReportMovieTarget(m);
                setIsReportModalOpen(true);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Authentication Modal Overlay */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>

      {/* Movie/Series Report Modal Overlay */}
      <AnimatePresence>
        {isReportModalOpen && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            currentUser={currentUser}
            movie={reportMovieTarget}
            onNeedAuth={() => {
              setIsReportModalOpen(false);
              setIsAuthModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Website/Filter Bug Report Modal Overlay */}
      <AnimatePresence>
        {isWebsiteBugModalOpen && (
          <ReportWebsiteBugModal
            isOpen={isWebsiteBugModalOpen}
            onClose={() => setIsWebsiteBugModalOpen(false)}
            currentUser={currentUser}
            onNeedAuth={() => {
              setIsWebsiteBugModalOpen(false);
              setIsAuthModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* User Profile Modal Overlay */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentUser={currentUser}
            onUserUpdated={(updatedUser: any) => {
              setCurrentUser(updatedUser);
              localStorage.setItem("pipocamax_user", JSON.stringify(updatedUser));
            }}
            onLogout={handleLogout}
            favoriteMovies={movies.filter((m) => favorites.includes(m.id))}
            onMovieClick={handleMovieClick}
            onOpenReportModal={() => {
              setIsProfileModalOpen(false);
              setReportMovieTarget(null);
              setIsReportModalOpen(true);
            }}
            onOpenWebsiteBugModal={() => {
              setIsProfileModalOpen(false);
              setIsWebsiteBugModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Account Banned / Blocked Modal */}
      <AnimatePresence>
        {bannedAlertOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0f0f0f] border border-red-900/50 rounded-3xl p-7 max-w-md w-full shadow-2xl text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800 flex items-center justify-center text-red-500 mx-auto shadow-lg shadow-red-900/20">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  Acesso Bloqueado
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
                  Sua conta foi suspensa ou bloqueada por um administrador do PipocaMax. Seu acesso ao sistema e reprodução de conteúdos foram desativados.
                </p>
              </div>

              <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-3.5 text-left flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300 leading-normal">
                  Se você acredita que isso foi um engano, entre em contato com o suporte ou equipe de administração do PipocaMax.
                </p>
              </div>

              <button
                onClick={() => setBannedAlertOpen(false)}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs tracking-wide uppercase transition-all shadow-lg shadow-red-600/30 cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
