"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoofTrussBlueprint } from "@/components/landing/roof-truss-blueprint";
import { OBRAS_DATA, ObraCategory, Obra } from "@/lib/obras-data";
import { cn } from "@/lib/utils";

const CATEGORIES: ("Todas" | ObraCategory)[] = [
  "Todas",
  "Dos Aguas",
  "Un Agua",
  "Reticulado",
  "Galpones",
  "Taller",
];

export function ObrasSection({ onGoEditor }: { onGoEditor: () => void }) {
  const [activeCategory, setActiveCategory] = useState<"Todas" | ObraCategory>("Todas");
  
  // Filter works based on active category
  const filteredObras = OBRAS_DATA.filter((obra) => 
    activeCategory === "Todas" || obra.category === activeCategory
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" }, [
    Autoplay({ delay: 4000, stopOnInteraction: true }),
  ]);

  // Re-initialize carousel when data changes
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi, filteredObras]);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    document.body.style.overflow = 'auto';
  };

  const nextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredObras.length);
    }
  }, [lightboxIndex, filteredObras.length]);

  const prevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredObras.length) % filteredObras.length);
    }
  }, [lightboxIndex, filteredObras.length]);

  // Add keyboard support for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") setLightboxIndex((prev) => prev !== null ? (prev + 1) % filteredObras.length : null);
      if (e.key === "ArrowLeft") setLightboxIndex((prev) => prev !== null ? (prev - 1 + filteredObras.length) % filteredObras.length : null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, filteredObras.length]);


  return (
    <section id="obras" className="relative border-y border-border bg-card/30 py-20 lg:py-28 overflow-hidden">
      {/* Triangular Truss Technical Blueprint Background */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <RoofTrussBlueprint />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end mb-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#F97316]">
              Galería & Fabricación
            </span>
            <h2 className="mt-3 text-balance font-display text-4xl font-700 uppercase text-foreground sm:text-5xl">
              Nuestros Trabajos y Proceso
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Explorá nuestra galería de tinglados y galpones fabricados e instalados a medida.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-all border whitespace-nowrap",
                activeCategory === cat
                  ? "bg-[#F97316] border-[#F97316] text-white"
                  : "bg-background/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Carousel */}
        {filteredObras.length > 0 ? (
          <div className="relative w-full">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex touch-pan-y flex-row items-center cursor-grab active:cursor-grabbing -ml-4">
                {filteredObras.map((obra, idx) => (
                  <div key={obra.id} className="min-w-0 shrink-0 grow-0 pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                    <div 
                      className="group cursor-pointer relative flex h-80 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-[#F97316]/50"
                      onClick={() => openLightbox(idx)}
                    >
                      <div className="absolute inset-0 z-0">
                        <Image
                          src={obra.src}
                          alt={obra.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          quality={80}
                          className="pointer-events-none object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>
                      <div className="relative z-10 p-4">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md inline-block shadow-sm">
                          {obra.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-card/20">
            <p className="font-mono text-sm uppercase text-muted-foreground">
              Próximamente imágenes en esta categoría
            </p>
          </div>
        )}

        <div className="mt-12 flex items-center justify-center">
          <Button onClick={onGoEditor} size="lg" className="gap-2 font-mono text-xs uppercase tracking-wider bg-[#F97316] hover:bg-[#EA580C] text-white">
            Diseñá el tuyo ahora
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md"
          onClick={closeLightbox}
        >
          <div className="absolute top-6 right-6 z-10">
            <button 
              onClick={closeLightbox}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="size-6" />
            </button>
          </div>

          <button 
            onClick={prevImage}
            className="absolute left-4 sm:left-10 z-10 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <ChevronLeft className="size-8" />
          </button>
          
          <button 
            onClick={nextImage}
            className="absolute right-4 sm:right-10 z-10 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
          >
            <ChevronRight className="size-8" />
          </button>

          <div className="relative w-full max-w-5xl h-[80vh] px-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={filteredObras[lightboxIndex].src}
              alt={filteredObras[lightboxIndex].title}
              fill
              className="object-contain"
              sizes="100vw"
              quality={100}
              priority
            />
          </div>
          
          <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
            <p className="text-white font-mono text-sm uppercase tracking-widest bg-black/50 inline-block px-4 py-2 rounded-full">
              {lightboxIndex + 1} / {filteredObras.length} — {filteredObras[lightboxIndex].title}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
