"use client";

import { Menu, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark, Wordmark } from "@/components/ui/Bits";
import { ui, useClientValue, useStore, watchlist } from "@/lib/store";

export const NAV_LINKS = [
  { href: "/archive", label: "Archive", jp: "書庫" },
  { href: "/universe", label: "Universe", jp: "群像" },
  { href: "/intel", label: "Intelligence", jp: "評価" },
  { href: "/lab", label: "Lab", jp: "比較" },
  { href: "/dojo", label: "Dojo", jp: "道場" },
  { href: "/watchlist", label: "Watchlist", jp: "鑑賞録" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const saved = Object.keys(useStore(watchlist)).length;
  const isMac = useClientValue(() => /Mac|iPhone|iPad/.test(navigator.userAgent), false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      style={{ viewTransitionName: "site-nav" }}
      className={`fixed inset-x-0 top-0 z-50 h-(--nav-h) border-b transition-colors duration-300 ${solid ? "border-rule bg-ink/95" : "border-transparent"}`}
    >
      <div className="shell flex h-full items-center gap-4">
        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5" aria-label="Animéchron — home">
          <Mark />
          <Wordmark className="text-[1.6rem]" />
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden items-center lg:flex">
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`t-label relative px-3.5 py-3 transition-colors hover:text-bone ${active ? "text-bone" : "text-bone/60"}`}>
                {l.label}
                {l.href === "/watchlist" && saved > 0 && <span className="ml-1.5 text-violet">{saved}</span>}
                {active && <motion.span layoutId="nav-thread" className="absolute inset-x-3.5 bottom-1 h-px bg-red" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => ui.set((s) => ({ ...s, palette: true }))}
          className="t-label ml-auto flex min-h-10 items-center gap-2.5 border border-rule px-3 text-bone/70 transition-colors hover:border-mute hover:text-bone lg:ml-3"
          aria-label="Search titles, characters and commands"
        >
          <Search size={15} />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden border-l border-rule pl-2.5 font-sans text-bone/50 sm:inline">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>

        <button type="button" className="grid size-10 place-items-center border border-rule lg:hidden" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Primary"
            className="fixed inset-x-0 bottom-0 top-(--nav-h) overflow-y-auto bg-ink lg:hidden"
            initial={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
            animate={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}
            exit={{ clipPath: "polygon(0 0, 100% 0, 100% 0, 0 0)" }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          >
            <ul className="shell flex flex-col py-6">
              {NAV_LINKS.map((l, i) => (
                <motion.li key={l.href} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="border-b border-rule">
                  <Link href={l.href} onClick={() => setOpen(false)} aria-current={pathname.startsWith(l.href) ? "page" : undefined} className="flex items-baseline justify-between py-4">
                    <span className={`t-display text-5xl ${pathname.startsWith(l.href) ? "text-red" : ""}`}>{l.label}</span>
                    <span lang="ja" aria-hidden="true" className="t-jp text-mute">
                      {l.jp}
                      {l.href === "/watchlist" && saved > 0 && <span className="ml-2 font-sans text-violet">{saved}</span>}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
