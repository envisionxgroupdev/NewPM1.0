import React, { useState } from "react";
import { Movie } from "../types";
import { X, Save, Trash2, Sparkles, Loader2, Film, Check, AlertCircle } from "lucide-react";
import { saveMovieToFirestore, deleteMovieFromFirestore } from "../lib/firebase";
import { extractYouTubeId, fetchTrailerFromBackend } from "../utils/trailer";

interface EditMovieModalProps {
  movie: Movie;
  onClose: () => void;
  onSaveSuccess?: (updatedMovie: Movie) => void;
  onDeleteSuccess?: (deletedMovieId: string) => void;
}

export default function EditMovieModal({
  movie,
  onClose,
  onSaveSuccess,
  onDeleteSuccess,
}: EditMovieModalProps) {
  const [title, setTitle] = useState(movie.title || "");
  const [originalTitle, setOriginalTitle] = useState(movie.originalTitle || "");
  const [type, setType] = useState<"filme" | "serie" | "anime">(movie.type || "filme");
  const [year, setYear] = useState(movie.year || 2026);
  const [duration, setDuration] = useState(movie.duration || "120 min");
  const [rating, setRating] = useState(movie.rating || 8.0);
  const [genres, setGenres] = useState((movie.genres || []).join(", "));
  const [synopsis, setSynopsis] = useState(movie.synopsis || "");
  const [posterUrl, setPosterUrl] = useState(movie.posterUrl || "");
  const [backdropUrl, setBackdropUrl] = useState(movie.backdropUrl || "");
  const [trailerVideoId, setTrailerVideoId] = useState(movie.trailerVideoId || "");
  const [cast, setCast] = useState((movie.cast || []).join(", "));
  const [director, setDirector] = useState(movie.director || "");
  const [imdbId, setImdbId] = useState(movie.imdbId || "");
  const [tmdbId, setTmdbId] = useState(movie.tmdbId || "");
  const [featured, setFeatured] = useState(Boolean(movie.featured));

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [autoTrailerLoading, setAutoTrailerLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAutoFetchTrailer = async () => {
    setAutoTrailerLoading(true);
    setStatusMsg(null);
    try {
      const fetchedId = await fetchTrailerFromBackend({
        tmdbId,
        title,
        type,
        year,
      });

      if (fetchedId) {
        setTrailerVideoId(fetchedId);
        setStatusMsg({ text: `Trailer localizado com sucesso: ID ${fetchedId}`, type: "success" });
      } else {
        setStatusMsg({ text: "Não foi possível encontrar um trailer automático no TMDB.", type: "error" });
      }
    } catch (err: any) {
      setStatusMsg({ text: "Erro ao buscar trailer automaticamente.", type: "error" });
    } finally {
      setAutoTrailerLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMsg({ text: "O título é obrigatório.", type: "error" });
      return;
    }

    setSaving(true);
    setStatusMsg(null);

    const cleanTrailerId = extractYouTubeId(trailerVideoId) || trailerVideoId.trim();

    const updatedMovie: Movie = {
      ...movie,
      title: title.trim(),
      originalTitle: originalTitle.trim() || title.trim(),
      type,
      year: Number(year) || 2026,
      duration: duration.trim() || "120 min",
      rating: Number(rating) || 8.0,
      genres: genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      synopsis: synopsis.trim(),
      posterUrl: posterUrl.trim(),
      backdropUrl: backdropUrl.trim() || posterUrl.trim(),
      trailerVideoId: cleanTrailerId,
      cast: cast
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
      director: director.trim(),
      imdbId: imdbId.trim(),
      tmdbId: tmdbId.trim(),
      featured,
    };

    try {
      await saveMovieToFirestore(updatedMovie);
      setStatusMsg({ text: "Título salvo com sucesso!", type: "success" });
      setTimeout(() => {
        if (onSaveSuccess) onSaveSuccess(updatedMovie);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Erro ao salvar filme:", err);
      setStatusMsg({ text: "Erro ao salvar alterações no banco de dados.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMovieFromFirestore(movie.id);
      if (onDeleteSuccess) onDeleteSuccess(movie.id);
      onClose();
    } catch (err) {
      console.error("Erro ao excluir filme:", err);
      setStatusMsg({ text: "Erro ao excluir o título do banco de dados.", type: "error" });
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in" id="edit-movie-modal-backdrop">
      <div className="relative w-full max-w-3xl bg-[#0c0c0c] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-[#121212] px-5 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg shrink-0">
              <Film className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-white font-extrabold text-base sm:text-lg truncate">
                Editar: {movie.title}
              </h2>
              <p className="text-gray-400 text-xs">
                Modo Administrador • Altere dados, imagens e trailers do catálogo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message Alert */}
        {statusMsg && (
          <div
            className={`px-5 py-2.5 text-xs font-bold flex items-center gap-2 shrink-0 ${
              statusMsg.type === "success"
                ? "bg-emerald-950/60 border-b border-emerald-800/60 text-emerald-300"
                : "bg-red-950/60 border-b border-red-800/60 text-red-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin text-xs">
          {/* Row 1: Title & Original Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-bold mb-1">Título PT-BR *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
                placeholder="Ex: Divertida Mente 2"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-bold mb-1">Título Original</label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
                placeholder="Ex: Inside Out 2"
              />
            </div>
          </div>

          {/* Row 2: Type, Year, Duration, Rating */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-gray-300 font-bold mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
              >
                <option value="filme">Filme</option>
                <option value="serie">Série</option>
                <option value="anime">Anime</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 font-bold mb-1">Ano</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-bold mb-1">Duração / Temp.</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
                placeholder="Ex: 120 min ou 2 Temps"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-bold mb-1">Nota (0 - 10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Row 3: Trailer Input with Auto-search Button */}
          <div className="bg-[#141414] border border-gray-800 p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-amber-400 font-extrabold text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Trailer no YouTube (URL ou ID do Vídeo)</span>
              </label>
              <button
                type="button"
                onClick={handleAutoFetchTrailer}
                disabled={autoTrailerLoading}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {autoTrailerLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Buscar Trailer no TMDB</span>
              </button>
            </div>
            <input
              type="text"
              value={trailerVideoId}
              onChange={(e) => setTrailerVideoId(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-800 focus:border-amber-500 focus:outline-none text-white px-3 py-2 rounded-xl text-xs font-mono"
              placeholder="Ex: dQw4w9WgXcQ ou https://www.youtube.com/watch?v=..."
            />
            <p className="text-[10px] text-gray-500">
              Cole o link completo do YouTube ou digite o ID de 11 caracteres. Se vazio, o botão acima busca o trailer oficial no TMDB.
            </p>
          </div>

          {/* Row 4: Genres & Director */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-bold mb-1">Gêneros (separados por vírgula)</label>
              <input
                type="text"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
                placeholder="Ação, Aventura, Animação"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-bold mb-1">Diretor / Criador</label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
                placeholder="Ex: Kelsey Mann"
              />
            </div>
          </div>

          {/* Row 5: Cast */}
          <div>
            <label className="block text-gray-300 font-bold mb-1">Elenco (separados por vírgula)</label>
            <input
              type="text"
              value={cast}
              onChange={(e) => setCast(e.target.value)}
              className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs"
              placeholder="Ex: Amy Poehler, Maya Hawke, Phyllis Smith"
            />
          </div>

          {/* Row 6: Synopsis */}
          <div>
            <label className="block text-gray-300 font-bold mb-1">Sinopse</label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs leading-relaxed"
              placeholder="Digite a sinopse do filme, série ou anime..."
            />
          </div>

          {/* Row 7: Images URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-bold mb-1">URL do Poster (Vertical)</label>
              <input
                type="text"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs font-mono"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-gray-300 font-bold mb-1">URL do Backdrop (Horizontal)</label>
              <input
                type="text"
                value={backdropUrl}
                onChange={(e) => setBackdropUrl(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs font-mono"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Row 8: External IDs & Featured */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <label className="block text-gray-300 font-bold mb-1">TMDB ID</label>
              <input
                type="text"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs font-mono"
                placeholder="Ex: 1022789"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-bold mb-1">IMDb ID</label>
              <input
                type="text"
                value={imdbId}
                onChange={(e) => setImdbId(e.target.value)}
                className="w-full bg-[#161616] border border-gray-800 focus:border-red-600 focus:outline-none text-white px-3 py-2 rounded-xl text-xs font-mono"
                placeholder="Ex: tt1827364"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-white font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#161616] border-gray-800 text-red-600 focus:ring-red-600"
                />
                <span>Destaque no Banner Principal</span>
              </label>
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 bg-red-950/80 border border-red-800 p-2 rounded-xl">
                <span className="text-red-200 font-bold text-xs">Confirmar exclusão?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sim, Excluir"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Título</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
