"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import { BarbellIcon } from "@/components/BarbellIcon";

type NavLink = { href: string; label: string };

export function Sidebar({
  navLinks,
  fullName,
  role,
}: {
  navLinks: NavLink[];
  fullName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <BarbellIcon className="h-5 w-5 text-gray-900" />
          <span className="text-lg font-semibold text-gray-900">GymDesk</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white transition-transform md:static md:z-auto md:w-56 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
          <BarbellIcon className="h-5 w-5 text-gray-900" />
          <span className="text-lg font-semibold text-gray-900">GymDesk</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <p className="truncate px-3 text-sm font-medium text-gray-900">{fullName || "Staff"}</p>
          <p className="px-3 text-xs capitalize text-gray-500">{role.replace("_", " ")}</p>
          <form action={logout}>
            <button type="submit" className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
