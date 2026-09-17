import { redirect } from "next/navigation";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/members", label: "Members" },
  { href: "/plans", label: "Plans" },
  { href: "/reports", label: "Reports" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const navLinks = isSuperAdmin(profile)
    ? [...NAV_LINKS, { href: "/staff", label: "Staff" }, { href: "/audit", label: "Audit Log" }]
    : NAV_LINKS;

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar navLinks={navLinks} fullName={profile.full_name || ""} role={profile.role} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
