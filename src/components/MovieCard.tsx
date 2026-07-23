import React from "react";
import { Movie } from "../types";
import { Play, Star, Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface MovieCardProps {
  movie: Movie;
  onMovieClick: (movie: Movie) => void;
  isFavorite: boolean;
  onToggleFavorite: (movie: Movie, e: React.MouseEvent) => void;
  isRecent?: boolean;
}

export default function MovieCard({
  movie,
  onMovieClick,
  isFavorite,
  onToggleFavorite,
  isRecent,
}: MovieCardProps) {
  return (
    <motion.div
      layout
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25 }}
      className="group relative flex flex-col bg-dark-card rounded-xl overflow-hidden border border-gray-800/60 hover:border-brand-primary/40 shadow-lg cursor-pointer h-full"
      onClick={() => onMovieClick(movie)}
      id={`movie-card-${movie.id}`}
    >
      {/* Poster Image Cover */}
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Recent / New arrival badge overlay */}
        {isRecent && (
          <div className="absolute top-2.5 left-2.5 z-10 bg-gradient-to-r from-red-600 to-amber-500 text-white font-display text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md shadow-red-950/45 flex items-center gap-1 border border-white/10">
            <Sparkles className="w-2.5 h-2.5 text-amber-200 animate-pulse" />
            <span>Recém Chegado</span>
          </div>
        )}

        {/* Favorite Bookmark Button overlay */}
        <button
          onClick={(e) => onToggleFavorite(movie, e)}
          className={`absolute top-2.5 right-2.5 z-10 p-2 rounded-full backdrop-blur-md border cursor-pointer hover:scale-110 active:scale-90 transition-all ${
            isFavorite
              ? "bg-brand-primary text-white border-brand-primary shadow-md shadow-red-600/35"
              : "bg-black/60 border-white/10 text-white hover:bg-black/95 hover:border-white/30"
          }`}
          id={`movie-card-fav-btn-${movie.id}`}
          title={isFavorite ? "Remover da minha lista" : "Adicionar à minha lista"}
        >
          {isFavorite ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>

        {/* Play Icon / Details Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <div className="bg-brand-primary text-white p-3.5 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-white pl-0.5" />
          </div>
        </div>

        {/* Rating and Type Badge Overlay */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between">
          <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-bold font-mono text-red-500">
            <Star className="w-3 h-3 fill-red-500 text-red-500" />
            <span>{movie.rating.toFixed(1)}</span>
          </div>
          <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-md text-[9px] font-bold text-gray-300 uppercase tracking-wider">
            {movie.type}
          </div>
        </div>
      </div>

      {/* Movie Details (Bottom block) */}
      <div className="p-3.5 flex flex-col flex-grow">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-mono text-[10px] text-gray-500 font-medium">
            {movie.year} • {movie.duration}
          </span>
        </div>
        <h3 className="font-display font-bold text-sm text-white group-hover:text-brand-primary line-clamp-1 transition-colors mb-1">
          {movie.title}
        </h3>
        <p className="font-sans text-[11px] text-gray-400 line-clamp-2 leading-normal flex-grow mb-2">
          {movie.synopsis}
        </p>

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-1 mt-auto overflow-hidden max-h-[18px]">
          {movie.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="text-[9px] font-sans font-medium bg-gray-900 text-gray-300 px-1.5 py-0.5 rounded"
            >
              {genre}
            </span>
          ))}
          {movie.genres.length > 2 && (
            <span className="text-[9px] font-sans font-medium text-gray-500 px-1 py-0.5">
              +{movie.genres.length - 2}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
