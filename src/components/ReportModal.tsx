import React, { useState } from "react";
import { X, Flag, AlertTriangle, CheckCircle2, MessageSquare, LogIn, Sparkles, Send, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { Movie, User } from "../types";
import LazyImage from "./LazyImage";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  movie: Movie | null;
  onNeedAuth?: () => void;
  onReportSubmitted?: () => void;
}

const MOVIE_REPORT_REASONS = [
  "Vídeo / Player não carrega (Tela Preta)",
  "Áudio ou legenda dessincronizada",
  "Episódio incorreto ou sem som",
  "Travamentos / Lentidão constante",
  "Qualidade ruim ou formato errado",
  "Outro problema na reprodução"
];

export default function ReportModal({
  isOpen,
  onClose,
  currentUser,
  movie,
  onNeedAuth,
  onReportSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState(MOVIE_REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onNeedAuth) onNeedAuth();
      return;
    }

    if (!description.trim()) {
      setError("Por favor, descreva em poucas palavras o problema encontrado.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": currentUser.email || ""
        },
        body: JSON.stringify({
          userId: currentUser.id || "user_anon",
          userName: currentUser.name || "Usuário",
          userEmail: currentUser.email || "usuario@pipocamax.com",
          movieId: movie?.id || "",
          movieTitle: movie?.title || "Filme / Série Desconhecido",
          reason: `[REPRODUÇÃO/MÍDIA] ${reason}`,
          description: description.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || "Erro ao enviar denúncia.");
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription("");
        onClose();
        if (onReportSubmitted) onReportSubmitted();
      }, 5000);
    } catch (err: any) {
      setError(err.message && err.message !== "Load failed" ? err.message : "Falha ao enviar denúncia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-gradient-to-b from-[#140b0d] via-[#0d090a] to-[#080607] border border-red-900/40 rounded-3xl shadow-[0_0_50px_rgba(225,29,72,0.15)] z-10 p-4 sm:p-5 max-h-[90vh] overflow-y-auto my-auto text-left"
        id="movie-report-modal"
      >
        {/* Glow Top Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-80" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-gray-400 hover:text-white transition-all cursor-pointer p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 z-20"
          id="movie-report-modal-close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 mb-4 pr-6">
          <div className="bg-gradient-to-br from-red-600/20 to-red-950/40 text-red-500 p-2.5 rounded-xl border border-red-500/30 shrink-0 shadow-lg shadow-red-950/40">
            <Flag className="w-5 h-5 fill-red-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-950/60 border border-red-800/40 px-2 py-0.5 rounded-full">
                Suporte de Reprodução
              </span>
            </div>
            <h2 className="font-display font-extrabold text-base sm:text-lg text-white tracking-tight mt-0.5">
              Reportar Defeito no Filme / Série
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              Nosso time analisa cada alerta para corrigir o vídeo rapidamente.
            </p>
          </div>
        </div>

        {/* Target Movie Card Preview if available */}
        {movie && (
          <div className="mb-3.5 p-2.5 rounded-xl bg-black/60 border border-red-950/50 flex items-center gap-3">
            <div className="w-10 h-12 rounded-lg border border-red-900/30 shrink-0 overflow-hidden">
              <LazyImage 
                src={movie.backdropUrl || movie.posterUrl}
                fallbackSrc={movie.posterUrl || movie.backdropUrl} 
                alt={movie.title}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover" 
                fallbackIconSize="sm"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider block">
                {movie.type === "serie" ? "Série" : movie.type === "anime" ? "Anime" : "Filme"}
              </span>
              <h4 className="font-extrabold text-xs text-white truncate">{movie.title}</h4>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                {movie.year} • {movie.genres} • HD
              </p>
            </div>
          </div>
        )}

        {/* Unauthenticated Warning */}
        {!currentUser ? (
          <div className="bg-red-950/30 border border-red-900/50 p-5 rounded-2xl text-center space-y-3 shadow-xl">
            <ShieldAlert className="w-8 h-8 text-red-500 mx-auto animate-pulse" />
            <div>
              <h3 className="text-xs font-bold text-red-200">Faça login para acompanhar o status</h3>
              <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed max-w-xs mx-auto">
                Para enviarmos notificações quando for corrigido, entre na sua conta PipocaMax.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onNeedAuth) onNeedAuth();
              }}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/30 hover:scale-[1.02]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar na Minha Conta</span>
            </button>
          </div>
        ) : success ? (
          <div className="bg-emerald-950/40 border border-emerald-800/80 p-5 sm:p-6 rounded-2xl text-center space-y-4 shadow-2xl animate-fade-in">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-emerald-200">Denúncia Enviada com Sucesso!</h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-sm mx-auto">
                Nossa equipe técnica já recebeu seu alerta e analisará o problema. Você receberá uma notificação assim que o erro for corrigido.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setDescription("");
                onClose();
                if (onReportSubmitted) onReportSubmitted();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-950/80 hover:scale-[1.02]"
            >
              Entendi / Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="bg-red-950/60 border border-red-800/80 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Reason Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                Qual o tipo de erro? *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {MOVIE_REPORT_REASONS.map((r) => {
                  const isSelected = reason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`text-left p-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                        isSelected
                          ? "bg-red-950/80 border-red-600 text-white shadow-md shadow-red-950/50"
                          : "bg-black/40 border-gray-800/80 text-gray-300 hover:border-gray-700 hover:text-white"
                      }`}
                    >
                      <span className="truncate">{r}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Detalhes Adicionais *
                </label>
                <span className="text-[9px] text-gray-500 font-mono">
                  {description.length}/500
                </span>
              </div>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                <textarea
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: O áudio está sem sincronia nos 15 minutos finais..."
                  required
                  className="w-full bg-black/80 border border-gray-800 focus:border-red-600 focus:outline-none text-white text-xs py-2 pl-9 pr-3 rounded-xl transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* User Details Footer */}
            <div className="bg-black/60 border border-gray-900 p-2.5 rounded-xl flex items-center justify-between gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-red-500" />
                Enviando como:
              </span>
              <span className="font-bold text-red-400 truncate max-w-[180px]">{currentUser.name}</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-800 disabled:to-gray-900 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-red-600/30 hover:scale-[1.01] active:scale-[0.99] mt-1"
              id="movie-report-submit-btn"
            >
              {loading ? (
                <span>Enviando relatório...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Denúncia de Reprodução</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
