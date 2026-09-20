"use client";

import { buttonVariants } from "./buttonStyles";

export function PrintButton({ children = "Print" }: { children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${buttonVariants.primary} print:hidden`}>
      {children}
    </button>
  );
}
