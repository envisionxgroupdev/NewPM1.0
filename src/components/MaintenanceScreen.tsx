import { useState } from "react";
import { Wrench, Clock, RefreshCw, Lock, Film, Send } from "lucide-react";
import { motion } from "motion/react";

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedReturn?: string;
  onAdminLogin: () => void;
  onRefreshStatus?: () => void;
}

export default function MaintenanceScreen({
  title = "Estamos em Manutenção ⚙️",
  message = "O PipocaMax está passando por melhorias rápidas no sistema para melhorar sua experiência. Voltaremos em breve!",
  estimatedReturn = "Em breve",
  onAdminLogin,
  onRefreshStatus
}: MaintenanceScreenProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    if (onRefreshStatus) {
      onRefreshStatus();
    }
    setTimeout(() => {
      setRefreshing(false);
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#08080c] text-white flex flex-col justify-between items-center p-6 relative overflow-hidden font-sans selection:bg-brand-primary selection:text-white">
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Logo */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-red-600/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            PIPOCA<span className="text-brand-primary">MAX</span>
          </span>
        </div>

        <button
          onClick={onAdminLogin}
          className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-[#121216] hover:bg-[#1a1a22] border border-gray-800 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Área Restrita</span>
        </button>
      </header>

      {/* Centered Main Maintenance Card */}
      <main className="relative z-10 my-auto w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#0e0e14] border border-gray-800/80 rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden"
        >
          {/* Animated Icon Circle */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-lg shadow-amber-500/5">
            <Wrench className="w-10 h-10 animate-pulse" />
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-extrabold uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Sistema em Manutenção</span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            {title}
          </h1>

          {/* Message */}
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-normal mb-6">
            {message}
          </p>

          {/* Estimated Time Chip */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#15151c] border border-gray-800 text-xs text-gray-300 mb-8 font-medium">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Previsão de retorno: <strong className="text-white font-bold">{estimatedReturn}</strong></span>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:flex-1 bg-brand-primary hover:bg-red-600 disabled:bg-gray-800 text-white font-extrabold text-sm py-3.5 px-5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Verificar Novamente</span>
            </button>

            <a
              href="https://t.me/pipocamax"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-[#181822] hover:bg-[#222230] border border-gray-800 text-sky-400 font-extrabold text-sm py-3.5 px-5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Telegram</span>
            </a>
          </div>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="relative z-10 text-center text-xs text-gray-500 pb-2">
        <p>© {new Date().getFullYear()} PipocaMax Streaming • Todos os direitos reservados</p>
      </footer>
    </div>
  );
}


