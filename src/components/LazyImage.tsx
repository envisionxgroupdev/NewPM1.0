import React, { useState, useEffect, useRef } from "react";
import { Film } from "lucide-react";

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
  rootMargin?: string;
  fallbackIconSize?: "sm" | "md" | "lg";
}

/**
 * Componente otimizado de carregamento preguiçoso (Lazy Loading) com IntersectionObserver.
 * Reduz consumo de banda e tempo de carregamento inicial, exibindo skeleton shimmer
 * enquanto a imagem entra na tela ou está carregando, com transição suave.
 */
export default function LazyImage({
  src,
  fallbackSrc,
  alt,
  className = "",
  containerClassName = "",
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
  rootMargin = "250px",
  fallbackIconSize = "md",
  ...props
}: LazyImageProps) {
  const formatUrl = (rawSrc?: string, isPoster: boolean = false) => {
    if (!rawSrc) return undefined;
    let url = rawSrc.trim();
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (!url.startsWith("/")) url = `/${url}`;
    const defaultSize = isPoster ? "w500" : "w1280";
    if (url.startsWith("/t/p/")) return `https://image.tmdb.org${url}`;
    return `https://image.tmdb.org/t/p/${defaultSize}${url}`;
  };

  const [currentSrc, setCurrentSrc] = useState<string | undefined>(() => 
    formatUrl(src) || formatUrl(fallbackSrc) || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80"
  );
  const [inView, setInView] = useState(loading === "eager");
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Monitora se o card/cover entrou perto da viewport
  useEffect(() => {
    if (loading === "eager" || inView) {
      setInView(true);
      return;
    }

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [loading, inView, rootMargin]);

  // Se a URL do src mudar, reseta estado de carregamento/erro
  useEffect(() => {
    const formatted = formatUrl(src) || formatUrl(fallbackSrc) || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80";
    setCurrentSrc(formatted);
    setIsLoaded(false);
    setHasError(false);
    setHasTriedFallback(false);
  }, [src, fallbackSrc]);

  // Verifica se a imagem já está no cache do navegador quando montada ou alterada
  useEffect(() => {
    if (inView && imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
        setHasError(false);
      }
    }
  }, [inView, currentSrc]);

  const handleError = () => {
    if (currentSrc && currentSrc.includes("image.tmdb.org/t/p/w1280")) {
      setCurrentSrc(currentSrc.replace("/w1280/", "/w780/"));
    } else if (currentSrc && currentSrc.includes("image.tmdb.org/t/p/w780")) {
      setCurrentSrc(currentSrc.replace("/w780/", "/w500/"));
    } else if (currentSrc && currentSrc.includes("image.tmdb.org/t/p/w500")) {
      setCurrentSrc(currentSrc.replace("/w500/", "/w342/"));
    } else if (!hasTriedFallback && fallbackSrc) {
      setHasTriedFallback(true);
      const formattedFallback = formatUrl(fallbackSrc);
      if (formattedFallback && formattedFallback !== currentSrc) {
        setCurrentSrc(formattedFallback);
      } else {
        setCurrentSrc("https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80");
      }
    } else if (currentSrc !== "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80") {
      setCurrentSrc("https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&q=80");
    } else {
      setIsLoaded(true);
      setHasError(true);
    }
  };

  const getIconSizeClass = () => {
    switch (fallbackIconSize) {
      case "sm":
        return "w-4 h-4";
      case "lg":
        return "w-10 h-10";
      case "md":
      default:
        return "w-6 h-6";
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#111111] select-none ${containerClassName}`}
    >
      {/* Skeleton Shimmer enquanto não carregou */}
      {(!isLoaded || !inView) && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#111111] via-[#1a1a1a] to-[#111111] animate-pulse z-0" />
      )}

      {/* Ícone de fallback caso não tenha imagem ou ocorra erro de carregamento */}
      {(hasError || !currentSrc) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#151515] text-gray-600 z-10 p-2 text-center">
          <Film className={`${getIconSizeClass()} opacity-40 mb-1`} />
          <span className="text-[10px] font-mono opacity-50 line-clamp-1 break-all px-1">
            {alt || "Sem imagem"}
          </span>
        </div>
      )}

      {/* Imagem real carregada apenas quando entra em view (Lazy Loading) */}
      {inView && currentSrc && !hasError && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          loading={loading}
          decoding={decoding}
          // @ts-ignore - atributo fetchpriority experimental de HTML5 / React 19 compatível
          fetchpriority={fetchPriority}
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
}
