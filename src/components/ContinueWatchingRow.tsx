import React, { useRef } from "react";
import { ContinueWatchingItem, Movie } from "../types";
import { Play, RotateCcw, Trash2, ChevronLeft, ChevronRight, Tv, Film, Clock, X } from "lucide-react";
import { motion } from "motion/react";
import LazyImage from "./LazyImage";

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
  onSelect: (movie: Movie, continueData?: ContinueWatchingItem) => void;
  onRemove: (movieId: string, e: React.MouseEvent) => void;
  onClearAll?: () => void;
}

export default function ContinueWatchingRow({
  items,
  onSelect,
  onRemove,
  onClearAll,
}: ContinueWatchingRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: "left" | "right") => {
    if (rowRef.current) {
      const scrollAmount = direction === "left" ? -480 : 480;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="relative mb-10 group/row" id="continue-watching-row-container">
      {/* Row Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-600/15 border border-red-500/30 text-red-500 shadow-md shadow-red-600/10">
            <RotateCcw className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-lg md:text-xl text-white tracking-tight">
                Continuar Assistindo
              </h2>
              <span className="bg-red-600/20 text-red-400 border border-red-500/30 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? "título" : "títulos"}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans hidden sm:block">
              Retome de onde você parou no seu último reprodutor
            </p>
          </div>
        </div>

        {/* Clear All & Scroll Arrows */}
        <div className="flex items-center gap-2">
          {onClearAll && items.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border border-transparent hover:border-red-900/50 hover:bg-red-950/20 transition-all cursor-pointer mr-1"
              title="Limpar todo o histórico de navegação"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar Histórico</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScroll("left")}
              className="p-2 rounded-full bg-black/80 hover:bg-red-600 text-gray-300 hover:text-white border border-gray-800 transition-all cursor-pointer shadow-md active:scale-90"
              title="Rolar para esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll("right")}
              className="p-2 rounded-full bg-black/80 hover:bg-red-600 text-gray-300 hover:text-white border border-gray-800 transition-all cursor-pointer shadow-md active:scale-90"
              title="Rolar para direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Slider Track */}
      <div
        ref={rowRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {items.map((item) => {
          const { movie } = item;
          if (!movie) return null;

          const isSeries = movie.type !== "filme";

          return (
            <motion.div
              key={`continue-${movie.id}`}
              layout
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelect(movie, item)}
              className="group relative flex-none w-[240px] sm:w-[280px] bg-[#0c0c0c] rounded-xl overflow-hidden border border-gray-800/80 hover:border-red-600/60 shadow-xl cursor-pointer snap-start flex flex-col"
              id={`continue-card-${movie.id}`}
            >
              {/* Media Thumbnail Container */}
              <div className="relative aspect-video w-full bg-gray-950 overflow-hidden">
                <LazyImage
                  src={movie.backdropUrl || movie.posterUrl}
                  fallbackSrc={movie.posterUrl || movie.backdropUrl}
                  alt={movie.title}
                  containerClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90 group-hover:brightness-100"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  rootMargin="300px"
                />

                {/* Top Overlay Gradient */}
                <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />

                {/* Bottom Overlay Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0c0c0c] via-[#0c0c0c]/80 to-transparent pointer-events-none" />

                {/* Top Info Tag: Episode or Type */}
                <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                  {isSeries ? (
                    <span className="bg-red-600 font-mono text-[10px] font-black text-white px-2 py-0.5 rounded uppercase tracking-wider shadow-md shadow-red-950/60 border border-red-400/30 flex items-center gap-1">
                      <Tv className="w-3 h-3" />
                      <span>T{item.season || 1} : E{item.episode || 1}</span>
                    </span>
                  ) : (
                    <span className="bg-black/80 backdrop-blur-md font-mono text-[10px] font-bold text-gray-200 px-2 py-0.5 rounded uppercase tracking-wider border border-white/10 flex items-center gap-1">
                      <Film className="w-3 h-3 text-red-500" />
                      <span>Filme</span>
                    </span>
                  )}
                </div>

                {/* Remove / Delete Button */}
                <button
                  onClick={(e) => onRemove(movie.id, e)}
                  className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-gray-400 hover:text-white border border-gray-700/80 transition-all cursor-pointer hover:scale-110 active:scale-90"
                  title="Remover do histórico 'Continuar Assistindo'"
                  id={`remove-continue-${movie.id}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Center Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 z-10">
                  <div className="bg-red-600 text-white px-4 py-2 rounded-full font-black text-xs flex items-center gap-2 shadow-xl shadow-red-600/40 border border-red-400/40 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>Continuar</span>
                  </div>
                </div>

                {/* Progress Bar Container at the bottom of thumbnail */}
                <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-gray-300 mb-1">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-3 h-3 text-red-500" />
                      {item.progressPercent}% assistido
                    </span>
                    <span className="text-red-400 uppercase text-[9px] font-black">
                      {item.playerType === "warez" ? "Player 2" : item.playerType === "trailer" ? "Trailer" : "Player 1"}
                    </span>
                  </div>
                  {/* Outer Bar */}
                  <div className="w-full h-1.5 bg-gray-800/90 rounded-full overflow-hidden border border-white/5">
                    {/* Inner Progress Bar */}
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full shadow-sm shadow-red-500/50 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(item.progressPercent || 25, 5), 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Title & Description Block */}
              <div className="p-3.5 flex flex-col flex-grow justify-between bg-[#0c0c0c]">
                <div>
                  <h3 className="font-display font-bold text-sm text-white group-hover:text-red-500 line-clamp-1 transition-colors mb-0.5">
                    {movie.title}
                  </h3>
                  <p className="font-sans text-[11px] text-gray-400 line-clamp-1 leading-snug">
                    {isSeries ? `Temporada ${item.season || 1}, Episódio ${item.episode || 1}` : `${movie.year} • ${movie.duration}`}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
