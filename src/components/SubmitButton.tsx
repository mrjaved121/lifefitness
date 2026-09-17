"use client";

import { useFormStatus } from "react-dom";
import { buttonVariants, type ButtonVariant } from "./buttonStyles";

export function SubmitButton({
  children,
  pendingText = "Saving...",
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${buttonVariants[variant]} ${className}`}>
      {pending ? pendingText : children}
    </button>
  );
}
