import { useState, useEffect } from "react";
import { Popcorn, Search, Zap, Film, Bookmark, Tv, Clapperboard, Shield, LogIn, Info, Bell, CheckCircle2, X, Calendar, Star, ArrowRight } from "lucide-react";
import LazyImage from "./LazyImage";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  favoritesCount: number;
  currentUser: any;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenProfile?: () => void;
  onMovieClick?: (movie: any) => void;
  movies?: any[];
}

export default function Header({
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  favoritesCount,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenProfile,
  onMovieClick,
  movies = [],
}: HeaderProps) {
  const [showBetaTooltip, setShowBetaTooltip] = useState(false);

  // Debounced search state to prevent lag and excessive re-renders on keystrokes
  const [localSearchTerm, setLocalSearchTerm] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Compute live search suggestions based on title, original title, genres, director, or cast
  const searchSuggestions = (movies || []).filter((movie) => {
    const q = localSearchTerm.trim().toLowerCase();
    if (!q) return false;
    const title = String(movie.title || "").toLowerCase();
    const origTitle = String(movie.originalTitle || "").toLowerCase();
    const genresStr = Array.isArray(movie.genres) ? movie.genres.join(" ") : String(movie.genres || "");
    const genres = genresStr.toLowerCase();
    const director = String(movie.director || "").toLowerCase();
    const castStr = Array.isArray(movie.cast) ? movie.cast.join(" ") : String(movie.cast || "");
    const cast = castStr.toLowerCase();
    return title.includes(q) || origTitle.includes(q) || genres.includes(q) || director.includes(q) || cast.includes(q);
  }).slice(0, 6);

  // Keep local search term in sync when external searchQuery changes (e.g., cleared on tab switch)
  useEffect(() => {
    setLocalSearchTerm(searchQuery);
  }, [searchQuery]);

  // Debounce pushing local value to parent searchQuery state (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== searchQuery) {
        setSearchQuery(localSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, searchQuery, setSearchQuery]);

  const handleClearSearch = () => {
    setLocalSearchTerm("");
    setSearchQuery("");
  };

  // Notification Bell state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Fetch notifications for logged-in user
  const fetchNotifications = async () => {
    if (!currentUser || typeof currentUser.email !== "string") return;
    const cleanEmail = currentUser.email.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim().toLowerCase();
    if (!cleanEmail) return;
    try {
      const response = await fetch(`/api/notifications/my?email=${encodeURIComponent(cleanEmail)}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      }
    } catch (err) {
      console.warn("Não foi possível carregar notificações no momento:", err);
    }
  };

  useEffect(() => {
    if (currentUser?.email) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 12000); // Poll every 12 seconds
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

  const handleMarkAllRead = async () => {
    if (!currentUser || typeof currentUser.email !== "string") return;
    const cleanEmail = currentUser.email.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim().toLowerCase();
    if (!cleanEmail) return;

    // Optimistically update React state so the bell stops pulsing/blinking instantly
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
    } catch (err) {
      console.warn("Não foi possível marcar notificações como lidas:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#000000]/95 backdrop-blur-md border-b border-gray-900 px-4 py-3 md:px-8 flex flex-col lg:flex-row items-center justify-between gap-4">
      {/* Brand Logo with Beta */}
      <div className="relative">
        <div 
          className="flex items-center gap-2.5 cursor-pointer group select-none py-1 px-1 rounded-xl transition-all"
          onClick={() => {
            setActiveTab("home");
            setSearchQuery("");
          }}
          onMouseEnter={() => setShowBetaTooltip(true)}
          onMouseLeave={() => setShowBetaTooltip(false)}
          onTouchStart={() => setShowBetaTooltip(prev => !prev)}
          id="header-brand-logo"
        >
          <div className="bg-brand-primary text-white p-2 rounded-xl shadow-lg shadow-red-600/30 group-hover:scale-110 transition-transform flex items-center justify-center relative">
            <Popcorn className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-display font-black text-2xl tracking-tight text-white">
              Pipoca<span className="text-brand-primary">Max</span>
            </span>

            {/* BETA Badge next to Logo */}
            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-lg tracking-wider uppercase flex items-center gap-1 shadow-sm shadow-amber-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
              BETA
            </span>
          </div>
        </div>

        {/* Hover / Touch Tooltip explaining Beta and Development */}
        {(showBetaTooltip) && (
          <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-[#0d0d0d] border border-amber-500/40 p-3 rounded-xl shadow-2xl shadow-black animate-fade-in text-xs text-gray-200 pointer-events-none">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-400 flex items-center gap-1">
                  PipocaMax (Beta)
                </p>
                <p className="text-gray-300 leading-snug">
                  Este site está em versão <strong className="text-white">Beta</strong> e em constante desenvolvimento. Novas funções e melhorias estão sendo adicionadas!
                </p>
              </div>
            </div>
            {/* Tooltip Arrow */}
            <div className="absolute -top-1.5 left-6 w-3 h-3 bg-[#0d0d0d] border-t border-l border-amber-500/40 rotate-45" />
          </div>
        )}
      </div>

      {/* Tabs / Navigation */}
      <nav className="flex items-center justify-start sm:justify-center gap-1 md:gap-2 bg-[#141414]/90 p-1.5 rounded-full border border-gray-800 max-w-full overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => {
            setActiveTab("home");
            setSearchQuery("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "home" && searchQuery === ""
              ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
              : "text-gray-400 hover:text-white"
          }`}
          id="nav-home"
        >
          <Clapperboard className="w-3.5 h-3.5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("filmes");
            setSearchQuery("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "filmes"
              ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
              : "text-gray-400 hover:text-white"
          }`}
          id="nav-filmes"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Filmes</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("series");
            setSearchQuery("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "series"
              ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
              : "text-gray-400 hover:text-white"
          }`}
          id="nav-series"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Séries</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("animes");
            setSearchQuery("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "animes"
              ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
              : "text-gray-400 hover:text-white"
          }`}
          id="nav-animes"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Animes</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("calendar");
            setSearchQuery("");
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "calendar"
              ? "bg-brand-primary text-white shadow-md shadow-red-600/20 text-red-400"
              : "text-gray-400 hover:text-white"
          }`}
          id="nav-calendar"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Calendário</span>
        </button>

        {currentUser && (
          <button
            onClick={() => {
              setActiveTab("favorites");
              setSearchQuery("");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === "favorites"
                ? "bg-brand-primary text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white"
            }`}
            id="nav-favorites"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Minha Lista</span>
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono font-bold text-[9px] w-4 h-4 flex items-center justify-center rounded-full border border-black animate-pulse">
                {favoritesCount}
              </span>
            )}
          </button>
        )}

        {currentUser?.role === "admin" && (
          <button
            onClick={() => {
              setActiveTab("admin");
              setSearchQuery("");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "admin"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20 animate-pulse"
                : "text-red-400 hover:text-red-300 hover:bg-red-950/20"
            }`}
            id="nav-admin-panel"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Painel Admin</span>
          </button>
        )}
      </nav>

      {/* Search Bar & User Control */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto relative">
        <div className="relative w-full lg:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            type="text"
            value={localSearchTerm}
            onChange={(e) => {
              setLocalSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowSuggestions(false);
                handleClearSearch();
              } else if (e.key === "Enter") {
                setShowSuggestions(false);
                setSearchQuery(localSearchTerm);
              }
            }}
            placeholder="Buscar filmes, séries..."
            className="block w-full pl-10 pr-9 py-2 border border-gray-800 rounded-full bg-black text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600/40 focus:border-red-600/60 text-xs transition-all"
            id="search-input"
          />
          {localSearchTerm && (
            <button
              onClick={() => {
                handleClearSearch();
                setShowSuggestions(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Limpar busca"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && localSearchTerm.trim().length >= 1 && (
            <>
              {/* Click-outside backdrop to close suggestions */}
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setShowSuggestions(false)}
              />

              <div
                className="absolute top-full left-0 right-0 sm:w-80 sm:left-auto sm:right-0 mt-2 bg-[#0c0c0c] border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col divide-y divide-gray-900"
                id="search-suggestions-dropdown"
              >
                <div className="p-2.5 bg-black/90 flex items-center justify-between text-[11px] font-bold text-gray-400">
                  <span className="flex items-center gap-1.5 text-red-400 font-extrabold">
                    <Search className="w-3.5 h-3.5" />
                    Sugestões para "{localSearchTerm}"
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {searchSuggestions.length} encontrada(s)
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto no-scrollbar py-1">
                  {searchSuggestions.length > 0 ? (
                    searchSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          if (onMovieClick) {
                            onMovieClick(item);
                          } else {
                            setSearchQuery(item.title);
                          }
                        }}
                        className="w-full p-2 hover:bg-gray-900/90 transition-colors flex items-center gap-3 text-left cursor-pointer group"
                      >
                        <div className="w-10 h-12 rounded-lg border border-gray-800/80 group-hover:border-red-600/50 shrink-0 overflow-hidden">
                          <LazyImage
                            src={item.posterUrl || item.backdropUrl}
                            fallbackSrc={item.backdropUrl || item.posterUrl}
                            alt={item.title}
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover"
                            fallbackIconSize="sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${
                              item.type === "serie" 
                                ? "bg-blue-950/80 text-blue-400 border-blue-800/50" 
                                : item.type === "anime" 
                                ? "bg-purple-950/80 text-purple-400 border-purple-800/50" 
                                : "bg-red-950/80 text-red-400 border-red-800/50"
                            }`}>
                              {item.type === "serie" ? "Série" : item.type === "anime" ? "Anime" : "Filme"}
                            </span>
                            {item.year && (
                              <span className="text-[10px] text-gray-400 font-mono">{item.year}</span>
                            )}
                            {item.rating && (
                              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 ml-auto">
                                <Star className="w-2.5 h-2.5 fill-amber-400" />
                                {item.rating}
                              </span>
                            )}
                          </div>
                          <h5 className="font-bold text-xs text-white truncate group-hover:text-red-400 transition-colors">
                            {item.title}
                          </h5>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">
                            {Array.isArray(item.genres) ? item.genres.join(" • ") : (item.genres || item.originalTitle || "Mídia HD")}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center space-y-1">
                      <p className="text-xs text-gray-300 font-medium">Nenhum título encontrado para "{localSearchTerm}"</p>
                      <p className="text-[10px] text-gray-500">Tente buscar por outro termo ou gênero.</p>
                    </div>
                  )}
                </div>

                <div className="p-2 bg-black/95 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuggestions(false);
                      setSearchQuery(localSearchTerm);
                    }}
                    className="w-full py-1.5 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Ver todos os resultados no catálogo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* NOTIFICATION BELL BUTTON */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => {
                const nextState = !isNotifOpen;
                setIsNotifOpen(nextState);
                if (nextState || unreadCount > 0) {
                  handleMarkAllRead();
                }
              }}
              className={`p-2 text-gray-300 hover:text-white bg-gray-900/90 hover:bg-gray-800 border rounded-full transition-all cursor-pointer relative flex items-center justify-center shrink-0 ${
                unreadCount > 0
                  ? "border-amber-500/70 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/30 animate-pulse"
                  : "border-gray-800"
              }`}
              title="Notificações"
              id="header-notification-btn"
            >
              <Bell className={`w-4 h-4 text-amber-400 ${unreadCount > 0 ? "animate-bounce" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-black shadow-md shadow-red-600/50">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotifOpen && (
              <>
                {/* Click Outside Overlay */}
                <div
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                  onClick={() => setIsNotifOpen(false)}
                />

                <div
                  className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full mt-2 sm:mt-3 w-[calc(100vw-1rem)] max-w-sm sm:w-[400px] bg-[#0c0c0c] border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col max-h-[80vh] sm:max-h-[500px]"
                  id="notification-popover-square"
                >
                  <div className="p-3.5 bg-black border-b border-gray-900 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <h4 className="font-extrabold text-xs text-white">Notificações</h4>
                      {unreadCount > 0 && (
                        <span className="bg-red-950 text-red-400 border border-red-800/50 text-[10px] font-bold px-2 py-0.2 rounded-full">
                          {unreadCount} nova(s)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Marcar lidas
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="text-gray-500 hover:text-white p-1 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 sm:max-h-[400px] overflow-y-auto divide-y divide-gray-900/80 p-2 space-y-1.5 flex-1">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => {
                        // Check if this notification references a movie (by ID, attached movieId, or title match)
                        const matchedMovie = movies.find(
                          (m) =>
                            (notif.movieId && m.id === notif.movieId) ||
                            notif.reportId === m.id ||
                            (notif.message && notif.message.toLowerCase().includes(m.title.toLowerCase()))
                        );

                        // Determine style and badge based on notification type
                        let icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
                        let iconBg = "bg-emerald-950/80 border-emerald-800/60";
                        let badgeText = notif.status || "Aviso";
                        let badgeStyle = "text-emerald-400 bg-emerald-950 border-emerald-800/80";

                        if (notif.type === "alert" || notif.type === "warning") {
                          icon = <Info className="w-4 h-4 text-amber-400" />;
                          iconBg = "bg-amber-950/80 border-amber-800/60";
                          badgeText = "Aviso ⚠️";
                          badgeStyle = "text-amber-400 bg-amber-950 border-amber-800/80";
                        } else if (notif.type === "success") {
                          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
                          iconBg = "bg-emerald-950/80 border-emerald-800/60";
                          badgeText = "Novidade 🎉";
                          badgeStyle = "text-emerald-400 bg-emerald-950 border-emerald-800/80";
                        } else if (notif.type === "info" || notif.target === "all") {
                          icon = <Bell className="w-4 h-4 text-sky-400" />;
                          iconBg = "bg-sky-950/80 border-sky-800/60";
                          badgeText = notif.target === "all" ? "Geral 📢" : "Info ℹ️";
                          badgeStyle = "text-sky-400 bg-sky-950 border-sky-800/80";
                        }

                        return (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (matchedMovie && onMovieClick) {
                                onMovieClick(matchedMovie);
                                setIsNotifOpen(false);
                              }
                            }}
                            className={`p-3 rounded-xl transition-all ${
                              !notif.read
                                ? "bg-amber-950/30 border-l-4 border-amber-500 shadow-md shadow-amber-500/10"
                                : "bg-gray-950/40 hover:bg-gray-900/60"
                            } ${matchedMovie ? "cursor-pointer hover:border-amber-500/40" : ""}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`p-1.5 border rounded-lg shrink-0 mt-0.5 ${iconBg}`}>
                                {icon}
                              </div>
                              <div className="space-y-1 text-left flex-grow min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="font-extrabold text-xs text-white leading-snug break-words">
                                    {notif.title}
                                  </h5>
                                  <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded shrink-0 ${badgeStyle}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                                  {notif.message}
                                </p>
                                {matchedMovie && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:underline pt-0.5">
                                    ▶ Assistir / Ver {matchedMovie.title}
                                  </span>
                                )}
                                <span className="text-[9px] font-mono text-gray-500 block pt-0.5">
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString("pt-BR") : "Hoje"} às{" "}
                                  {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }) : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                        <Bell className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                        <p className="font-semibold text-gray-400">Nenhuma notificação</p>
                        <p className="text-[10px] text-gray-600">
                          Você está em dia! Quando houver novidades ou avisos da equipe, eles aparecerão aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Auth / Profile Controls */}
        {currentUser ? (
          <div className="flex items-center gap-2 shrink-0 bg-[#0c0c0c] border border-gray-800 pl-3 pr-2 py-1.5 rounded-full">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity text-left"
              title="Ver Perfil de Usuário"
              id="header-profile-btn"
            >
              <div className="w-6 h-6 rounded-full bg-brand-primary text-white font-bold text-xs flex items-center justify-center uppercase">
                {currentUser.name ? currentUser.name.charAt(0) : "U"}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-gray-200 leading-none truncate max-w-[100px]">
                  {currentUser.name}
                </span>
                <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider mt-0.5">
                  {currentUser.role === "admin" ? "Admin" : "Meu Perfil"}
                </span>
              </div>
            </button>
            <button
              onClick={onLogout}
              className="text-[10px] font-extrabold text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 ml-1"
              title="Sair da Conta"
              id="header-logout-btn"
            >
              <LogIn className="w-3 h-3 rotate-180" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="text-xs font-bold text-white bg-brand-primary hover:bg-brand-secondary px-4 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shrink-0 hover:scale-103 shadow-lg shadow-red-600/10"
            id="header-login-btn"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
        )}
      </div>
    </header>
  );
}
