import React, { useState } from "react";
import { X, Bug, AlertTriangle, CheckCircle2, MessageSquare, Globe, LogIn, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { User } from "../types";

interface ReportWebsiteBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onNeedAuth?: () => void;
  onReportSubmitted?: () => void;
}

const WEBSITE_BUG_REASONS = [
  "Bug no Filtro de Busca / Categorias",
  "Erro na Barra de Pesquisa",
  "Falha ao Salvar em Favoritos / Minha Lista",
  "Problema de Layout / Responsividade (TV, Celular, PC)",
  "Erro ao Fazer Login ou Cadastrar",
  "Problema de Carregamento de Páginas",
  "Outro Bug no Site"
];

const AFFECTED_PAGES = [
  "Filtros de Categorias (Filmes, Séries, Animes)",
  "Barra de Pesquisa de Títulos",
  "Navegação do Header / Menus",
  "Página de Perfil / Favoritos",
  "Carregamento do Site no Celular / Tablet",
  "Exibição em Smart TV / Telas Grandes",
  "Geral / Todo o Site"
];

export default function ReportWebsiteBugModal({
  isOpen,
  onClose,
  currentUser,
  onNeedAuth,
  onReportSubmitted,
}: ReportWebsiteBugModalProps) {
  const [affectedArea, setAffectedArea] = useState(AFFECTED_PAGES[0]);
  const [reason, setReason] = useState(WEBSITE_BUG_REASONS[0]);
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
      setError("Por favor, descreva o bug encontrado no site.");
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
          movieId: "",
          movieTitle: `Site: ${affectedArea}`,
          reason: `[BUG NO SITE] ${reason}`,
          description,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao enviar relatório de bug.");
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
        className="relative w-full max-w-lg sm:max-w-xl bg-[#0e0d0a] border border-amber-900/40 rounded-2xl sm:rounded-3xl shadow-2xl z-10 p-5 sm:p-7 max-h-[92vh] overflow-y-auto my-auto"
        id="website-bug-modal"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer p-2 rounded-full hover:bg-gray-900 z-20"
          id="website-bug-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 pr-8">
          <div className="bg-amber-500/10 text-amber-400 p-3 rounded-2xl border border-amber-500/30 shrink-0">
            <Bug className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-extrabold text-lg sm:text-xl text-white tracking-tight">
              Reportar Bug no Site / Filtros
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Informe erros no filtro, busca, layout ou sistema do PipocaMax
            </p>
          </div>
        </div>

        {/* Unauthenticated Warning */}
        {!currentUser ? (
          <div className="bg-amber-950/20 border border-amber-900/40 p-5 rounded-2xl text-center space-y-4">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-amber-300">Conta necessária para reportar</h3>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                Para podermos avisar você quando o bug for corrigido, faça login na sua conta do PipocaMax.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onNeedAuth) onNeedAuth();
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
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
                <span>Relatório de bug enviado! Avisaremos assim que for corrigido.</span>
              </div>
            )}

            {/* Affected Area Select */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Onde o bug acontece?
              </label>
              <div className="relative">
                <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                <select
                  value={affectedArea}
                  onChange={(e) => setAffectedArea(e.target.value)}
                  className="w-full bg-black border border-gray-800 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all cursor-pointer"
                >
                  {AFFECTED_PAGES.map((area) => (
                    <option key={area} value={area} className="bg-[#141414] text-white">
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reason Select */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Tipo do Defeito no Site
              </label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-black border border-gray-800 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all cursor-pointer"
                >
                  {WEBSITE_BUG_REASONS.map((r) => (
                    <option key={r} value={r} className="bg-[#141414] text-white">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
                Descrição Detalhada do Bug
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique detalhadamente o que ocorreu no site (ex: ao clicar no filtro 'Ação' no celular, os resultados não carregam ou o menu fecha sozinho...)"
                  required
                  className="w-full bg-black border border-gray-800 focus:border-amber-500 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* User Details Preview */}
            <div className="bg-black/80 border border-gray-800/80 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-gray-400">
              <span>Relatando bug como:</span>
              <span className="font-bold text-amber-400">{currentUser.name} ({currentUser.email})</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 text-black font-extrabold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] mt-2"
              id="website-bug-submit-btn"
            >
              {loading ? "Enviando relatório..." : (
                <>
                  <Bug className="w-4 h-4 fill-black" />
                  <span>Enviar Relatório do Bug do Site</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
