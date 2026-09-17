import { BarbellIcon } from "./BarbellIcon";

export function GymHero() {
  return (
    <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-gray-900 p-12 text-white md:flex">
      <svg className="absolute -left-16 -top-16 h-64 w-64 text-white/5" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="50" />
      </svg>
      <svg className="absolute -bottom-24 -right-14 h-96 w-96 text-white/5" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="50" />
      </svg>

      <div className="relative flex flex-col items-center text-center">
        <BarbellIcon className="h-16 w-16" />
        <h2 className="mt-6 text-2xl font-semibold">GymDesk</h2>
        <p className="mt-2 max-w-xs text-sm text-gray-300">
          Membership, billing, and front desk — all in one place.
        </p>
      </div>
    </div>
  );
}
