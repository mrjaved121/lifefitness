import { redirect } from "next/navigation";
import { getCurrentProfile, isSuperAdmin } from "@/lib/auth";
import { Sidebar, type NavSection } from "@/components/Sidebar";
import { GridIcon, UsersIcon, TagIcon, ChartIcon, ShieldIcon, ClipboardListIcon } from "@/components/icons";

const MAIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/members", label: "Members", icon: UsersIcon },
  { href: "/plans", label: "Plans", icon: TagIcon },
  { href: "/reports", label: "Reports", icon: ChartIcon },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const sections: NavSection[] = [{ heading: "Main", links: MAIN_LINKS }];

  if (isSuperAdmin(profile)) {
    sections.push({
      heading: "Management",
      links: [
        { href: "/staff", label: "Staff", icon: ShieldIcon },
        { href: "/audit", label: "Audit Log", icon: ClipboardListIcon },
      ],
    });
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar sections={sections} fullName={profile.full_name || ""} role={profile.role} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
