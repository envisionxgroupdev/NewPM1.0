import { X, Megaphone, ExternalLink, BellRing, CheckCircle2 } from "lucide-react";
import { PopupBannerConfig } from "../types";

interface PopupNoticeModalProps {
  config: PopupBannerConfig;
  onClose: () => void;
  isPreview?: boolean;
}

export default function PopupNoticeModal({ config, onClose, isPreview = false }: PopupNoticeModalProps) {
  if (!config) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      {/* Background Overlay Click to Close */}
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={onClose} 
      />

      {/* Main Full-Screen Center Card */}
      <div className="relative w-full max-w-2xl bg-[#0e0e11] border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden text-white flex flex-col my-auto max-h-[90vh] transition-all transform scale-100 z-10">
        
        {/* Top Floating Close Button (X) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black/70 hover:bg-amber-500 hover:text-black text-gray-300 p-2.5 rounded-full transition-all cursor-pointer border border-gray-800 shadow-lg flex items-center justify-center group"
          title="Fechar aviso"
        >
          <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
        </button>

        {/* Optional Banner Image or Gradient Top Banner */}
        {config.imageUrl ? (
          <div className="relative w-full max-h-64 sm:max-h-80 overflow-hidden bg-black shrink-0">
            <img
              src={config.imageUrl}
              alt={config.title || "Aviso"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image fails to load, hide image tag
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] via-transparent to-black/40" />
            
            {config.badgeText && (
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-amber-500 text-black text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 animate-bounce" />
                  {config.badgeText}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative bg-gradient-to-r from-amber-600/30 via-amber-500/20 to-red-600/30 p-6 sm:p-8 border-b border-amber-500/20 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 shadow-inner">
                <Megaphone className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md inline-block mb-1">
                  {config.badgeText || "COMUNICADO IMPORTANTE"}
                </span>
                <p className="text-xs text-gray-300 font-sans">
                  Aviso do Administrador • PipocaMax
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Scrollable Body Content */}
        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto font-sans leading-relaxed">
          {/* Badge (if image is present) */}
          {config.imageUrl && config.badgeText && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5" />
              {config.badgeText}
            </span>
          )}

          {/* Title */}
          {config.title && (
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              {config.title}
            </h2>
          )}

          {/* Text Message */}
          {config.message && (
            <div className="text-sm sm:text-base text-gray-200/90 whitespace-pre-line space-y-2 leading-relaxed bg-[#141418] border border-gray-800/80 p-4 sm:p-5 rounded-2xl">
              {config.message}
            </div>
          )}

          {/* Preview Tag Banner (if in Admin Preview Mode) */}
          {isPreview && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-center text-amber-400 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Modo de Pré-visualização do Administrador</span>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="p-6 sm:p-8 bg-[#121216] border-t border-gray-800/80 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          {/* Action Link Button (if set) */}
          {config.buttonText && config.buttonUrl && (
            <a
              href={config.buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (!isPreview) onClose();
              }}
              className="w-full sm:flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3.5 px-6 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] cursor-pointer"
            >
              <span>{config.buttonText}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className={`w-full ${
              config.buttonText && config.buttonUrl ? "sm:w-auto" : "sm:flex-1"
            } bg-[#202026] hover:bg-[#2b2b33] border border-gray-700 text-gray-200 hover:text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer`}
          >
            <X className="w-4 h-4 text-gray-400" />
            <span>Fechar Aviso</span>
          </button>
        </div>

      </div>
    </div>
  );
}
