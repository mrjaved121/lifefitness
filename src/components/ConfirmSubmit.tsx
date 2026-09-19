"use client";

import { useRef } from "react";
import { buttonVariants } from "./buttonStyles";

// Drop-in replacement for a submit button that asks first. Must be rendered
// inside a <form>: the dialog lives inside it, so its confirm button submits
// that form. Uses the native <dialog> so focus trapping, Escape-to-cancel and
// focus restoration come from the browser.
export function ConfirmSubmit({
  confirmText,
  className = buttonVariants.destructiveText,
  children,
}: {
  confirmText: string;
  className?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" className={className} onClick={() => dialogRef.current?.showModal()}>
        {children}
      </button>
      {/* No display utilities on <dialog> itself: it must stay hidden until opened.
          m-auto is needed because Tailwind's reset removes the browser's centering margin. */}
      <dialog
        ref={dialogRef}
        // Only a click on the backdrop targets the dialog element itself
        // (its content sits in the padded inner div), so this doesn't fire on inner clicks.
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-surface p-0 text-left backdrop:bg-heading/40"
      >
        <div className="p-6">
          <h2 className="text-base font-semibold text-heading">Please confirm</h2>
          <p className="mt-2 text-sm text-body">{confirmText}</p>
          <p className="mt-1 text-xs text-muted">This action cannot be undone.</p>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className={buttonVariants.secondary} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={buttonVariants.destructive} onClick={close}>
              {children}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
