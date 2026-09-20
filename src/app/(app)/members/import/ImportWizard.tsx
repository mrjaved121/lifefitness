"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmImport, parseImportFile, type ConfirmState, type ParseState } from "@/lib/actions/import";
import { SubmitButton } from "@/components/SubmitButton";
import { buttonVariants } from "@/components/buttonStyles";
import { formatCurrency, formatDate } from "@/lib/format";

const parseInitialState: ParseState = { rows: [], fileError: null };
const confirmInitialState: ConfirmState = { error: null };

export function ImportWizard({ planNames }: { planNames: string[] }) {
  const [parseState, parseAction] = useActionState(parseImportFile, parseInitialState);
  const [confirmState, confirmActionState] = useActionState(confirmImport, confirmInitialState);

  if (parseState.rows.length === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-heading">1. Get the template</h2>
          <p className="mt-1 text-sm text-body">
            Download the template, fill in one row per member, then upload it below. Full name and Plan are required.
          </p>
          {planNames.length > 0 && (
            <p className="mt-2 text-xs text-muted">Valid plans: {planNames.join(", ")}</p>
          )}
          <a href="/api/import/template" className={`${buttonVariants.secondary} mt-3`}>
            Download template
          </a>
        </div>

        <form action={parseAction} className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-heading">2. Upload your file</h2>
          {parseState.fileError && (
            <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{parseState.fileError}</p>
          )}
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,.csv"
            required
            className="mt-3 block w-full text-sm text-body file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-hover"
          />
          <SubmitButton pendingText="Reading file..." className="mt-4">
            Upload and preview
          </SubmitButton>
        </form>
      </div>
    );
  }

  const readyRows = parseState.rows.filter((r) => r.errors.length === 0);
  const errorRows = parseState.rows.filter((r) => r.errors.length > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-heading">Preview</h2>
            <p className="mt-1 text-sm text-body">
              {readyRows.length} ready to import
              {errorRows.length > 0 ? `, ${errorRows.length} need fixing (won't be imported)` : ""}.
            </p>
          </div>
          <Link href="/members/import" className={buttonVariants.secondary}>
            Start over
          </Link>
        </div>

        {confirmState.error && (
          <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{confirmState.error}</p>
        )}

        <div className="mt-4 max-h-[28rem] overflow-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-xs font-medium text-muted">
                <th className="py-2 pr-3">Row</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Start date</th>
                <th className="px-3 py-2 text-right">Amount paid</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parseState.rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td className="py-2.5 pr-3 text-muted">{row.rowNumber}</td>
                  <td className="px-3 py-2.5 text-heading">{row.full_name || "—"}</td>
                  <td className="px-3 py-2.5 text-body">{row.planName || "—"}</td>
                  <td className="px-3 py-2.5 text-body">{formatDate(row.start_date)}</td>
                  <td className="px-3 py-2.5 text-right text-body">{formatCurrency(row.amount_paid)}</td>
                  <td className="px-3 py-2.5">
                    {row.errors.length === 0 ? (
                      <span className="text-success">Ready</span>
                    ) : (
                      <span className="text-danger">{row.errors.join("; ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {readyRows.length === 0 ? (
        <button type="button" disabled className={`${buttonVariants.primary} opacity-50`}>
          Nothing to import
        </button>
      ) : (
        <form action={confirmActionState}>
          <input type="hidden" name="rows" value={JSON.stringify(readyRows)} />
          <SubmitButton pendingText="Importing...">
            Import {readyRows.length} member{readyRows.length === 1 ? "" : "s"}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
