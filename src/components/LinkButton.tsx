import Link from "next/link";
import { buttonVariants, type ButtonVariant } from "./buttonStyles";

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${buttonVariants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
