import { useState, useEffect } from "react";
import { Movie } from "../types";
import { Play, Info, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeroCarouselProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  favorites: string[];
  onToggleFavorite: (movie: Movie) => void;
}

export default function HeroCarousel({
  movies,
  onMovieClick,
  favorites,
  onToggleFavorite,
}: HeroCarouselProps) {
  const featuredMovies = movies.filter((m) => m.featured) || movies;
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredMovies.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featuredMovies.length) % featuredMovies.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featuredMovies.length);
  };

  if (featuredMovies.length === 0) return null;

  const currentMovie = featuredMovies[currentIndex];
  const isFavorite = favorites.includes(currentMovie.id);

  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] overflow-hidden bg-black border-b border-gray-900" id="hero-carousel-container">
      {/* Background Image / Blur */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovie.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent z-10" />
          <img
            src={currentMovie.backdropUrl}
            alt={currentMovie.title}
            className="w-full h-full object-cover object-center scale-102 filter brightness-85"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Slide Navigation Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand-primary text-white p-2.5 rounded-full backdrop-blur-sm border border-white/10 hover:border-brand-primary transition-all cursor-pointer hidden md:block"
        id="hero-btn-prev"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand-primary text-white p-2.5 rounded-full backdrop-blur-sm border border-white/10 hover:border-brand-primary transition-all cursor-pointer hidden md:block"
        id="hero-btn-next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Content Info */}
      <div className="absolute bottom-12 left-4 md:left-12 z-20 max-w-2xl px-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMovie.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
          >
            {/* Rating and Genre badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="bg-brand-primary/20 border border-brand-primary/40 text-brand-primary font-mono text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm">
                ★ {currentMovie.rating.toFixed(1)}
              </span>
              <span className="bg-gray-900/90 border border-gray-800 text-gray-300 font-sans text-xs font-semibold px-2.5 py-1 rounded-md">
                {currentMovie.year}
              </span>
              <span className="bg-gray-900/90 border border-gray-800 text-gray-300 font-sans text-xs font-semibold px-2.5 py-1 rounded-md">
                {currentMovie.duration}
              </span>
              <span className="bg-red-950/45 border border-red-900/40 text-red-400 font-sans text-xs font-semibold px-2.5 py-1 rounded-md uppercase tracking-wider">
                {currentMovie.type}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display font-extrabold text-4xl md:text-6xl text-white mb-3 tracking-tight leading-tight">
              {currentMovie.title}
            </h1>

            {/* Original title if any */}
            {currentMovie.originalTitle && currentMovie.originalTitle !== currentMovie.title && (
              <h2 className="font-sans text-gray-400 text-sm md:text-base font-medium mb-4 italic">
                Título original: {currentMovie.originalTitle}
              </h2>
            )}

            {/* Synopsis */}
            <p className="font-sans text-gray-300 text-sm md:text-base mb-6 leading-relaxed line-clamp-3 md:line-clamp-4">
              {currentMovie.synopsis}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onMovieClick(currentMovie)}
                className="flex items-center gap-2 bg-brand-primary hover:bg-brand-secondary text-white font-semibold px-6 py-3 rounded-full shadow-lg shadow-red-600/20 cursor-pointer hover:scale-103 active:scale-97 transition-all text-sm md:text-base border border-transparent hover:border-red-500"
                id={`hero-btn-play-${currentMovie.id}`}
              >
                <Play className="w-5 h-5 fill-white text-white" />
                <span>Assistir Agora</span>
              </button>
              <button
                onClick={() => onMovieClick(currentMovie)}
                className="flex items-center gap-2 bg-gray-950/80 hover:bg-gray-900 text-white font-semibold px-5 py-3 rounded-full border border-gray-800 backdrop-blur-sm cursor-pointer hover:scale-103 active:scale-97 transition-all text-sm"
                id={`hero-btn-info-${currentMovie.id}`}
              >
                <Info className="w-4.5 h-4.5" />
                <span>Mais Detalhes</span>
              </button>
              <button
                onClick={() => onToggleFavorite(currentMovie)}
                className={`p-3 rounded-full border cursor-pointer hover:scale-103 active:scale-97 transition-all ${
                  isFavorite
                    ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                    : "bg-gray-950/85 border-gray-800 text-white hover:border-gray-500"
                }`}
                title={isFavorite ? "Remover da minha lista" : "Adicionar à minha lista"}
                id={`hero-btn-fav-${currentMovie.id}`}
              >
                {isFavorite ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Carousel Dot Indicators */}
      <div className="absolute bottom-4 right-4 md:right-12 z-20 flex items-center gap-1.5">
        {featuredMovies.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
              currentIndex === index ? "w-6 bg-brand-primary" : "w-2 bg-gray-700 hover:bg-gray-500"
            }`}
            title={`Slide ${index + 1}`}
            id={`carousel-dot-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
