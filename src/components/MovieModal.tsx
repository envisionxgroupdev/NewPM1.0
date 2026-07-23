import { useState, useEffect } from "react";
import { Movie, Review } from "../types";
import { X, Play, Bookmark, BookmarkCheck, Star, Send, Trash2, ChevronLeft, ChevronRight, Clock, Calendar, User, ArrowLeft, Film, Bug } from "lucide-react";

// Helper to get beautiful, themed Netflix-style episode metadata based on genre and index
const getEpisodeDetails = (type: "serie" | "anime" | "filme", genres: string[], season: number, epNum: number) => {
  const duration = type === "anime" ? "24 min" : "45 min";
  let title = `Episódio ${epNum}`;
  let overview = `A história se aprofunda no capítulo ${epNum} da ${season}ª temporada. Consequências inesperadas surgem e os personagens enfrentam desafios decisivos.`;
  
  const isSciFi = genres.some(g => ["Ficção Científica", "Ficção científica", "Aventura", "Ação"].includes(g));
  const isAnime = type === "anime";
  
  if (isAnime) {
    const animeTitles = [
      "O Despertar do Poder",
      "O Caminho do Guerreiro",
      "Um Novo Rival Aparece",
      "Treinamento Extremo",
      "A Força da Amizade",
      "Segredos do Passado",
      "A Batalha sob a Chuva",
      "Superando Limites",
      "O Desafio Final",
      "Rumo ao Topo"
    ];
    title = animeTitles[(epNum - 1) % animeTitles.length];
    overview = `Na busca por se tornar o mais forte, o protagonista e seus aliados enfrentam novos desafios intensos e descobrem um poder oculto ancestral adormecido.`;
  } else if (isSciFi) {
    const sciFiTitles = [
      "Impacto Inicial",
      "Linha de Frente",
      "Ponto de Ruptura",
      "Sombra do Passado",
      "Aliança Frágil",
      "Fuga Impossível",
      "Xeque-Mate",
      "Confronto Final",
      "O Novo Começo",
      "Horizonte de Eventos"
    ];
    title = sciFiTitles[(epNum - 1) % sciFiTitles.length];
    overview = `A tensão aumenta consideravelmente no capítulo ${epNum} conforme a tripulação desvenda mistérios de alta tecnologia e ameaças cósmicas iminentes.`;
  } else {
    const dramaTitles = [
      "Segredos e Mentiras",
      "Suspeitas Confirmadas",
      "O Pacto Silencioso",
      "Sem Saída",
      "Revelações Inesperadas",
      "O Labirinto de Emoções",
      "A Verdade Oculta",
      "Destinos Cruzados",
      "Ponto de Não Retorno",
      "Consequências"
    ];
    title = dramaTitles[(epNum - 1) % dramaTitles.length];
    overview = `Neste emocionante episódio, as intrigas se aprofundam e os personagens precisam lidar com escolhas morais difíceis que mudarão suas vidas para sempre.`;
  }
  
  return { title, overview, duration };
};

interface MovieModalProps {
  movie: Movie;
  allMovies: Movie[];
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (movie: Movie) => void;
  onMovieClick: (movie: Movie) => void;
  onOpenReport?: (movie: Movie) => void;
}

const DEFAULT_REVIEWS: Record<string, Omit<Review, "movieId">[]> = {
  interstellar: [
    { id: "rev1", author: "Marcos Lima", rating: 5, comment: "Obra-prima absoluta! A trilha sonora de Hans Zimmer com o órgão de tubos é de chorar. A ficção científica mais precisa e emocionante que já vi.", date: "15/07/2026" },
    { id: "rev2", author: "Clara G.", rating: 5, comment: "Incrível do início ao fim. Christopher Nolan consegue juntar física quântica e amor de pai e filha de uma forma linda.", date: "10/05/2026" }
  ],
  inception: [
    { id: "rev3", author: "Guto Silva", rating: 5, comment: "Sensacional! Roteiro brilhante e efeitos práticos de cair o queixo. O peão ainda está girando?", date: "02/06/2026" }
  ],
  dune2: [
    { id: "rev4", author: "Aline Santos", rating: 5, comment: "Denis Villeneuve é um gênio visual. O design de som e a fotografia de Duna 2 são de outro planeta. Chalamet e Austin Butler estão incríveis.", date: "28/06/2026" }
  ],
  spiderverse: [
    { id: "rev5", author: "Thiago Souza", rating: 5, comment: "A melhor animação da história. Cada frame é um quadro pintado à mão. A trilha sonora é perfeita.", date: "12/07/2026" }
  ]
};

