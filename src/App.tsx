import React, { useState, useEffect, useMemo } from "react";
import { Movie, ContinueWatchingItem } from "./types";
import { MOVIES_DATA } from "./moviesData";
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
import { useUserSync } from "./hooks/useUserSync";
import {
  getContinueWatchingList,
  removeContinueWatching,
  clearContinueWatching,
  CONTINUE_WATCHING_EVENT,
} from "./utils/continueWatching";
import { Film, Bookmark, Zap, AlertCircle, Tv, Flame, Star, Clapperboard, Heart, ArrowRight, Bug } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const ALL_GENRES = ["Tudo", "Ação", "Ficção Científica", "Aventura", "Animação", "Drama", "Família", "Suspense", "Policial"];

export default function App() {
  const [movies, setMovies] = useState<Movie[]>(MOVIES_DATA);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [selectedGenre, setSelectedGenre] = useState("Tudo");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
    cinemaMode?: boolean;
  }>({});

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
      cinemaMode: true,
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
    intervalMs: 5000, // Sincroniza a cada 5 segundos
    onRoleChanged: (newRole, oldRole) => {
      console.log(`[App] Permissão do usuário alterada de "${oldRole}" para "${newRole}"`);
      // Se o usuário perder o acesso admin enquanto navega no painel de administração, redireciona para o início
      if (oldRole === "admin" && newRole !== "admin" && activeTab === "admin") {
        setActiveTab("home");
      }
    },
    onUserLoggedOut: () => {
      if (activeTab === "admin") {
        setActiveTab("home");
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

  // Fetch movies from server/DB
  const fetchMovies = async () => {
    try {
      const response = await fetch("/api/movies");
      if (response.ok) {
        const data = await response.json();
        if (data && data.movies && Array.isArray(data.movies)) {
          setMovies(data.movies);
        }
      }
    } catch (err) {
      console.warn("Aviso ao carregar títulos do banco de dados:", err);
    }
  };

  useEffect(() => {
    fetchMovies();
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
    return movies.filter((m) => favorites.includes(m.id));
  }, [movies, favorites]);

  const trendingMoviesList = useMemo(() => {
    return movies.filter((m) => m.featured === true);
  }, [movies]);

  const filmesList = useMemo(() => {
    return movies.filter((m) => m.type === "filme");
  }, [movies]);

  const seriesList = useMemo(() => {
    return movies.filter((m) => m.type === "serie");
  }, [movies]);

  const animesList = useMemo(() => {
    return movies.filter((m) => m.type === "anime");
  }, [movies]);

  const topRatedList = useMemo(() => {
    return [...movies].filter((m) => m.rating >= 8.0).sort((a, b) => b.rating - a.rating);
  }, [movies]);

  // Filter movies
  const filteredMovies = movies.filter((movie) => {
    // 1. Filter by active tab (Category)
    if (activeTab === "favorites") {
      if (!favorites.includes(movie.id)) return false;
    } else if (activeTab === "filmes") {
      if (movie.type !== "filme") return false;
    } else if (activeTab === "series") {
      if (movie.type !== "serie") return false;
    } else if (activeTab === "animes") {
      if (movie.type !== "anime") return false;
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

  // Get count label helper
  const getCountLabel = () => {
    const count = filteredMovies.length;
    if (activeTab === "series") {
      return `${count} ${count === 1 ? "série" : "séries"}`;
    }
    if (activeTab === "animes") {
      return `${count} ${count === 1 ? "anime" : "animes"}`;
    }
    return `${count} ${count === 1 ? "título" : "títulos"}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-gray-200" id="pipocamax-app-root">
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

      {/* Main Content Area */}
      <main className="flex-grow pb-16">
        {activeTab === "admin" && currentUser?.role === "admin" ? (
          <AdminPanel 
            movies={movies} 
            onMoviesUpdated={fetchMovies} 
            currentUser={currentUser}
          />
        ) : (
          <>
            {/* Banner Carousel: Only display on Home tab when there is no current search query */}
            {activeTab === "home" && !searchQuery && (
              <HeroCarousel
                movies={movies}
                onMovieClick={handleMovieClick}
                favorites={favorites}
                onToggleFavorite={(m) => handleToggleFavorite(m)}
              />
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
              />

              {/* Row 5: Top Rated */}
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
                  ) : activeTab === "filmes" ? (
                    <>
                      <Film className="w-5.5 h-5.5 text-brand-primary" />
                      <span>{selectedGenre === "Tudo" ? "Catálogo de Filmes" : `Filmes de ${selectedGenre}`}</span>
                    </>
                  ) : activeTab === "series" ? (
                    <>
                      <Tv className="w-5.5 h-5.5 text-brand-primary" />
                      <span>{selectedGenre === "Tudo" ? "Catálogo de Séries" : `Séries de ${selectedGenre}`}</span>
                    </>
                  ) : activeTab === "animes" ? (
                    <>
                      <Zap className="w-5.5 h-5.5 text-brand-primary" />
                      <span>{selectedGenre === "Tudo" ? "Catálogo de Animes" : `Animes de ${selectedGenre}`}</span>
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

      {/* Footer block */}
      <footer className="border-t border-gray-900 bg-black py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Clapperboard className="w-4.5 h-4.5 text-brand-primary" />
            <span className="font-display font-bold text-white text-sm tracking-wider">
              Pipoca<span className="text-brand-primary">Max</span>
            </span>
          </div>

          <p className="font-sans text-gray-500">
            PipocaMax &copy; 2026. Todos os direitos reservados. Assista aos melhores filmes, séries e animes online em alta definição.
          </p>

          <button
            onClick={() => {
              if (!currentUser) {
                setIsAuthModalOpen(true);
              } else {
                setIsWebsiteBugModalOpen(true);
              }
            }}
            className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:text-amber-300 font-extrabold px-4 py-2 rounded-full transition-all cursor-pointer shadow-lg shadow-amber-500/10 text-xs shrink-0 hover:scale-[1.03] active:scale-[0.97]"
            id="footer-report-bug-btn"
            title="Relatar um bug no site ou no filtro"
          >
            <Bug className="w-4 h-4 text-amber-400" />
            <span>Reportar Bug</span>
          </button>
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
            initialCinemaMode={modalResumeParams.cinemaMode}
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
    </div>
  );
}
