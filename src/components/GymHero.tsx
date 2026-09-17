import { BarbellIcon } from "./BarbellIcon";
import { UsersIcon, WalletIcon, BellIcon, KettlebellIcon } from "./icons";

const FEATURES = [
  { icon: UsersIcon, label: "Manage members, plans & renewals" },
  { icon: WalletIcon, label: "Track payments & revenue" },
  { icon: BellIcon, label: "One-click WhatsApp & email reminders" },
];

export function GymHero() {
  return (
    <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gray-900 p-12 text-white md:flex">
      <svg className="absolute -left-16 -top-16 h-64 w-64 text-white/5" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="50" />
      </svg>
      <svg className="absolute -bottom-24 -right-14 h-96 w-96 text-white/5" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="50" />
      </svg>
      <KettlebellIcon className="absolute right-12 top-16 h-20 w-20 text-white/10" />
      <BarbellIcon className="absolute -left-2 bottom-20 h-16 w-16 -rotate-12 text-white/10" />

      <div className="relative flex w-full max-w-xs flex-col items-center text-center">
        <BarbellIcon className="h-16 w-16" />
        <h1 className="mt-6 text-3xl font-semibold">GymDesk</h1>
        <p className="mt-2 text-sm text-gray-300">
          Membership, billing, and front desk — all in one place.
        </p>

        <div className="mt-10 w-full space-y-4 text-left">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm text-gray-200">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
