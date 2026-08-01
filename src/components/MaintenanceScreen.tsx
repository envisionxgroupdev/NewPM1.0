import { useState } from "react";
import { Wrench, Clock, RefreshCw, Lock, Film, Server } from "lucide-react";
import { motion } from "motion/react";

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedReturn?: string;
  onAdminLogin: () => void;
  onRefreshStatus?: () => void;
}

export default function MaintenanceScreen({
  title = "Estamos em Manutenção Programada ⚙️",
  message = "Estamos realizando atualizações e melhorias gerais em nossos servidores e catálogo de mídia para oferecer uma reprodução muito mais estável e veloz. Voltaremos em breve!",
  estimatedReturn = "Em breve (Algumas horas)",
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
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-brand-primary selection:text-white">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-gray-900/80">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-red-600/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              PIPOCA<span className="text-brand-primary">MAX</span>
            </span>
            <span className="block text-[9px] font-mono tracking-widest text-amber-500 font-bold uppercase">
              SYSTEM MAINTENANCE
            </span>
          </div>
        </div>

        <button
          onClick={onAdminLogin}
          className="flex items-center gap-2 text-xs font-extrabold text-gray-300 hover:text-white bg-[#141414] hover:bg-[#1f1f1f] border border-gray-800 hover:border-gray-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Acesso Administrativo</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 my-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full bg-[#0c0c0c] border border-gray-800/90 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Corner Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold tracking-wide uppercase mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Manutenção em Andamento • Serviços Temporariamente Offline</span>
          </div>

          {/* Icon & Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="p-4 rounded-2xl bg-[#181510] border border-amber-900/50 text-amber-400 shrink-0">
              <Wrench className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">
                {title}
              </h1>
              <p className="text-xs font-mono text-gray-500 mt-1">
                PipocaMax Streaming Platform • Manutenção de Servidores v2.0
              </p>
            </div>
          </div>

          {/* Message Content */}
          <div className="bg-black/60 border border-gray-900 p-5 rounded-2xl mb-8">
            <p className="text-sm text-gray-300 leading-relaxed font-normal">
              {message}
            </p>
          </div>

          {/* Info Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#141414]/80 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Previsão de Retorno
                </span>
                <span className="text-sm font-extrabold text-white">
                  {estimatedReturn}
                </span>
              </div>
            </div>

            <div className="bg-[#141414]/80 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Segurança dos Dados
                </span>
                <span className="text-sm font-extrabold text-emerald-400">
                  100% Protegidos & Salvos
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-gray-900/80">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto flex-1 bg-brand-primary hover:bg-brand-secondary disabled:bg-gray-800 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/20 hover:scale-101 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Verificar Novamente</span>
            </button>

            <button
              type="button"
              onClick={onAdminLogin}
              className="w-full sm:w-auto bg-[#1a1a1a] hover:bg-[#252525] border border-gray-800 text-gray-300 hover:text-white font-bold text-xs px-6 py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Login de Administrador</span>
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-gray-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <p>© {new Date().getFullYear()} PipocaMax Streaming. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-amber-400/80 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Engenharia de Infraestrutura em Execução
          </span>
        </div>
      </footer>
    </div>
  );
}
