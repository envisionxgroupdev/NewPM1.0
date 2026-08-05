import { useEffect, useRef } from "react";
import { AdSlotConfig } from "../types";
import { Megaphone } from "lucide-react";

interface AdBannerProps {
  ad: AdSlotConfig | undefined;
  className?: string;
  slotName?: string;
}

export default function AdBanner({ ad, className = "", slotName }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ad || !ad.enabled || ad.type !== "code" || !ad.code) return;
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    try {
      // createContextualFragment executes embedded <script> tags safely in the browser DOM
      const fragment = document.createRange().createContextualFragment(ad.code);
      containerRef.current.appendChild(fragment);
    } catch (err) {
      console.warn("Erro ao injetar script do anúncio:", err);
    }
  }, [ad?.enabled, ad?.type, ad?.code]);

  if (!ad || !ad.enabled) {
    return null;
  }

  // Banner mode with Image + Link
  if (ad.type === "banner") {
    if (!ad.imageUrl && !ad.linkUrl) return null;

    return (
      <div className={`w-full flex flex-col items-center justify-center my-4 ${className}`}>
        <div className="relative group max-w-full overflow-hidden rounded-xl bg-black/60 border border-gray-800 shadow-lg">
          <div className="absolute top-1 right-1 z-10 bg-black/80 backdrop-blur-md text-gray-400 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded tracking-wider border border-gray-800 flex items-center gap-1">
            <Megaphone className="w-2.5 h-2.5 text-amber-500" />
            <span>{slotName || "Anúncio"}</span>
          </div>

          <a
            href={ad.linkUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-transform duration-300 group-hover:scale-[1.01]"
          >
            <img
              src={ad.imageUrl}
              alt={ad.altText || "Anúncio Patrocinado"}
              className="max-w-full h-auto max-h-[160px] object-contain rounded-xl"
              loading="lazy"
              onError={(e) => {
                // Hide container if image fails to load
                (e.currentTarget.parentElement?.parentElement as HTMLElement)?.classList.add("hidden");
              }}
            />
          </a>
        </div>
      </div>
    );
  }

  // Code/Script Mode
  if (ad.type === "code" && ad.code) {
    return (
      <div className={`w-full flex flex-col items-center justify-center my-4 min-h-[50px] ${className}`}>
        <div className="relative w-full flex justify-center items-center overflow-hidden rounded-xl bg-black/40 border border-gray-900/60 p-2 text-center">
          <div className="absolute top-1 right-1 z-10 bg-black/80 backdrop-blur-md text-gray-400 text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border border-gray-800 pointer-events-none">
            {slotName || "Anúncio"}
          </div>
          <div ref={containerRef} className="w-full flex justify-center items-center max-w-full overflow-x-auto" />
        </div>
      </div>
    );
  }

  return null;
}
