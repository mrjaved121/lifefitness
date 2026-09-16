"use client";

export function ConfirmSubmit({
  confirmText,
  className = "text-sm font-medium text-red-600 hover:text-red-800",
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
