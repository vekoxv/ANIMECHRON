import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell relative grid min-h-dvh place-items-center overflow-hidden pt-(--nav-h) text-center">
      <div aria-hidden="true" className="speedlines absolute inset-0 text-bone/[0.06]" />
      <div className="relative">
        <p aria-hidden="true" lang="ja" className="t-jp text-red">
          頁がありません
        </p>
        <h1 className="t-display mt-3 text-[clamp(5rem,22vw,18rem)]">404</h1>
        <p className="t-serif mx-auto mt-2 max-w-md text-mute">This page is not in the archive. The address may be mistyped, or the title is not one of the twenty.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/archive" className="btn btn-solid">
            Browse the archive
          </Link>
          <Link href="/" className="btn">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
