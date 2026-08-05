import { useState, useEffect, useRef } from "react";
import { Movie } from "../types";
import { Play, Info, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LazyImage from "./LazyImage";

interface HeroCarouselProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  favorites: string[];
  onToggleFavorite: (movie: Movie) => void;
  currentUser?: any;
}

export default function HeroCarousel({
  movies,
  onMovieClick,
  favorites,
  onToggleFavorite,
}: HeroCarouselProps) {
  const featured = (movies || []).filter((m) => m && m.featured);
  const featuredMovies = featured.length > 0 ? featured : (movies || []).slice(0, 6);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to reset autoplay timer when user manually interacts
  const startAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (featuredMovies.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 7000);
  };

  useEffect(() => {
    startAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [featuredMovies.length]);

  const handlePrev = () => {
    if (featuredMovies.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
    startAutoplay();
  };

  const handleNext = () => {
    if (featuredMovies.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    startAutoplay();
  };

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    startAutoplay();
  };

  if (featuredMovies.length === 0) return null;

  const currentMovie = featuredMovies[currentIndex] || featuredMovies[0];
  if (!currentMovie || !currentMovie.id) return null;
  const isFavorite = favorites.includes(currentMovie.id);
  const backdropImage = currentMovie.backdropUrl || currentMovie.posterUrl || "";

  return (
    <div 
      className="relative w-full h-[65vh] min-h-[500px] max-h-[800px] md:h-[75vh] lg:h-[82vh] overflow-hidden bg-black border-b border-gray-900 group" 
      id="hero-carousel-container"
    >
      {/* Background Image with Crossfade */}
      <AnimatePresence initial={false}>
        <motion.div
          key={currentMovie.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute inset-0 w-full h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent z-10" />
          <LazyImage
            src={backdropImage}
            alt={currentMovie.title}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover object-top md:object-center filter brightness-90"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrow Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-brand-primary text-white p-2 sm:p-3 rounded-full backdrop-blur-md border border-white/10 hover:border-brand-primary transition-all cursor-pointer shadow-lg active:scale-95"
        id="hero-btn-prev"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 bg-black/50 hover:bg-brand-primary text-white p-2 sm:p-3 rounded-full backdrop-blur-md border border-white/10 hover:border-brand-primary transition-all cursor-pointer shadow-lg active:scale-95"
        id="hero-btn-next"
        aria-label="Próximo slide"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Hero Content Information Container */}
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-8 md:p-12 lg:p-16 pb-12 sm:pb-16 max-w-4xl pointer-events-none">
        <motion.div
          key={`content-${currentMovie.id}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="pointer-events-auto space-y-3 sm:space-y-4"
        >
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {typeof currentMovie.rating === "number" && (
              <span className="bg-brand-primary/20 border border-brand-primary/40 text-brand-primary font-mono text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                ★ {currentMovie.rating.toFixed(1)}
              </span>
            )}
            {currentMovie.year && (
              <span className="bg-gray-900/90 border border-gray-800 text-gray-300 font-sans text-xs font-semibold px-2.5 py-1 rounded-md">
                {currentMovie.year}
              </span>
            )}
            {currentMovie.duration && (
              <span className="bg-gray-900/90 border border-gray-800 text-gray-300 font-sans text-xs font-semibold px-2.5 py-1 rounded-md">
                {currentMovie.duration}
              </span>
            )}
            {currentMovie.type && (
              <span className="bg-red-950/60 border border-red-900/50 text-red-400 font-sans text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                {currentMovie.type}
              </span>
            )}
            {Array.isArray(currentMovie.genres) && currentMovie.genres.length > 0 && (
              <span className="bg-gray-900/80 border border-gray-800 text-gray-400 font-sans text-xs font-medium px-2 py-1 rounded-md hidden sm:inline-block">
                {currentMovie.genres.slice(0, 2).join(" • ")}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-tight drop-shadow-md">
            {currentMovie.title}
          </h1>

          {/* Original Title */}
          {currentMovie.originalTitle && currentMovie.originalTitle !== currentMovie.title && (
            <h2 className="font-sans text-gray-400 text-xs sm:text-sm font-medium italic -mt-1">
              Título original: {currentMovie.originalTitle}
            </h2>
          )}

          {/* Synopsis */}
          <p className="font-sans text-gray-300 text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed line-clamp-2 sm:line-clamp-3 md:line-clamp-4 drop-shadow">
            {currentMovie.synopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
            <button
              onClick={() => onMovieClick(currentMovie)}
              className="flex items-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg shadow-red-600/30 cursor-pointer hover:scale-103 active:scale-97 transition-all text-xs sm:text-sm md:text-base border border-transparent hover:border-red-400"
              id={`hero-btn-play-${currentMovie.id}`}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white text-white shrink-0" />
              <span>Assistir Agora</span>
            </button>

            <button
              onClick={() => onMovieClick(currentMovie)}
              className="flex items-center gap-2 bg-gray-950/80 hover:bg-gray-900 text-white font-semibold px-4 sm:px-5 py-2.5 sm:py-3 rounded-full border border-gray-800 backdrop-blur-md cursor-pointer hover:scale-103 active:scale-97 transition-all text-xs sm:text-sm"
              id={`hero-btn-info-${currentMovie.id}`}
            >
              <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-300 shrink-0" />
              <span>Mais Detalhes</span>
            </button>

            <button
              onClick={() => onToggleFavorite(currentMovie)}
              className={`p-2.5 sm:p-3 rounded-full border cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                isFavorite
                  ? "bg-brand-primary/20 border-brand-primary text-brand-primary shadow-md shadow-red-600/20"
                  : "bg-gray-950/80 border-gray-800 text-white hover:border-gray-500 hover:bg-gray-900"
              }`}
              title={isFavorite ? "Remover da minha lista" : "Adicionar à minha lista"}
              id={`hero-btn-fav-${currentMovie.id}`}
            >
              {isFavorite ? (
                <BookmarkCheck className="w-4 h-4 sm:w-5 sm:h-5 text-brand-primary" />
              ) : (
                <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom Carousel Dots */}
      <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-8 md:right-12 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
        {featuredMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
              currentIndex === index
                ? "w-6 bg-brand-primary shadow-sm shadow-red-600/50"
                : "w-2 bg-gray-600 hover:bg-gray-400"
            }`}
            title={`Ir para o slide ${index + 1}`}
            id={`carousel-dot-${index}`}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
