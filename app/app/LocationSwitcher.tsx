"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Location } from "@prisma/client";

import { setActiveLocation } from "./locationActions";

interface Props {
  locations: Location[];
  activeLocationId: string | null;
}

export default function LocationSwitcher({ locations, activeLocationId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLocation = useMemo(
    () => locations.find((location) => location.id === activeLocationId) ?? locations[0],
    [locations, activeLocationId],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (locationId: string) => {
    startTransition(async () => {
      await setActiveLocation(locationId);
      router.refresh();
    });
    setIsOpen(false);
  };

  if (locations.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
        No locations available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/15"
      >
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.2em] text-indigo-200">Location</span>
          <span className="text-sm text-white">
            {activeLocation?.name ?? "Select a location"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            {pathname}
          </span>
        </div>
        <svg
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[105%] z-20 rounded-xl border border-white/10 bg-slate-900/90 shadow-xl shadow-indigo-500/10 backdrop-blur">
          <ul className="max-h-64 overflow-y-auto py-2 text-sm text-slate-200">
            {locations.map((location) => (
              <li key={location.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(location.id)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left transition hover:bg-white/5 ${
                    activeLocation?.id === location.id ? "bg-white/10 text-white" : ""
                  }`}
                  disabled={isPending}
                >
                  <span>{location.name ?? "Untitled location"}</span>
                  {activeLocation?.id === location.id ? (
                    <span className="text-xs uppercase tracking-[0.15em] text-emerald-300">Current</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
