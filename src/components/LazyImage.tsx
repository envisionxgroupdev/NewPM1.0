import React, { useState, useEffect, useRef } from "react";
import { Film } from "lucide-react";

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
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
  const [inView, setInView] = useState(loading === "eager");
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Monitora se o card/cover entrou perto da viewport
  useEffect(() => {
    if (loading === "eager" || inView) return;

    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      // Fallback caso IntersectionObserver não seja suportado
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
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

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
      {(hasError || !src) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#151515] text-gray-600 z-10 p-2 text-center">
          <Film className={`${getIconSizeClass()} opacity-40 mb-1`} />
          <span className="text-[10px] font-mono opacity-50 line-clamp-1 break-all px-1">
            {alt || "Sem imagem"}
          </span>
        </div>
      )}

      {/* Imagem real carregada apenas quando entra em view (Lazy Loading) */}
      {inView && src && !hasError && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding={decoding}
          // @ts-ignore - atributo fetchpriority experimental de HTML5 / React 19 compatível
          fetchpriority={fetchPriority}
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setIsLoaded(true);
            setHasError(true);
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          } ${className}`}
          {...props}
        />
      )}
    </div>
  );
}
