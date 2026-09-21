import { logout } from "@/lib/actions/auth";
import { BarbellIcon } from "@/components/BarbellIcon";
import { buttonVariants } from "@/components/buttonStyles";
import { GYM_NAME } from "@/lib/brand";

// Shown instead of the app to anyone who has signed up but hasn't been given a
// role yet. The database already hides all data from them; this just explains
// why the app would otherwise look empty.
export function PendingApproval({ fullName }: { fullName: string | null }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8 text-center">
        <BarbellIcon className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold text-heading">Waiting for approval</h1>
        <p className="text-sm text-body">
          {fullName ? `Hi ${fullName}, your` : "Your"} account has been created, but someone at {GYM_NAME} still needs
          to approve it before you can use the app. Once they have, reload this page.
        </p>
        <form action={logout}>
          <button type="submit" className={`${buttonVariants.secondary} w-full`}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
