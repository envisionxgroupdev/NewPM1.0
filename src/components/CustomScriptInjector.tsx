import { useEffect } from "react";
import { CustomCodesConfig } from "../types";

interface CustomScriptInjectorProps {
  customCodes?: CustomCodesConfig;
  popunderAd?: { enabled: boolean; code: string };
}

export default function CustomScriptInjector({ customCodes, popunderAd }: CustomScriptInjectorProps) {
  // 1. Inject Header Code into <head>
  useEffect(() => {
    if (!customCodes?.headerCode) return;

    // Clean up previous header injections
    const existingInjections = document.querySelectorAll("[data-pipoca-custom='header']");
    existingInjections.forEach((el) => el.remove());

    try {
      const fragment = document.createRange().createContextualFragment(customCodes.headerCode);
      const children = Array.from(fragment.childNodes);

      children.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          (child as HTMLElement).setAttribute("data-pipoca-custom", "header");
          document.head.appendChild(child);
        } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
          const scriptEl = document.createElement("script");
          scriptEl.setAttribute("data-pipoca-custom", "header");
          scriptEl.textContent = child.textContent;
          document.head.appendChild(scriptEl);
        }
      });
    } catch (err) {
      console.warn("Erro ao injetar código do cabeçalho:", err);
    }

    return () => {
      const currentInjections = document.querySelectorAll("[data-pipoca-custom='header']");
      currentInjections.forEach((el) => el.remove());
    };
  }, [customCodes?.headerCode]);

  // 2. Inject Footer Code into <body>
  useEffect(() => {
    if (!customCodes?.footerCode) return;

    // Clean up previous footer injections
    const existingInjections = document.querySelectorAll("[data-pipoca-custom='footer']");
    existingInjections.forEach((el) => el.remove());

    try {
      const fragment = document.createRange().createContextualFragment(customCodes.footerCode);
      const children = Array.from(fragment.childNodes);

      children.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          (child as HTMLElement).setAttribute("data-pipoca-custom", "footer");
          document.body.appendChild(child);
        } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
          const scriptEl = document.createElement("script");
          scriptEl.setAttribute("data-pipoca-custom", "footer");
          scriptEl.textContent = child.textContent;
          document.body.appendChild(scriptEl);
        }
      });
    } catch (err) {
      console.warn("Erro ao injetar código do rodapé:", err);
    }

    return () => {
      const currentInjections = document.querySelectorAll("[data-pipoca-custom='footer']");
      currentInjections.forEach((el) => el.remove());
    };
  }, [customCodes?.footerCode]);

  // 3. Inject Popunder Code if active
  useEffect(() => {
    if (!popunderAd?.enabled || !popunderAd.code) return;

    const existingPopunder = document.querySelectorAll("[data-pipoca-custom='popunder']");
    existingPopunder.forEach((el) => el.remove());

    try {
      const fragment = document.createRange().createContextualFragment(popunderAd.code);
      const children = Array.from(fragment.childNodes);

      children.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          (child as HTMLElement).setAttribute("data-pipoca-custom", "popunder");
          document.body.appendChild(child);
        }
      });
    } catch (err) {
      console.warn("Erro ao injetar código de popunder:", err);
    }

    return () => {
      const currentPopunder = document.querySelectorAll("[data-pipoca-custom='popunder']");
      currentPopunder.forEach((el) => el.remove());
    };
  }, [popunderAd?.enabled, popunderAd?.code]);

  return null;
}
