"use client";

import Link from "next/link";

/** Route-level error boundary: says what happened and offers the two ways out. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="shell grid min-h-dvh place-items-center pt-(--nav-h) text-center">
      <div>
        <h1 className="t-display text-[clamp(3rem,10vw,8rem)]">This page tore</h1>
        <p className="t-serif mx-auto mt-3 max-w-md text-mute">
          Something failed while drawing this page. Your watchlist and settings are untouched.
          {error.digest ? ` Reference: ${error.digest}.` : ""}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-solid">
            Try again
          </button>
          <Link href="/" className="btn">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
