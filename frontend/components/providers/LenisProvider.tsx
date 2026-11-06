"use client";

import React, { useEffect, useRef } from "react";
import Lenis from "lenis";

interface LenisProviderProps {
  children: React.ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Initialize Lenis for ultra-smooth inertia scrolling
    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 2.0,
      prevent: (node: HTMLElement) => {
        // Crucial: Allow inner dashboard overflow-y-auto containers to scroll naturally with the wheel
        if (!node) return false;
        return (
          node.classList?.contains("overflow-y-auto") ||
          node.classList?.contains("overflow-auto") ||
          node.closest?.(".overflow-y-auto") !== null ||
          node.closest?.("[data-lenis-prevent]") !== null ||
          node.tagName === "TEXTAREA" ||
          node.tagName === "INPUT"
        );
      },
    });

    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
