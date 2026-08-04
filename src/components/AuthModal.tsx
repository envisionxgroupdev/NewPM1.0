import React, { useState } from "react";
import { X, Mail, Lock, User, LogIn, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("pipocamax_saved_email") || "";
  });
  const [password, setPassword] = useState(() => {
    return localStorage.getItem("pipocamax_saved_password") || "";
  });
  const [rememberCredentials, setRememberCredentials] = useState(() => {
    return localStorage.getItem("pipocamax_remember") === "true";
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin 
      ? { email: email.trim(), password: password.trim() }
      : { name: name.trim(), email: email.trim(), password: password.trim(), role: "user" };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch (e) {
        data = {};
      }

      if (!response.ok || data.banned || response.status === 403) {
        if (
          response.status === 403 ||
          data.banned ||
          data.error === "Conta Bloqueada" ||
          (data.error && String(data.error).toLowerCase().includes("bloquead"))
        ) {
          throw new Error("Conta Bloqueada: Seu acesso foi bloqueado ou banido por um administrador do sistema PipocaMax.");
        }
        const errMsg = data.error || "Algo deu errado ao autenticar.";
        const details = data.details ? ` (${data.details})` : "";
        throw new Error(`${errMsg}${details}`);
      }

      if (isLogin) {
        if (rememberCredentials) {
          localStorage.setItem("pipocamax_remember", "true");
          localStorage.setItem("pipocamax_saved_email", email.trim());
          localStorage.setItem("pipocamax_saved_password", password.trim());
        } else {
          localStorage.removeItem("pipocamax_remember");
          localStorage.removeItem("pipocamax_saved_email");
          localStorage.removeItem("pipocamax_saved_password");
        }

        setSuccess("Login realizado com sucesso! Redirecionando...");
        setTimeout(() => {
          onAuthSuccess(data.user);
          onClose();
        }, 1000);
      } else {
        setSuccess("Conta criada com sucesso! Agora você já pode entrar.");
        setIsLogin(true);
        if (!rememberCredentials) {
          setPassword("");
        }
      }
    } catch (err: any) {
      let rawMsg = err?.message || "";
      if (
        !rawMsg ||
        rawMsg.toLowerCase().includes("pattern") ||
        rawMsg.toLowerCase().includes("failed to execute") ||
        rawMsg.toLowerCase().includes("domexception") ||
        rawMsg.toLowerCase().includes("unexpected token")
      ) {
        rawMsg = "Erro de autenticação. Por favor, verifique se suas credenciais estão corretas ou se a conta está ativa.";
      }
      setError(rawMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setIsLogin(true);
    setError("");
    setSuccess("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-md bg-[#0f0f0f] border border-gray-900 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 md:p-8"
        id="auth-modal-box"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-gray-900"
          id="auth-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <span className="font-display font-extrabold text-2xl text-white tracking-tight">
            Pipoca<span className="text-brand-primary">Max</span>
          </span>
          <h2 className="text-sm text-gray-400 mt-1 font-medium">
            {isLogin ? "Entre na sua conta para salvar favoritos" : "Crie uma nova conta grátis"}
          </h2>
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 p-3.5 rounded-xl text-xs flex items-start gap-3 border ${
                error.toLowerCase().includes("bloquead")
                  ? "bg-red-950/60 border-red-700/80 text-red-300 shadow-lg shadow-red-950/40"
                  : "bg-red-950/30 border-red-900/40 text-red-400"
              }`}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">
                  {error.toLowerCase().includes("bloquead") || error.toLowerCase().includes("banid")
                    ? "Conta Bloqueada no Sistema"
                    : "Erro de Autenticação"}
                </p>
                <p className="text-xs text-red-300/90 leading-relaxed">
                  {error.replace(/^Conta Bloqueada:\s*/i, "").replace(/\(Seu acesso foi bloqueado[^\)]*\)/i, "").trim()}
                </p>
                {(error.toLowerCase().includes("bloquead") || error.toLowerCase().includes("banid")) && (
                  <p className="text-[11px] text-gray-400 pt-1 border-t border-red-900/40 mt-1.5">
                    Se você acredita que isso foi um engano, entre em contato com o suporte da plataforma PipocaMax.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 p-3 rounded-xl text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sucesso!</p>
                <p className="opacity-90 mt-0.5">{success}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Endereço de E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                required
                className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Sua Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                className="w-full bg-black border border-gray-900 focus:border-red-600 focus:outline-none text-white text-sm py-2.5 pl-11 pr-4 rounded-xl transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={rememberCredentials} 
                onChange={(e) => setRememberCredentials(e.target.checked)}
                className="rounded border-gray-950 bg-black text-red-600 focus:ring-red-600 cursor-pointer w-4 h-4 accent-red-600"
              />
              <span>Salvar login e senha</span>
            </label>
          </div>

          {/* Action Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/10 hover:scale-101"
            id="auth-submit-btn"
          >
            {loading ? "Processando..." : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Entrar no PipocaMax</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Criar Conta</span>
              </>
            )}
          </button>
        </form>

        {/* Auth Toggle */}
        <div className="mt-5 text-center space-y-3">
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setSuccess("");
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors underline decoration-dotted cursor-pointer"
          >
            {isLogin ? "Não tem uma conta? Cadastre-se grátis" : "Já possui conta? Faça login aqui"}
          </button>

          {/* Quick Admin Test Login Shortcuts */}
          <div className="pt-3 border-t border-gray-900/80">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
              Acesso Rápido de Teste (1-Clique)
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@pipocamax.com", "admin")}
                className="text-[11px] font-bold text-gray-300 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                🔑 Admin PipocaMax
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
