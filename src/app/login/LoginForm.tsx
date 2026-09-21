"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type ActionState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionState = { error: null };
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-heading focus:border-primary focus:outline-none";

export function LoginForm({ registered }: { registered: boolean }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8">
      <div>
        <h1 className="text-2xl font-bold text-heading">Welcome back</h1>
        <p className="mt-1 text-sm text-body">Sign in to your account</p>
      </div>

      {registered && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Account created. Confirm your email if asked, then sign in. Someone has to approve your account before you can
          use the app.
        </p>
      )}
      {state.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-body">
          Email
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-body">
          Password
        </label>
        <input id="password" name="password" type="password" required className={inputClass} />
      </div>

      <SubmitButton className="w-full" pendingText="Signing in...">
        Sign In
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:text-primary-hover">
          Sign up
        </Link>
      </p>
    </form>
  );
}