export default function MovieModal({
  movie,
  allMovies,
  onClose,
  isFavorite,
  onToggleFavorite,
  onMovieClick,
  onOpenReport,
}: MovieModalProps) {
  // playerType can be: "none" (cover), "trailer" (YouTube), "superflix" (Superflix API Embed), or "warez" (WarezCDN)
  const [playerType, setPlayerType] = useState<"none" | "trailer" | "superflix" | "warez">("none");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [authorName, setAuthorName] = useState("");

  // Series/Anime Episode and Season selectors
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [episodesPerSeason] = useState(12);

  // Parse maximum seasons from the duration string (e.g. "5 Temps")
  const parseSeasonsCount = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)\s*Temp/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 1;
  };

  // For series and animes, provide up to 10 seasons or parsed duration count
  const parsedCount = parseSeasonsCount(movie.duration);
  const totalSeasons = movie.type === "filme" ? 1 : Math.max(parsedCount, 10);

  // Helper to generate current player stream URL
  const getPlayerIframeSrc = (type: "superflix" | "warez" | "trailer") => {
    if (type === "trailer") {
      return `https://www.youtube.com/embed/${movie.trailerVideoId || "d9MyW72ELq0"}?autoplay=1&enablejsapi=1&rel=0`;
    }
    const idToUse = movie.imdbId || (movie.tmdbId ? String(movie.tmdbId) : null) || "tt0816692";
    if (type === "superflix") {
      if (movie.type === "filme") {
        return `https://superflixapi.pro/filme/${idToUse}`;
      } else if (movie.type === "anime") {
        return `https://superflixapi.pro/anime/${idToUse}/${currentSeason}/${currentEpisode}`;
      } else {
        return `https://superflixapi.pro/serie/${idToUse}/${currentSeason}/${currentEpisode}`;
      }
    } else {
      if (movie.type === "filme") {
        return `https://embed.warezcdn.link/filme/${idToUse}`;
      } else {
        return `https://embed.warezcdn.link/serie/${idToUse}/${currentSeason}/${currentEpisode}`;
      }
    }
  };

  // Reset player when movie shifts
  useEffect(() => {
    setPlayerType("none");
    setCurrentSeason(1);
    setCurrentEpisode(1);

    const stored = localStorage.getItem(`reviews_${movie.id}`);
    if (stored) {
      setReviews(JSON.parse(stored));
    } else {
      const initial = (DEFAULT_REVIEWS[movie.id] || []).map((r) => ({
        ...r,
        movieId: movie.id,
      }));
      setReviews(initial);
      localStorage.setItem(`reviews_${movie.id}`, JSON.stringify(initial));
    }
  }, [movie]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const name = authorName.trim() || "Espectador Anônimo";
    const review: Review = {
      id: `rev_user_${Date.now()}`,
      movieId: movie.id,
      author: name,
      rating: newRating,
      comment: newComment.trim(),
      date: new Date().toLocaleDateString("pt-BR"),
    };

    const updated = [review, ...reviews];
    setReviews(updated);
    localStorage.setItem(`reviews_${movie.id}`, JSON.stringify(updated));
    setNewComment("");
    setAuthorName("");
    setNewRating(5);
  };

  const handleDeleteReview = (id: string) => {
    const updated = reviews.filter((r) => r.id !== id);
    setReviews(updated);
    localStorage.setItem(`reviews_${movie.id}`, JSON.stringify(updated));
  };

  const similarMovies = allMovies
    .filter((m) => m.id !== movie.id && m.type === movie.type && m.genres.some((g) => movie.genres.includes(g)))
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/95 backdrop-blur-md flex justify-center items-start sm:items-center p-0 sm:p-4 md:p-6 animate-fade-in" id={`movie-modal-overlay-${movie.id}`}>
      
      {/* Container Card - Seamless full-viewport on mobile, rounded modal card on desktop */}
      <div className="relative w-full min-h-screen sm:min-h-0 sm:max-h-[92vh] sm:my-auto max-w-5xl bg-[#080808] sm:border sm:border-gray-900/80 sm:rounded-2xl overflow-y-auto shadow-2xl flex flex-col scrollbar-thin" id="modal-scroll-container">
        
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="fixed top-3 right-3 sm:absolute sm:top-4 sm:right-4 z-50 bg-black/85 hover:bg-red-600 text-white p-2.5 rounded-full border border-gray-800 shadow-xl cursor-pointer transition-all hover:scale-105 active:scale-95"
          id="modal-close-btn"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content body */}
        <div className="w-full flex flex-col">
          
          {/* Header Billboard / Video Player Container */}
          <div className="relative w-full aspect-video min-h-[210px] sm:min-h-[340px] md:min-h-[460px] bg-black flex flex-col items-center justify-center border-b border-gray-950">
            {playerType === "trailer" ? (
              <div className="w-full h-full relative bg-black aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailerVideoId}?autoplay=1&enablejsapi=1&rel=0`}
                  title={`${movie.title} Trailer`}
                  className="w-full h-full border-0 absolute inset-0 z-10"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : playerType === "superflix" ? (
              <div className="w-full h-full relative bg-black aspect-video flex flex-col">
                <iframe
                  src={getPlayerIframeSrc("superflix")}
                  title={`${movie.title} Player Principal`}
                  className="w-full h-full border-0 absolute inset-0 z-10"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : playerType === "warez" ? (
              <div className="w-full h-full relative bg-black aspect-video flex flex-col">
                <iframe
                  src={getPlayerIframeSrc("warez")}
                  title={`${movie.title} Player Secundário`}
                  className="w-full h-full border-0 absolute inset-0 z-10"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-full h-full relative flex items-end">
                {/* Background poster backdrop */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-[#080808]/15 z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/90 via-transparent to-transparent hidden md:block z-10" />
                <img
                  src={movie.backdropUrl}
                  alt={movie.title}
                  className="absolute inset-0 w-full h-full object-cover object-center scale-101 filter brightness-50"
                  referrerPolicy="no-referrer"
                />
                
                {/* Immersive Billboard Details */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-8 md:p-10 w-full flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-end">
                  {/* Left-side Widescreen Poster */}
                  <div className="hidden sm:block w-32 md:w-44 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-gray-800/80 shrink-0 transform hover:scale-[1.02] transition-transform duration-300">
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Right-side Description block */}
                  <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2 md:mb-3">
                      <span className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        movie.type === "filme"
                          ? "bg-red-600 text-white"
                          : movie.type === "serie"
                          ? "bg-red-700 text-white"
                          : "bg-amber-500 text-black"
                      }`}>
                        {movie.type}
                      </span>
                      {movie.genres.map((g) => (
                        <span key={g} className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-medium">
                          {g}
                        </span>
                      ))}
                    </div>

                    <h2 className="font-display font-black text-2xl sm:text-3xl md:text-5xl text-white mb-1.5 tracking-tight leading-none drop-shadow-md">
                      {movie.title}
                    </h2>
                    
                    {movie.originalTitle && (
                      <span className="text-xs sm:text-sm text-gray-400 italic block mb-3 font-sans">
                        Título original: {movie.originalTitle}
                      </span>
                    )}

                    <p className="font-sans text-xs text-gray-300 font-medium mb-5 flex flex-wrap items-center gap-2 drop-shadow-sm">
                      <span className="text-amber-500 font-bold flex items-center gap-0.5">⭐ {movie.rating.toFixed(1)} / 10</span>
                      <span className="text-gray-600">•</span>
                      <span className="flex items-center gap-1 text-gray-400"><Calendar className="w-3 h-3" /> {movie.year}</span>
                      <span className="text-gray-600">•</span>
                      <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3 h-3" /> {movie.duration}</span>
                    </p>
                    
                    {/* Primary Streaming Action Row */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          setPlayerType("superflix");
                          const scrollable = document.getElementById("modal-scroll-container");
                          if (scrollable) scrollable.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-full cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all text-xs sm:text-sm shadow-lg shadow-red-600/25 border border-transparent"
                        id="modal-play-primary"
                      >
                        <Play className="w-4 h-4 fill-white text-white" />
                        <span>Player Principal</span>
                      </button>

                      <button
                        onClick={() => {
                          setPlayerType("warez");
                          const scrollable = document.getElementById("modal-scroll-container");
                          if (scrollable) scrollable.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-extrabold px-5 py-2.5 rounded-full cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all text-xs sm:text-sm border border-gray-800"
                        id="modal-play-secondary"
                      >
                        <Play className="w-4 h-4 fill-white text-white" />
                        <span>Player Secundário</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setPlayerType("trailer");
                          const scrollable = document.getElementById("modal-scroll-container");
                          if (scrollable) scrollable.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="flex items-center gap-2 bg-black/80 hover:bg-gray-900 text-gray-300 font-semibold px-4 py-2.5 rounded-full cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all text-xs sm:text-sm border border-gray-800"
                        id="modal-play-trailer"
                      >
                        <Film className="w-4 h-4 text-amber-400" />
                        <span>Trailer</span>
                      </button>

                      <button
                        onClick={() => onToggleFavorite(movie)}
                        className={`flex items-center gap-2 font-semibold px-4 py-2.5 rounded-full border cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all text-xs sm:text-sm ${
                          isFavorite
                            ? "bg-red-600/15 border-red-600 text-red-500"
                            : "bg-black/80 border-gray-800 text-white hover:border-gray-600"
                        }`}
                        id="modal-toggle-list"
                      >
                        {isFavorite ? (
                          <>
                            <BookmarkCheck className="w-4 h-4" />
                            <span>Na Lista</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4" />
                            <span>Salvar Lista</span>
                          </>
                        )}
                      </button>

                      {onOpenReport && (
                        <button
                          onClick={() => onOpenReport(movie)}
                          className="flex items-center gap-2 font-bold px-4 py-2.5 rounded-full border border-amber-800/60 bg-amber-950/20 text-amber-400 hover:text-amber-300 hover:bg-amber-900/40 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all text-xs sm:text-sm shadow-md"
                          id="modal-report-movie-btn"
                          title="Reportar problema ou bug neste título"
                        >
                          <Bug className="w-4 h-4 text-amber-400" />
                          <span>Reportar Bug</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Embedded Server Switcher and Navigation Controller */}
          {playerType !== "none" && (
            <div className="bg-[#0b0b0b] border-b border-gray-950 px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 z-30 relative shadow-md">
              
              {/* Server switch tabs */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black mr-1">Opções:</span>
                
                <button
                  onClick={() => setPlayerType("superflix")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playerType === "superflix"
                      ? "bg-red-600/10 border border-red-500/30 text-red-500 shadow-md shadow-red-500/5"
                      : "bg-[#111] border border-gray-900 text-gray-400 hover:text-white hover:bg-[#151515]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Player Principal</span>
                </button>

                <button
                  onClick={() => setPlayerType("warez")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playerType === "warez"
                      ? "bg-red-600/10 border border-red-500/30 text-red-500 shadow-md shadow-red-500/5"
                      : "bg-[#111] border border-gray-900 text-gray-400 hover:text-white hover:bg-[#151515]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span>Player Secundário</span>
                </button>

                <button
                  onClick={() => setPlayerType("trailer")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playerType === "trailer"
                      ? "bg-amber-600/10 border border-amber-500/30 text-amber-500"
                      : "bg-[#111] border border-gray-900 text-gray-400 hover:text-white hover:bg-[#151515]"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Trailer</span>
                </button>
              </div>

              {/* Active Player Status / Episode Navigation */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {movie.type !== "filme" && (playerType === "superflix" || playerType === "warez") && (
                  <div className="flex items-center bg-black border border-gray-900 rounded-lg overflow-hidden p-1 gap-1">
                    <button
                      disabled={currentEpisode <= 1}
                      onClick={() => {
                        setCurrentEpisode((prev) => Math.max(1, prev - 1));
                        const scrollable = document.getElementById("modal-scroll-container");
                        if (scrollable) scrollable.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-1 rounded text-white hover:bg-[#141414] disabled:opacity-20 cursor-pointer transition-colors"
                      title="Episódio Anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="px-2.5 py-0.5 font-mono text-xs font-black text-red-500 bg-[#070707] rounded border border-gray-900 text-center">
                      T{currentSeason} : E{currentEpisode}
                    </span>

                    <button
                      onClick={() => {
                        setCurrentEpisode((prev) => prev + 1);
                        const scrollable = document.getElementById("modal-scroll-container");
                        if (scrollable) scrollable.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-1 rounded text-white hover:bg-[#141414] cursor-pointer transition-colors"
                      title="Próximo Episódio"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Back button to Details Cover */}
                <button
                  onClick={() => setPlayerType("none")}
                  className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white border border-gray-900 hover:border-gray-800 px-3.5 py-1.5 rounded-lg bg-black cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar</span>
                </button>
              </div>
            </div>
          )}

          {/* Detailed Info Grid */}
          <div className="p-5 sm:p-8 md:p-10 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
            
            {/* Left/Middle Column (Synopsis and Episodes) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Synopsis Section */}
              <div className="space-y-3">
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-white flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-red-600 rounded" />
                  <span>Sinopse</span>
                </h3>
                <p className="font-sans text-gray-300 text-sm leading-relaxed antialiased">
                  {movie.synopsis}
                </p>
              </div>

              {/* Episodes Section (Only for series or anime) */}
              {movie.type !== "filme" && (
                <div className="pt-8 border-t border-gray-900/80 space-y-6">
                  
                  {/* Series Header & Season Tabs */}
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-red-600 rounded" />
                        <h3 className="font-display font-extrabold text-lg sm:text-xl text-white">
                          Episódios
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-gray-400 bg-gray-900 border border-gray-800 px-3 py-1 rounded-full">
                        {totalSeasons} {totalSeasons === 1 ? "Temporada" : "Temporadas"}
                      </span>
                    </div>

                    {/* Season Navigation Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                      {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setCurrentSeason(s);
                            setCurrentEpisode(1);
                          }}
                          className={`px-4 py-2 rounded-xl font-extrabold text-xs shrink-0 cursor-pointer transition-all ${
                            currentSeason === s
                              ? "bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105"
                              : "bg-[#0f0f0f] border border-gray-900 text-gray-400 hover:text-white hover:border-gray-800"
                          }`}
                        >
                          {s}ª Temporada
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Episode List Cards - Ultra Clean Netflix Style */}
                  <div className="space-y-3">
                    {Array.from({ length: episodesPerSeason }, (_, i) => {
                      const epNum = i + 1;
                      const details = getEpisodeDetails(movie.type, movie.genres, currentSeason, epNum);
                      const isCurrentlyPlaying = (playerType === "superflix" || playerType === "warez") && currentEpisode === epNum;

                      return (
                        <div
                          key={epNum}
                          onClick={() => {
                            setCurrentEpisode(epNum);
                            if (playerType === "none" || playerType === "trailer") {
                              setPlayerType("superflix");
                            }
                            const scrollable = document.getElementById("modal-scroll-container");
                            if (scrollable) {
                              scrollable.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                          className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer group select-none ${
                            isCurrentlyPlaying
                              ? "bg-red-600/10 border-red-600/50 shadow-lg shadow-red-600/10"
                              : "bg-[#0b0b0b] border border-gray-900/80 hover:bg-[#121212] hover:border-gray-800"
                          }`}
                        >
                          {/* Thumbnail Frame */}
                          <div className="relative w-full sm:w-36 aspect-video bg-[#0f0f0f] rounded-xl overflow-hidden shrink-0 border border-gray-900 shadow-md">
                            <img
                              src={movie.backdropUrl}
                              alt={details.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 filter brightness-90 group-hover:brightness-100"
                              referrerPolicy="no-referrer"
                            />
                            {/* Play overlay hover indicator */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <div className="bg-red-600 text-white p-2.5 rounded-full shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                                <Play className="w-4 h-4 fill-white text-white" />
                              </div>
                            </div>

                            {/* Active Playing Banner */}
                            {isCurrentlyPlaying && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                                <span className="bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md animate-pulse">
                                  <Play className="w-3 h-3 fill-white" />
                                  <span>ASSISTINDO</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Episode Text Info */}
                          <div className="flex-grow min-w-0 space-y-1 w-full">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-black text-red-500">
                                EP {String(epNum).padStart(2, '0')}
                              </span>
                              <span className="font-mono text-[10px] text-gray-400 bg-black border border-gray-900 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-gray-500" />
                                {details.duration}
                              </span>
                            </div>

                            <h4 className={`font-display font-bold text-sm sm:text-base transition-colors ${
                              isCurrentlyPlaying ? "text-red-400" : "text-white group-hover:text-red-400"
                            }`}>
                              {details.title}
                            </h4>

                            <p className="font-sans text-xs text-gray-400 line-clamp-2 leading-relaxed antialiased">
                              {details.overview}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reviews and Ratings Section */}
              <div className="pt-8 border-t border-gray-900/80 space-y-6">
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-white flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-amber-500 rounded" />
                  <span>Avaliações & Críticas</span>
                  <span className="font-mono text-xs bg-gray-900 text-gray-400 px-2.5 py-0.5 rounded-full font-bold">
                    {reviews.length}
                  </span>
                </h3>

                {/* Create a beautiful review form */}
                <form onSubmit={handleSubmitReview} className="bg-[#0b0b0b] p-5 rounded-2xl border border-gray-900/80 space-y-4 shadow-xl" id="review-form">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Sua opinião importa</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nome do Crítico</label>
                      <input
                        type="text"
                        placeholder="Seu nome (opcional)"
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        className="bg-[#050505] border border-gray-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-600 transition-colors w-full"
                        id="review-author"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Sua classificação</label>
                      <div className="flex items-center h-[42px] gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewRating(star)}
                            className="p-1 cursor-pointer hover:scale-110 transition-all"
                            id={`star-btn-${star}`}
                          >
                            <Star
                              className={`w-5 h-5 ${
                                newRating >= star ? "fill-amber-400 text-amber-400" : "text-gray-700"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      placeholder="O que você achou deste título? Escreva sua opinião honesta..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="bg-[#050505] border border-gray-900 rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors w-full pr-14 leading-relaxed"
                      id="review-comment"
                      required
                    />
                    <button
                      type="submit"
                      className="absolute right-3 bottom-3 bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg cursor-pointer transition-all shadow-md shadow-red-600/10 hover:scale-105 active:scale-95"
                      id="review-submit-btn"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Reviews List */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                  {reviews.length === 0 ? (
                    <div className="bg-[#080808] border border-gray-950 p-6 rounded-xl text-center italic text-xs text-gray-500">
                      Nenhuma crítica registrada ainda. Seja o primeiro a comentar sobre este título!
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="bg-black/30 border border-gray-950 hover:border-gray-900/60 p-4 rounded-xl flex gap-4 transition-all group">
                        {/* Critic Score Card */}
                        <div className="flex flex-col items-center justify-center bg-gray-950/80 px-3 py-2 rounded-lg h-fit shrink-0 border border-gray-900/40 min-w-[50px]">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-mono text-sm font-black text-white mt-1">{rev.rating}.0</span>
                        </div>
                        {/* Critic Details */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-display font-extrabold text-xs sm:text-sm text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-500" />
                              <span>{rev.author}</span>
                            </span>
                            <span className="font-mono text-[9px] text-gray-500">{rev.date}</span>
                          </div>
                          <p className="font-sans text-xs text-gray-300 leading-relaxed text-justify">
                            {rev.comment}
                          </p>
                        </div>
                        {/* Custom Author Deletion Button */}
                        {rev.id.startsWith("rev_user_") && (
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="text-gray-700 hover:text-red-500 p-1.5 rounded-lg hover:bg-[#111] transition-colors self-start opacity-0 group-hover:opacity-100 shrink-0"
                            title="Apagar avaliação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (Specifications Sidebar) */}
            <div className="space-y-6 lg:border-l lg:border-gray-900/60 lg:pl-8">
              
              {/* Technical Specifications block */}
              <div className="bg-[#0b0b0b] border border-gray-900/80 p-5 rounded-2xl space-y-4 shadow-md">
                <h4 className="font-display font-extrabold text-sm text-white border-b border-gray-900 pb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-red-600 rounded" />
                  <span>Ficha Técnica</span>
                </h4>
                <div className="space-y-3.5 text-xs">
                  <div className="flex items-start justify-between py-1 border-b border-gray-950">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Diretor</span>
                    <span className="text-gray-200 font-medium text-right ml-4">{movie.director}</span>
                  </div>

                  <div className="flex items-start justify-between py-1 border-b border-gray-950">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Duração</span>
                    <span className="text-gray-200 font-medium text-right ml-4">{movie.duration}</span>
                  </div>

                  <div className="flex items-start justify-between py-1 border-b border-gray-950">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Ano Lançamento</span>
                    <span className="text-gray-200 font-medium text-right ml-4">{movie.year}</span>
                  </div>

                  <div className="flex items-start justify-between py-1 border-b border-gray-950">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Avaliação TMDB</span>
                    <span className="text-amber-500 font-mono font-black flex items-center gap-0.5">
                      ⭐ {movie.rating.toFixed(1)} / 10
                    </span>
                  </div>
                </div>
              </div>

              {/* Cast block */}
              <div className="space-y-3">
                <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-red-600 rounded" />
                  <span>Elenco Principal</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {movie.cast.map((actor) => (
                    <span
                      key={actor}
                      className="text-[11px] bg-black border border-gray-900 text-gray-300 px-3 py-1.5 rounded-full font-sans font-medium transition-colors hover:border-gray-700"
                    >
                      {actor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Similar Suggestions */}
              {similarMovies.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-900/80">
                  <h4 className="font-display font-extrabold text-sm text-white flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-amber-500 rounded" />
                    <span>Sugestões Similares</span>
                  </h4>
                  <div className="space-y-2.5">
                    {similarMovies.map((similar) => (
                      <div
                        key={similar.id}
                        onClick={() => {
                          onMovieClick(similar);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/60 border border-transparent hover:border-gray-900 cursor-pointer group transition-all"
                        id={`similar-movie-${similar.id}`}
                      >
                        <div className="w-10 h-14 bg-gray-950 rounded-lg overflow-hidden shrink-0 shadow border border-gray-900">
                          <img
                            src={similar.posterUrl}
                            alt={similar.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-display font-extrabold text-xs text-white group-hover:text-red-500 truncate transition-colors">
                            {similar.title}
                          </h5>
                          <span className="font-mono text-[9px] text-gray-500 flex items-center gap-1.5 mt-1">
                            <span>{similar.year}</span>
                            <span>•</span>
                            <span className="text-amber-500 font-bold">★ {similar.rating.toFixed(1)}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
