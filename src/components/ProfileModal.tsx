import React, { useState, useEffect } from "react";
import { X, User, Mail, Edit2, Bookmark, Flag, CheckCircle2, Clock, AlertCircle, LogIn, Heart, Bug } from "lucide-react";
import { motion } from "motion/react";
import { Movie } from "../types";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUserUpdated: (updatedUser: any) => void;
  onLogout: () => void;
  favoriteMovies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onOpenReportModal?: () => void;
  onOpenWebsiteBugModal?: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onLogout,
  favoriteMovies,
  onMovieClick,
  onOpenReportModal,
  onOpenWebsiteBugModal,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "reports" | "favorites">("profile");
  const [name, setName] = useState(currentUser?.name || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  const [userReports, setUserReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
    }
  }, [currentUser]);

  // Fetch reports submitted by this user
  useEffect(() => {
    if (isOpen && currentUser && currentUser.email) {
      fetchUserReports();
    }
  }, [isOpen, currentUser]);

  const fetchUserReports = async () => {
    if (!currentUser?.email) return;
    setLoadingReports(true);
    try {
      const response = await fetch(`/api/reports/my?email=${encodeURIComponent(currentUser.email)}`);
      if (response.ok) {
        const data = await response.json();
        setUserReports(data.reports || []);
      }
    } catch (err) {
      console.warn("Erro ao carregar relatórios do usuário:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSavingName(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar perfil.");
      }

      setSaveSuccess("Nome de perfil atualizado com sucesso!");
      setIsEditingName(false);
      onUserUpdated(data.user);

      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Erro de conexão ao salvar.");
    } finally {
      setSavingName(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Resolvido") {
      return (
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-3 h-3" />
          Resolvido
        </span>
      );
    }
    if (status === "Em Análise") {
      return (
        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" />
          Em Análise
        </span>
      );
    }
    return (
      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
        <AlertCircle className="w-3 h-3" />
        Pendente
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" 
        onClick={onClose}
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl bg-[#0f0f0f] border border-gray-900 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
        id="profile-modal-box"
      >
        {/* Header Bar */}
        <div className="relative bg-gradient-to-r from-red-950/40 via-black to-black p-6 border-b border-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar Circle */}
            <div className="w-14 h-14 rounded-2xl bg-brand-primary text-white font-display font-black text-2xl flex items-center justify-center shadow-lg shadow-red-600/30 border border-red-500/40 uppercase shrink-0">
              {currentUser.name ? currentUser.name.charAt(0) : "U"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-extrabold text-lg md:text-xl text-white">
                  {currentUser.name}
                </h2>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  currentUser.role === "admin" 
                    ? "bg-red-600 text-white shadow-sm shadow-red-600/30" 
                    : "bg-gray-800 text-gray-300 border border-gray-700"
                }`}>
                  {currentUser.role === "admin" ? "Administrador" : "Membro PipocaMax"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-500" />
                <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-gray-900"
            id="profile-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-900 bg-black/40 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "profile"
                ? "border-red-600 text-red-500"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Perfil & Conta</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "reports"
                ? "border-red-600 text-red-500"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>Minhas Denúncias ({userReports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "favorites"
                ? "border-red-600 text-red-500"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Minha Lista ({favoriteMovies.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {saveSuccess && (
            <div className="bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="bg-red-950/30 border border-red-900/40 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* TAB 1: Profile Details */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfile} className="bg-black/60 border border-gray-900 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-900/80 pb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-primary" />
                    Informações Pessoais
                  </h3>
                  {!isEditingName && (
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Nome</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-gray-500 font-semibold uppercase block mb-1">Nome Completo</label>
                    {isEditingName ? (
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-black border border-red-600 focus:outline-none text-white text-xs p-2 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-200 font-semibold text-sm bg-black p-2 rounded-lg border border-gray-900">
                        {currentUser.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-gray-500 font-semibold uppercase block mb-1">Endereço de E-mail</label>
                    <p className="text-gray-400 font-mono text-xs bg-black p-2 rounded-lg border border-gray-900 opacity-80">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                {isEditingName && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={savingName}
                      className="bg-brand-primary hover:bg-brand-secondary text-white font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      {savingName ? "Salvando..." : "Salvar Alterações"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false);
                        setName(currentUser.name);
                      }}
                      className="bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </form>

              {/* Quick Actions */}
              <div className="pt-2">
                <button
                  onClick={onLogout}
                  className="w-full p-4 bg-black/60 hover:bg-red-950/30 border border-gray-900 hover:border-red-900/60 rounded-2xl transition-all cursor-pointer text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-900 text-red-400 rounded-xl group-hover:scale-110 transition-transform">
                      <LogIn className="w-5 h-5 rotate-180" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-red-400">Sair da Conta</h4>
                      <p className="text-[10px] text-gray-500">Encerrar sessão no PipocaMax</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: User Reports */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Flag className="w-4 h-4 text-brand-primary" />
                  Histórico de Denúncias e Relatórios
                </h3>
                <div className="flex items-center gap-2">
                  {onOpenWebsiteBugModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenWebsiteBugModal();
                      }}
                      className="text-xs font-bold text-amber-400 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Bug className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bug no Site</span>
                    </button>
                  )}
                  {onOpenReportModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenReportModal();
                      }}
                      className="text-xs font-bold text-white bg-brand-primary hover:bg-brand-secondary px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Problema no Filme</span>
                    </button>
                  )}
                </div>
              </div>

              {loadingReports ? (
                <div className="p-8 text-center text-xs text-gray-500">Carregando suas denúncias...</div>
              ) : userReports.length > 0 ? (
                <div className="space-y-3">
                  {userReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-black/80 border border-gray-900 rounded-2xl p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-extrabold text-white block">
                            {report.movieTitle || "Denúncia Geral"}
                          </span>
                          <span className="text-[11px] font-semibold text-red-400 block mt-0.5">
                            Motivo: {report.reason}
                          </span>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>

                      <p className="text-xs text-gray-300 bg-[#0a0a0a] p-3 rounded-xl border border-gray-900 leading-relaxed">
                        {report.description}
                      </p>

                      <div className="text-[10px] text-gray-500 flex items-center justify-between pt-1">
                        <span>
                          Enviado em: {new Date(report.createdAt).toLocaleDateString("pt-BR")} às {new Date(report.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="font-mono text-gray-600">ID: #{report.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-black/40 border border-gray-900 rounded-2xl space-y-3">
                  <Flag className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400">Você ainda não enviou nenhuma denúncia de erro.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Favorites List */}
          {activeTab === "favorites" && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-brand-primary" />
                Seus Títulos Salvos
              </h3>

              {favoriteMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {favoriteMovies.map((movie) => (
                    <div
                      key={movie.id}
                      onClick={() => {
                        onClose();
                        onMovieClick(movie);
                      }}
                      className="bg-black border border-gray-900 rounded-xl overflow-hidden cursor-pointer group hover:border-red-600 transition-all flex flex-col"
                    >
                      <div className="aspect-[2/3] relative overflow-hidden bg-gray-950">
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-red-500 transition-colors">
                          {movie.title}
                        </h4>
                        <span className="text-[10px] text-gray-500 capitalize">
                          {movie.type} • {movie.year}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-black/40 border border-gray-900 rounded-2xl space-y-3">
                  <Heart className="w-8 h-8 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400">Sua lista de favoritos está vazia.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
