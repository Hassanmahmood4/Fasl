"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { label: "The problem", href: "#problem" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Model performance", href: "#performance" },
];

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wheat";

export function HeroNav({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const MenuIcon = open ? X : Menu;

  return (
    // Starts hidden so it can't flash before the curtain takes control of it.
    <div
      id={id}
      className="page-width absolute inset-x-0 top-4 z-20 motion-safe:opacity-0 sm:top-6"
    >
      <nav aria-label="Main" className="relative">
        <div className="flex items-center justify-between gap-3 rounded-full bg-black py-1.5 pr-2 pl-5 text-white">
          <a
            href="#top"
            aria-label="Fasl, back to top"
            className={`flex items-baseline gap-2 rounded-full text-wheat ${FOCUS}`}
          >
            <span lang="ur" dir="rtl" className="font-urdu text-xl leading-[1.9]">
              فصل
            </span>
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`rounded text-caption font-semibold transition-colors hover:text-wheat ${FOCUS}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`rounded-full bg-wheat px-4 py-2 text-caption font-bold whitespace-nowrap text-black transition-colors hover:bg-white sm:px-5 ${FOCUS}`}
            >
              Scan your crop
            </Link>
            <button
              ref={toggle}
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="hero-menu"
              onClick={() => setOpen((current) => !current)}
              className={`grid size-10 place-items-center rounded-full transition-colors hover:text-wheat md:hidden ${FOCUS}`}
            >
              <MenuIcon aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        {open && (
          <ul
            id="hero-menu"
            className="absolute inset-x-0 top-full mt-2 space-y-1 rounded-3xl bg-black p-3 text-white md:hidden"
          >
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-2xl px-4 py-3 font-semibold transition-colors hover:bg-white/10 hover:text-wheat ${FOCUS}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
}
