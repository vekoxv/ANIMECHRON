"use client";

import Image from "next/image";
import { useState, ViewTransition } from "react";
import type { ReactNode } from "react";

interface ArtProps {
  src: string | null;
  alt: string;
  /** Rendered width hint so the optimiser serves the right size. */
  sizes: string;
  /** Above-the-fold artwork: preload it and skip the fade-in. */
  preload?: boolean;
  className?: string;
  imgClassName?: string;
  position?: string;
  /** Slug of the title this artwork stands for: lets it expand into the same title's art on the next page. */
  share?: string;
  /** The destination side of that morph (the detail header), which keeps its transition name at all times. */
  anchor?: boolean;
}

/** Artwork frame: shimmer in the title's own colour until the image arrives, then a soft reveal. */
export function Art({ src, alt, sizes, preload = false, className = "", imgClassName = "", position = "center", share, anchor = false }: ArtProps) {
  const [loaded, setLoaded] = useState(preload);
  const [failed, setFailed] = useState(false);
  return (
    <div className={`art ${className}`} data-pending={src && !loaded && !failed ? "" : undefined} data-art={share} style={share && anchor ? { viewTransitionName: `art-${share}` } : undefined}>
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload}
          data-loaded={loaded}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`object-cover ${imgClassName}`}
          style={{ objectPosition: position }}
        />
      ) : (
        <div role="img" aria-label={`${alt} (image unavailable)`} className="tone absolute inset-0 text-accent/40" />
      )}
    </div>
  );
}

/** Wraps a route's content so navigations wipe in like a turned manga page. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      {children}
    </ViewTransition>
  );
}
