import React, { useRef } from "react";
import { Movie } from "../types";
import MovieCard from "./MovieCard";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

interface NetflixRowProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  favorites: string[];
  onToggleFavorite: (movie: Movie, e: React.MouseEvent) => void;
  recentMovieIds?: Set<string>;
  onSeeAll?: () => void;
  seeAllLabel?: string;
  badge?: string;
  maxItems?: number;
}

export default function NetflixRow({
  title,
  subtitle,
  icon,
  movies,
  onMovieClick,
  favorites,
  onToggleFavorite,
  recentMovieIds,
  onSeeAll,
  seeAllLabel = "Ver Todos",
  badge,
  maxItems = 20,
}: NetflixRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === "left" ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (movies.length === 0) return null;

  // Limit display to max 20 items per row
  const displayedMovies = movies.slice(0, maxItems);
  const remainingCount = movies.length - displayedMovies.length;

  return (
    <section className="mb-10 relative group/row">
      {/* Row Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          {icon && <div className="text-brand-primary">{icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-lg md:text-xl text-white tracking-tight">
                {title}
              </h2>
              {badge && (
                <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-400 font-sans mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-white hover:bg-brand-primary transition-all cursor-pointer group/btn bg-red-950/40 border border-red-900/40 px-3 py-1.5 rounded-xl shadow-sm"
          >
            <span>{seeAllLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
          </button>
        )}
      </div>

      {/* Scrollable Container Wrapper with Controls */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-brand-primary text-white p-2.5 rounded-r-2xl backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-300 shadow-2xl hidden md:flex items-center justify-center cursor-pointer hover:scale-110 border-y border-r border-white/10"
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Cards Row */}
        <div
          ref={rowRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 px-1 snap-x snap-mandatory"
        >
          {displayedMovies.map((movie) => (
            <div
              key={movie.id}
              className="w-36 sm:w-44 md:w-52 shrink-0 snap-start transition-transform duration-300"
            >
              <MovieCard
                movie={movie}
                onMovieClick={onMovieClick}
                isFavorite={favorites.includes(movie.id)}
                onToggleFavorite={onToggleFavorite}
                isRecent={recentMovieIds?.has(movie.id)}
              />
            </div>
          ))}

          {/* 'Ver Todos' Card at end of row */}
          {onSeeAll && (
            <div
              onClick={onSeeAll}
              className="w-36 sm:w-44 md:w-52 shrink-0 snap-start flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-[#111111] border border-gray-800 hover:border-brand-primary rounded-2xl p-4 cursor-pointer text-center group/card transition-all hover:scale-[1.03] min-h-[220px] sm:min-h-[260px] shadow-xl my-1"
            >
              <div className="w-12 h-12 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center mb-3 group-hover/card:scale-110 group-hover/card:bg-brand-primary group-hover/card:text-white transition-all shadow-lg shadow-red-600/20">
                <ArrowRight className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-xs sm:text-sm text-white group-hover/card:text-brand-primary transition-colors leading-tight">
                {seeAllLabel || "Ver Todos"}
              </span>
              {remainingCount > 0 && (
                <span className="text-[10px] sm:text-xs text-gray-400 mt-1 font-mono font-medium">
                  +{remainingCount} {remainingCount === 1 ? "título" : "títulos"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-brand-primary text-white p-2.5 rounded-l-2xl backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-300 shadow-2xl hidden md:flex items-center justify-center cursor-pointer hover:scale-110 border-y border-l border-white/10"
          aria-label="Rolar para direita"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}
