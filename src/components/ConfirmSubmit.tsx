"use client";

import { buttonVariants } from "./buttonStyles";

export function ConfirmSubmit({
  confirmText,
  className = buttonVariants.destructiveText,
  children,
}: {
  confirmText: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
