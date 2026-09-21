import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner, isSuperAdmin } from "@/lib/auth";
import { Sidebar, type NavSection } from "@/components/Sidebar";
import { FlashToast } from "@/components/FlashToast";
import { PendingApproval } from "@/components/PendingApproval";

// The phone's bottom bar shows only the first four of these (the rest sit
// behind "More"), so the front desk's daily jobs - members and check-in - come
// before Plans, which is set up once and rarely touched.
const MAIN_LINKS: NavSection["links"] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/members", label: "Members", icon: "members" },
  { href: "/checkin", label: "Check-in", icon: "checkin" },
  { href: "/reports", label: "Reports", icon: "reports" },
  { href: "/plans", label: "Plans", icon: "plans" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role === "pending") return <PendingApproval fullName={profile.full_name} />;

  // Expenses are owner-only, so only owners get the link.
  const mainLinks = isOwner(profile)
    ? [...MAIN_LINKS, { href: "/expenses", label: "Expenses", icon: "expenses" as const }]
    : MAIN_LINKS;
  const sections: NavSection[] = [{ heading: "Main", links: mainLinks }];

  if (isSuperAdmin(profile)) {
    sections.push({
      heading: "Management",
      links: [
        { href: "/staff", label: "Staff", icon: "staff" },
        { href: "/audit", label: "Audit Log", icon: "audit" },
      ],
    });
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar sections={sections} fullName={profile.full_name || ""} role={profile.role} />
      <main className="flex-1 p-4 pb-24 md:p-8 print:p-0">{children}</main>
      <FlashToast />
    </div>
  );
}
