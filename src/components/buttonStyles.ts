export const buttonVariants = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-heading transition-colors hover:bg-app-bg disabled:opacity-50",
  tertiary:
    "inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover disabled:opacity-50",
  destructive:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50",
  destructiveText:
    "inline-flex items-center gap-1 text-sm font-medium text-danger transition-colors hover:text-red-700 disabled:opacity-50",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
