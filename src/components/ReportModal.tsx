import React, { useState, useEffect } from "react";
import { X, Flag, AlertTriangle, CheckCircle2, MessageSquare, Film, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { Movie, User } from "../types";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  movie: Movie | null;
  onNeedAuth?: () => void;
  onReportSubmitted?: () => void;
}

const MOVIE_REPORT_REASONS = [
  "Vídeo ou Player não carrega / tela preta",
  "Áudio ou legenda dessincronizada",
  "Episódio incorreto, faltando ou sem som",
  "Travamentos ou lentidão durante a reprodução",
  "Qualidade de imagem ruim ou formato incorreto",
  "Outro problema neste título"
];

export default function ReportModal({
  isOpen,
  onClose,
  currentUser,
  movie,
  onNeedAuth,
  onReportSubmitted,
}: ReportModalProps) {
  const [movieTitle, setMovieTitle] = useState("");
  const [reason, setReason] = useState(MOVIE_REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (movie) {
      setMovieTitle(movie.title);
    } else {
      setMovieTitle("");
    }
  }, [movie, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onNeedAuth) onNeedAuth();
      return;
    }

    if (!description.trim()) {
      setError("Por favor, descreva o problema encontrado no título.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          movieId: movie?.id || "",
          movieTitle: movieTitle || movie?.title || "Filme / Série Desconhecido",
          reason: `[REPRODUÇÃO/MÍDIA] ${reason}`,
          description,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao enviar denúncia.");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription("");
        onClose();
        if (onReportSubmitted) onReportSubmitted();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Falha ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg sm:max-w-xl bg-[#0f0b0c] border border-red-950/60 rounded-2xl sm:rounded-3xl shadow-2xl z-10 p-5 sm:p-7 max-h-[92vh] overflow-y-auto my-auto"
        id="movie-report-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer p-2 rounded-full hover:bg-gray-900 z-20"
          id="movie-report-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 pr-8">
          <div className="bg-red-600/10 text-red-500 p-3 rounded-2xl border border-red-500/30 shrink-0">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white tracking-tight">
              Reportar Problema no Filme / Série
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Notifique a equipe sobre áudio, vídeo, legenda ou episódios deste título
            </p>
          </div>
        </div>

        {/* Unauthenticated Warning */}
        {!currentUser ? (
          <div className="bg-red-950/20 border border-red-900/40 p-5 rounded-2xl text-center space-y-4">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-red-300">Conta necessária para reportar</h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Para podermos notificar você assim que o problema no vídeo for corrigido, entre na sua conta do PipocaMax.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onNeedAuth) onNeedAuth();
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/30"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar na Minha Conta</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {error && (
              <div className="bg-red-950/40 border border-red-800/60 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Denúncia enviada com sucesso! Analisaremos o título em breve.</span>
              </div>
            )}

            {/* Title / Movie Field */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Título do Filme / Série / Anime
              </label>
              <div className="relative">
                <Film className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                <input
                  type="text"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="Nome do filme ou série"
                  required
                  className="w-full bg-black border border-gray-800 focus:border-red-600 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all"
                />
              </div>
            </div>

            {/* Reason Select */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Defeito na Reprodução
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-black border border-gray-800 focus:border-red-600 focus:outline-none text-white text-sm py-2.5 px-3.5 rounded-xl transition-all cursor-pointer"
              >
                {MOVIE_REPORT_REASONS.map((r) => (
                  <option key={r} value={r} className="bg-[#141414] text-white">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Descrição do Problema
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique o que aconteceu (ex: o vídeo trava aos 10 minutos, o episódio 3 da Temporada 1 está sem áudio, as legendas não aparecem...)"
                  required
                  className="w-full bg-black border border-gray-800 focus:border-red-600 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* User Details Preview */}
            <div className="bg-black/80 border border-gray-800/80 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-gray-400">
              <span>Denunciando como:</span>
              <span className="font-bold text-red-400">{currentUser.name} ({currentUser.email})</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-800 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/30 hover:scale-[1.01] active:scale-[0.99] mt-2"
              id="movie-report-submit-btn"
            >
              {loading ? "Enviando denúncia..." : (
                <>
                  <Flag className="w-4 h-4 fill-white" />
                  <span>Enviar Denúncia do Filme</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
