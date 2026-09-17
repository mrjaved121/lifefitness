import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/members", label: "Members" },
  { href: "/plans", label: "Plans" },
  { href: "/reports", label: "Reports" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const navLinks = isSuperAdmin(profile) ? [...NAV_LINKS, { href: "/staff", label: "Staff" }] : NAV_LINKS;

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <span className="text-lg font-semibold text-gray-900">GymDesk</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3">
          <p className="truncate px-3 text-sm font-medium text-gray-900">{profile.full_name || "Staff"}</p>
          <p className="px-3 text-xs capitalize text-gray-500">{profile.role.replace("_", " ")}</p>
          <form action={logout}>
            <button type="submit" className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
