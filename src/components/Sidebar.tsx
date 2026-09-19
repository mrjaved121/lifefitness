"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { BarbellIcon } from "@/components/BarbellIcon";
import { GridIcon, UsersIcon, TagIcon, ChartIcon, ShieldIcon, ClipboardListIcon, LogoutIcon } from "@/components/icons";
import { Avatar } from "@/components/Avatar";

// Server Components can't pass component/function references as props to a
// Client Component (RSC only serializes plain data across that boundary), so
// the parent layout sends a string key and this file - already a client
// component free to import whatever it likes - resolves it to the real icon.
const ICONS = {
  dashboard: GridIcon,
  members: UsersIcon,
  plans: TagIcon,
  reports: ChartIcon,
  staff: ShieldIcon,
  audit: ClipboardListIcon,
} as const;

export type IconKey = keyof typeof ICONS;
export type NavLink = { href: string; label: string; icon: IconKey };
export type NavSection = { heading: string; links: NavLink[] };

export function Sidebar({
  sections,
  fullName,
  role,
}: {
  sections: NavSection[];
  fullName: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  // The four everyday destinations live in the first section; anything else
  // (Staff, Audit Log, Sign out) is reached through "More", which opens the drawer.
  const primaryLinks = sections[0]?.links.slice(0, 4) ?? [];

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <BarbellIcon className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-heading">GymDesk</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-body hover:bg-app-bg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      {open && <div className="fixed inset-0 z-40 bg-heading/30 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform md:static md:z-auto md:w-60 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <BarbellIcon className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold text-heading">GymDesk</span>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
          {sections.map((section) => (
            <div key={section.heading}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
                {section.heading}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.links.map((link) => {
                  const active = isActive(link.href);
                  const Icon = ICONS[link.icon];
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-body hover:bg-app-bg hover:text-heading"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar name={fullName || "Staff"} className="h-8 w-8 shrink-0 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-heading">{fullName || "Staff"}</p>
              <p className="truncate text-xs capitalize text-muted">{role.replace("_", " ")}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-body hover:bg-app-bg hover:text-heading"
            >
              <LogoutIcon className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-flow-col auto-cols-fr border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primaryLinks.map((link) => {
          const active = isActive(link.href);
          const Icon = ICONS[link.icon];
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted hover:text-heading"
              }`}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted transition-colors hover:text-heading"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
          More
        </button>
      </nav>
    </>
  );
}
